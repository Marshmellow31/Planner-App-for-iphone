// ============================================================
// functions/index.js — Firebase Cloud Functions
// ============================================================
//
// REQUIRES: Firebase Blaze plan (pay-as-you-go)
//
// Deploy with:
//   firebase deploy --only functions
//
// ============================================================

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

// ── Scheduled Reminder Processor ──────────────────────────────────────────────
// Runs every 5 minutes. Queries tasks with reminderTime <= now that haven't
// had their reminder sent yet, then sends FCM push notifications.
//
exports.scheduledReminders = onSchedule("every 5 minutes", async () => {
  const now = Timestamp.now();

  try {
    // Query eligible tasks
    const snapshot = await db
      .collection("tasks")
      .where("reminderTime", "<=", now)
      .where("reminderSent", "==", false)
      .where("isCompleted", "==", false)
      .limit(200) // process up to 200 per run
      .get();

    if (snapshot.empty) {
      console.log("[reminders] No reminders due.");
      return;
    }

    // Group tasks by userId
    const tasksByUser = {};
    snapshot.docs.forEach((doc) => {
      const task = { id: doc.id, ...doc.data() };

      // Skip tasks still snoozed
      if (task.snoozedUntil && task.snoozedUntil.toMillis() > now.toMillis()) {
        return;
      }

      if (!tasksByUser[task.userId]) tasksByUser[task.userId] = [];
      tasksByUser[task.userId].push(task);
    });

    const messaging = getMessaging();
    const batch = db.batch();
    const processedIds = [];

    // Process each user
    await Promise.all(
      Object.entries(tasksByUser).map(async ([userId, tasks]) => {
        // Get all FCM tokens for this user
        const tokenSnap = await db
          .collection("users")
          .doc(userId)
          .collection("fcmTokens")
          .get();

        const tokens = tokenSnap.docs.map((d) => d.data().token).filter(Boolean);

        // Send a notification per task (group if many)
        for (const task of tasks) {
          if (tokens.length > 0) {
            const due = task.dueDate
              ? new Date(task.dueDate.toMillis()).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "soon";

            const message = {
              notification: {
                title: "⏰ Task Reminder: StudyFlow",
                body: `"${task.title}" is due ${due}`,
              },
              data: {
                taskId: task.id,
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

            try {
              const response = await messaging.sendEachForMulticast(message);
              console.log(
                `[reminders] Task ${task.id}: ${response.successCount} sent, ${response.failureCount} failed`
              );

              // Remove invalid tokens
              response.responses.forEach((resp, idx) => {
                if (
                  !resp.success &&
                  (resp.error?.code === "messaging/invalid-registration-token" ||
                    resp.error?.code === "messaging/registration-token-not-registered")
                ) {
                  const badToken = tokens[idx];
                  db.collection("users")
                    .doc(userId)
                    .collection("fcmTokens")
                    .doc(badToken)
                    .delete()
                    .catch(() => {});
                }
              });
            } catch (err) {
              console.error(`[reminders] FCM error for task ${task.id}:`, err.message);
            }
          }

          // Mark reminder as sent
          batch.update(db.collection("tasks").doc(task.id), {
            reminderSent: true,
            reminderSentAt: now,
          });
          processedIds.push(task.id);
        }
      })
    );

    // Commit all reminder-sent updates
    if (processedIds.length > 0) {
      await batch.commit();
      console.log(`[reminders] Marked ${processedIds.length} tasks as sent.`);
    }
  } catch (err) {
    console.error("[reminders] Fatal error:", err);
  }
});

// ── Daily Cleanup (optional) ──────────────────────────────────────────────────
// Cleans up old completed+sent reminders from a notifications audit collection.
// This is optional and only matters if you track a 'notifications' collection.
//
exports.dailyCleanup = onSchedule("every 24 hours", async () => {
  const sevenDaysAgo = Timestamp.fromMillis(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  try {
    const old = await db
      .collection("notifications")
      .where("sentAt", "<=", sevenDaysAgo)
      .limit(500)
      .get();

    if (old.empty) {
      console.log("[cleanup] Nothing to clean up.");
      return;
    }

    const batch = db.batch();
    old.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[cleanup] Deleted ${old.docs.length} old notifications.`);
  } catch (err) {
    console.error("[cleanup] Error:", err);
  }
});
