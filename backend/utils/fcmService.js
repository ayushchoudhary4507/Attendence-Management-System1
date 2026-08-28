/**
 * FCM Push Notification Service
 * 
 * Sends Firebase Cloud Messaging push notifications to admin devices.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Firebase Console -> Project Settings -> Service Accounts
 * 2. Click "Generate new private key" and download the JSON file
 * 3. Save it as backend/firebase-service-account.json
 * 4. Set FIREBASE_PROJECT_ID in your .env file
 * 
 * Without a real service account, push notifications to OFFLINE admins
 * will be gracefully skipped. Socket-based (online) notifications always work.
 */

let admin = null;
let isInitialized = false;
let initAttempted = false;

const initFirebaseAdmin = () => {
  if (initAttempted) return isInitialized;
  initAttempted = true;

  try {
    const firebaseAdmin = require('firebase-admin');
    const path = require('path');
    const fs = require('fs');

    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

    if (!fs.existsSync(serviceAccountPath)) {
      console.log('ℹ️  FCM: firebase-service-account.json not found — offline push notifications disabled.');
      console.log('   To enable: Add firebase-service-account.json to the backend/ directory.');
      return false;
    }

    const serviceAccount = require(serviceAccountPath);
    const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;

    if (!projectId) {
      console.log('ℹ️  FCM: No Firebase project ID found — offline push notifications disabled.');
      return false;
    }

    if (firebaseAdmin.apps.length === 0) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
        projectId
      });
    }

    admin = firebaseAdmin;
    isInitialized = true;
    console.log(`✅ FCM: Firebase Admin initialized for project "${projectId}"`);
    return true;
  } catch (err) {
    console.log('ℹ️  FCM: Firebase Admin init failed (push to offline admins disabled):', err.message);
    return false;
  }
};

/**
 * Send FCM push notification to a list of device tokens.
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {Object} payload - { title, body, data }
 * @returns {Promise<{ sent: number, failed: number }>}
 */
const sendPushToTokens = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) return { sent: 0, failed: 0 };

  const ready = initFirebaseAdmin();
  if (!ready || !admin) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  // Send in batches of 500 (FCM limit)
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    try {
      const message = {
        notification: {
          title: payload.title || 'AMS Notification',
          body: payload.body || ''
        },
        data: Object.fromEntries(
          Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: 'high',
          notification: {
            channelId: 'ams_high_importance_channel',
            sound: 'default',
            priority: 'max'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        tokens: chunk
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      sent += response.successCount;
      failed += response.failureCount;

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.warn(`FCM token ${idx} failed:`, resp.error?.code);
          }
        });
      }
    } catch (err) {
      console.error('FCM batch send error:', err.message);
      failed += chunk.length;
    }
  }

  return { sent, failed };
};

/**
 * Send login notification push to all admin devices.
 * Only called for admins who are currently OFFLINE on socket.
 * @param {Object[]} adminUsers - Array of admin User documents (with fcmTokens)
 * @param {Object} notifData - { title, message, employeeName, loginSource, loginDate, loginTime, employeeEmail }
 */
const sendLoginNotificationToAdmins = async (adminUsers, notifData) => {
  const {
    title = 'User Login Alert',
    message = '',
    employeeName = '',
    loginSource = 'Web',
    loginDate = '',
    loginTime = '',
    employeeEmail = '',
    employeeId = ''
  } = notifData;

  // Collect all valid FCM tokens from offline admins
  const allTokens = [];
  for (const admin of adminUsers) {
    if (admin.fcmTokens && admin.fcmTokens.length > 0) {
      admin.fcmTokens.forEach(t => {
        if (t.token && t.token.length > 10) {
          allTokens.push(t.token);
        }
      });
    }
  }

  if (allTokens.length === 0) {
    return;
  }

  const result = await sendPushToTokens(allTokens, {
    title,
    body: message,
    data: {
      type: 'employee_login',
      notificationType: 'employee_login',
      employeeName,
      employeeEmail,
      employeeId: String(employeeId),
      loginSource,
      loginDate,
      loginTime,
      link: '/employees'
    }
  });

  console.log(`📲 FCM push sent to ${allTokens.length} admin tokens — success: ${result.sent}, failed: ${result.failed}`);
};

module.exports = { sendLoginNotificationToAdmins, sendPushToTokens, initFirebaseAdmin };
