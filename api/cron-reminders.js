const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// We initialize using the Environment Variable containing the Service Account JSON
// This keeps credentials secure on Vercel
let app;
if (!app) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({ credential: cert(serviceAccount) });
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Make sure it is set in Vercel settings.", err);
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  // Optional security: Only allow Vercel Cron to trigger this
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  const now = Timestamp.now();
  console.log(`[cron] Running reminder check at ${new Date().toISOString()}`);

  try {
    // 1. Fetch overdue tasks that haven't had reminders sent
    const snapshot = await db.collection("tasks")
      .where("reminderTime", "<=", now)
      .where("reminderSent", "==", false)
      .where("isCompleted", "==", false)
      .limit(100) // Vercel hobby limits function execution to 10s, keep batch small
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ status: "success", message: "No reminders due." });
    }

    // 2. Group by user
    const tasksByUser = {};
    snapshot.docs.forEach((doc) => {
      const task = { id: doc.id, ...doc.data() };
      
      // Skip if snoozed
      if (task.snoozedUntil && task.snoozedUntil.toMillis() > now.toMillis()) return;

      if (!tasksByUser[task.userId]) tasksByUser[task.userId] = [];
      tasksByUser[task.userId].push(task);
    });

    const messaging = getMessaging();
    const batch = db.batch();
    const processedIds = [];

    // 3. Process each user's notifications
    for (const [userId, tasks] of Object.entries(tasksByUser)) {
      // Get the user's FCM tokens
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

        // Mark task as reminderSent so we don't spam them
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
