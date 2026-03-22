importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// We keep this minimal because we only need it to receive background push messages.
// The actual config is passed implicitly by Vercel/Firebase, or we can use generic messaging.
firebase.initializeApp({
  // Since we only receive messages here, providing just the projectId and messagingSenderId usually works for Web Push.
  projectId: "student-planner-95ed4",
  messagingSenderId: "224841353755", // Updated to real sender ID
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  
  const notificationTitle = payload.notification?.title || "StudyFlow Reminder";
  const notificationOptions = {
    body: payload.notification?.body || "You have a task due soon.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
