// ============================================================
// functions/index.js — Firebase Cloud Functions
// ============================================================
//
// REQUIRES: Firebase Blaze plan (pay-as-you-go)
// REQUIREMENT: A Cloud Tasks queue named "reminders" must exist.
//
// Deploy with:
//   firebase deploy --only functions
//
// ============================================================

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { CloudTasksClient } = require("@google-cloud/tasks");

initializeApp();
const db = getFirestore();

/**
 * Helper to schedule a Cloud Task for a reminder
 */
async function scheduleNotification(taskData, taskId) {
  const project = process.env.GCLOUD_PROJECT || "student-planner-95ed4";
  const location = "us-central1"; // Adjust if your functions are in a different region
  const queue = "reminders";
  const url = `https://${location}-${project}.cloudfunctions.net/sendScheduledNotification`;

  const client = new CloudTasksClient();
  const parent = client.queuePath(project, location, queue);

  // Use snoozedUntil if present, otherwise reminderTime
  const targetTime = taskData.snoozedUntil || taskData.reminderTime;
  if (!targetTime) return;

  const payload = { 
    taskId, 
    scheduledTime: targetTime.toMillis() 
  };
  
  const scheduleTimeInSeconds = targetTime.toMillis() / 1000;

  const task = {
    httpRequest: {
      httpMethod: "POST",
      url,
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      headers: { "Content-Type": "application/json" },
    },
    scheduleTime: { seconds: scheduleTimeInSeconds },
  };

  try {
    await client.createTask({ parent, task });
    console.log(`[tasks] Scheduled notification for task ${taskId} at ${targetTime.toDate()}`);
  } catch (err) {
    console.error(`[tasks] Failed to create Cloud Task for ${taskId}:`, err.message);
  }
}

// ── Firestore Trigger: Schedule Notification ─────────────────────────────────
// Fires when a task is created or updated.
//
exports.onTaskWritten = onDocumentWritten("tasks/{taskId}", async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  // If deleted or completed, do nothing
  if (!afterData || afterData.isCompleted) return;

  const oldTime = beforeData ? (beforeData.snoozedUntil || beforeData.reminderTime) : null;
  const newTime = afterData.snoozedUntil || afterData.reminderTime;

  // Schedule only if time changed or it's a new task with a reminder
  const timeChanged = !oldTime || (oldTime.toMillis() !== newTime?.toMillis());
  
  if (newTime && timeChanged && !afterData.reminderSent) {
    // Only schedule if the time is in the future
    if (newTime.toMillis() > Date.now()) {
      await scheduleNotification(afterData, event.params.taskId);
    }
  }
});

// ── HTTPS Trigger: Send Scheduled Notification ───────────────────────────────
// This is called by Cloud Tasks at the scheduled time.
//
exports.sendScheduledNotification = onRequest(async (req, res) => {
  const { taskId, scheduledTime } = req.body;

  if (!taskId || !scheduledTime) {
    res.status(400).send("Missing taskId or scheduledTime");
    return;
  }

  try {
    const taskDoc = await db.collection("tasks").doc(taskId).get();
    if (!taskDoc.exists) {
      console.log(`[tasks] Task ${taskId} no longer exists.`);
      res.status(200).send("Task not found");
      return;
    }

    const task = taskDoc.data();
    const currentTargetTime = task.snoozedUntil || task.reminderTime;

    // Idempotency & Validation:
    // 1. Skip if already completed.
    // 2. Skip if reminder was already sent (unless it's a snooze).
    // 3. Skip if the current target time doesn't match the scheduled time 
    //    (means it was rescheduled and a new Cloud Task should have been created).
    if (task.isCompleted) {
      res.status(200).send("Task completed, skipping notification");
      return;
    }

    if (!currentTargetTime || currentTargetTime.toMillis() !== scheduledTime) {
      console.log(`[tasks] Skipping stale notification for task ${taskId}. Current: ${currentTargetTime?.toMillis()}, Scheduled: ${scheduledTime}`);
      res.status(200).send("Stale notification skipped");
      return;
    }

    // Get FCM tokens for the user
    const tokensSnap = await db
      .collection("users")
      .doc(task.userId)
      .collection("fcmTokens")
      .get();

    const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);

    if (tokens.length === 0) {
      console.log(`[tasks] No FCM tokens found for user ${task.userId}`);
      res.status(200).send("No tokens found");
      return;
    }

    // Send the notification
    const messaging = getMessaging();
    const dueTimeStr = task.dueDate
      ? new Date(task.dueDate.toMillis()).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "soon";

    const payload = {
      notification: {
        title: "⏰ Task Reminder: Your Day",
        body: `"${task.title}" is due ${dueTimeStr}.`,
      },
      data: {
        taskId: taskId,
        url: "/",
        type: "reminder",
      },
      android: {
        notification: { channelId: "reminders", priority: "high" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(payload);
    console.log(`[tasks] Sent for ${taskId}: ${response.successCount} success, ${response.failureCount} failure`);

    // Mark as sent
    await db.collection("tasks").doc(taskId).update({
      reminderSent: true,
      reminderSentAt: Timestamp.now(),
    });

    // Clean up bad tokens
    const badTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && (
        resp.error?.code === "messaging/invalid-registration-token" ||
        resp.error?.code === "messaging/registration-token-not-registered"
      )) {
        badTokens.push(tokens[idx]);
      }
    });

    if (badTokens.length > 0) {
      const batch = db.batch();
      badTokens.forEach(t => {
        batch.delete(db.collection("users").doc(task.userId).collection("fcmTokens").doc(t));
      });
      await batch.commit();
    }

    res.status(200).send("Notification processed");
  } catch (err) {
    console.error(`[tasks] Fatal error sending notification for ${taskId}:`, err);
    res.status(500).send("Internal Server Error");
  }
});

// ── Daily Cleanup ─────────────────────────────────────────────────────────────
exports.dailyCleanup = onSchedule("every 24 hours", async () => {
  const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const old = await db.collection("notifications").where("sentAt", "<=", sevenDaysAgo).limit(500).get();
    if (old.empty) return;
    const batch = db.batch();
    old.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[cleanup] Deleted ${old.docs.length} old documents.`);
  } catch (err) {
    console.error("[cleanup] Error:", err);
  }
});

