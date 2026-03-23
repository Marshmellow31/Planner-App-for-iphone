const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// We initialize inside the handler so it doesn't crash on cold start 
// if environment variables are momentarily unavailable.
let db;
let messaging;

module.exports = async function handler(req, res) {
  // Set CORS headers so it can be called safely by an external cron
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Optional security: Only allow cron-job.org or Vercel to trigger this
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized access: Invalid or missing CRON_SECRET token." });
  }

  try {
    // 0. Initialize Firebase (Ensure it runs correctly in Vercel's Node environment)
    if (!getApps().length) {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ error: "Missing FIREBASE_SERVICE_ACCOUNT in Vercel env." });
      }
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({ credential: cert(serviceAccount) });
      } catch (e) {
        return res.status(500).json({ error: "Failed to parse FIREBASE_SERVICE_ACCOUNT JSON." });
      }
    }

    if (!db) db = getFirestore();
    if (!messaging) messaging = getMessaging();

    const now = Timestamp.now();
    console.log(`[cron] Running reminder check at ${new Date().toISOString()}`);

    // 1. Fetch overdue tasks that haven't had reminders sent
    const snapshot = await db.collection("tasks")
      .where("reminderTime", "<=", now)
      .where("reminderSent", "==", false)
      .where("isCompleted", "==", false)
      .limit(100)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ status: "success", message: "No reminders due right now." });
    }

    // 2. Group by user
    const tasksByUser = {};
    snapshot.docs.forEach((doc) => {
      const task = { id: doc.id, ...doc.data() };
      if (task.snoozedUntil && task.snoozedUntil.toMillis() > now.toMillis()) return;

      if (!tasksByUser[task.userId]) tasksByUser[task.userId] = [];
      tasksByUser[task.userId].push(task);
    });

    const batch = db.batch();
    const processedIds = [];

    // 3. Process each user's notifications
    for (const [userId, tasks] of Object.entries(tasksByUser)) {
      const tokenSnap = await db.collection("users").doc(userId).collection("fcmTokens").get();
      const tokens = tokenSnap.docs.map(d => d.data().token).filter(Boolean);

      for (const task of tasks) {
        if (tokens.length > 0) {
          const dueStr = task.dueDate 
            ? new Date(task.dueDate.toMillis()).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "soon";

          const message = {
            notification: {
              title: "⏰ Task Reminder: StudyFlow",
              body: `"${task.title}" is due ${dueStr}`,
            },
            data: { taskId: task.id, type: "reminder" },
            tokens,
          };

          try {
            const response = await messaging.sendEachForMulticast(message);
            console.log(`[cron] Sent ${response.successCount} messages for task ${task.id}`);
          } catch (e) {
            console.error(`[cron] Error sending FCM for task ${task.id}:`, e);
          }
        }

        const taskRef = db.collection("tasks").doc(task.id);
        batch.update(taskRef, { reminderSent: true });
        processedIds.push(task.id);
      }
    }

    // 4. Commit database updates
    if (processedIds.length > 0) {
      await batch.commit();
    }

    return res.status(200).json({ status: "success", processedCount: processedIds.length });

  } catch (err) {
    console.error("[cron] Vercel function error:", err);
    return res.status(500).json({ status: "error", error: err.message });
  }
}
