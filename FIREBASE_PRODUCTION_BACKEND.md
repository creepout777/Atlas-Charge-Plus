# Atlas Charge Plus+ — Production Firebase Backend Architecture & Integration Guide

This guide outlines the step-by-step implementation required to connect **Atlas Charge Plus+** (Web & Flutter client) to a production-grade **Firebase** backend.

---

## 🏗️ 1. Architecture Overview

```
                      ┌──────────────────────────────────────────────────┐
                      │          CLIENT APPLICATIONS                     │
                      │  (Web Client + Flutter iOS/Android Native App)   │
                      └────────┬─────────────────┬─────────────────┬─────┘
                               │                 │                 │
                               ▼                 ▼                 ▼
                     ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
                     │  Firebase Auth   │ │  Firestore & │ │ Cloud Functions  │
                     │ (SMS / Phone OTP)│ │   RTDB WSS   │ │  (Node.js API)   │
                     └──────────────────┘ └──────────────┘ └────────┬─────────┘
                                                                    │
                                                      ┌─────────────┴─────────────┐
                                                      ▼                           ▼
                                            ┌───────────────────┐       ┌──────────────────┐
                                            │ Stripe Payments   │       │ Firebase Push    │
                                            │ (Pre-auth & Hold) │       │ Messaging (FCM)  │
                                            └───────────────────┘       └──────────────────┘
```

---

## 🚀 2. Phase 1: Firebase Project Initialization

### 1.1 Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create Project** and name it `atlas-charge-plus`.
3. Enable **Google Analytics** (optional, recommended for production telemetry).

### 1.2 Enable Required Firebase Services
- **Authentication**: Enable **Phone Auth** (SMS OTP) and **Email/Password** or **Sign-in with Apple**.
- **Firestore Database**: Create database in `Production mode` selecting your target region (e.g., `europe-west2` for UK).
- **Realtime Database (RTDB)**: Enable for high-frequency sub-second GPS telemetry streaming.
- **Cloud Functions**: Upgrade project to **Blaze Plan** (Pay-as-you-go, generous free tier) to enable Node.js serverless triggers.
- **Cloud Messaging (FCM)**: Configure Web Push VAPID keys and iOS APNs Certificates/Keys.

---

## 🗄️ 3. Phase 2: Database Schema & Geohashing Design

### 3.1 Firestore Schema

#### `users/{userId}`
```json
{
  "uid": "usr_98420x",
  "name": "Alex Morgan",
  "email": "alex.morgan@email.com",
  "phoneNumber": "+447911123456",
  "role": "CLIENT",
  "stripeCustomerId": "cus_N7x9...",
  "createdAt": "2026-08-15T00:00:00Z"
}
```

#### `orders/{orderId}`
```json
{
  "orderId": "ORD-9842",
  "userId": "usr_98420x",
  "status": "DISPATCHED", // PENDING -> DISPATCHED -> ARRIVED -> CHARGING -> COMPLETED -> CANCELED
  "connectorType": "CCS",
  "chargeProfile": "Standard",
  "targetLocation": {
    "lat": 51.5074,
    "lng": -0.1278,
    "geohash": "gcpuvpm5"
  },
  "assignedTruckId": "truck-01",
  "paymentIntentId": "pi_3M0x...",
  "pricing": {
    "calloutFee": 15.00,
    "kwhRate": 0.45,
    "totalEstimate": 42.00
  },
  "createdAt": "2026-08-15T00:00:00Z"
}
```

#### `trucks/{truckId}`
```json
{
  "truckId": "truck-01",
  "name": "Atlas Titan #01",
  "driver": "Marcus Webb",
  "status": "EN_ROUTE", // AVAILABLE -> EN_ROUTE -> CHARGING -> OFF_DUTY
  "batteryCapacityKwh": 200,
  "currentStoredKwh": 165,
  "connectors": ["CCS", "CHAdeMO", "Type 2"],
  "location": {
    "lat": 51.4652,
    "lng": -0.1195,
    "geohash": "gcpucn21"
  },
  "updatedAt": "2026-08-15T00:00:00Z"
}
```

---

## 🔒 4. Phase 3: Firestore Production Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    function isFleetDriver() {
      return isAuthenticated() && request.auth.token.role == 'DRIVER';
    }

    // User Accounts
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Fleet Trucks
    match /trucks/{truckId} {
      allow read: if isAuthenticated();
      allow write: if isFleetDriver();
    }

    // Charging Orders
    match /orders/{orderId} {
      allow read: if isAuthenticated() && (resource.data.userId == request.auth.uid || isFleetDriver());
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && (resource.data.userId == request.auth.uid || isFleetDriver());
    }
  }
}
```

---

## ⚡ 5. Phase 4: Serverless Cloud Functions (`functions/index.js`)

### 5.1 Automatic Truck Dispatcher (`onOrderCreated`)
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const targetLoc = order.targetLocation;

    // 1. Query nearest available truck
    const trucksSnap = await admin.firestore().collection('trucks')
      .where('status', '==', 'AVAILABLE')
      .get();

    let bestTruck = null;
    let minDistance = Infinity;

    trucksSnap.forEach(doc => {
      const truck = doc.data();
      const dist = calculateDistance(truck.location.lat, truck.location.lng, targetLoc.lat, targetLoc.lng);
      if (dist < minDistance) {
        minDistance = dist;
        bestTruck = { id: doc.id, ...truck };
      }
    });

    if (bestTruck) {
      // 2. Assign truck & update order
      await snap.ref.update({
        assignedTruckId: bestTruck.id,
        status: 'DISPATCHED'
      });

      await admin.firestore().collection('trucks').doc(bestTruck.id).update({
        status: 'EN_ROUTE'
      });

      // 3. Send Push Notification via FCM
      await sendFCMNotification(order.userId, 'Mobile Unit Dispatched', `${bestTruck.name} is on its way to your location.`);
    }
  });

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### 5.2 Stripe Pre-Authorization Webhook
```javascript
const stripe = require('stripe')(functions.config().stripe.secret);

exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(data.estimatedTotal * 100), // in pence / cents
    currency: 'gbp',
    capture_method: 'manual', // Hold authorization pre-dispatch
    metadata: { userId: context.auth.uid, connectorType: data.connectorType }
  });

  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
});
```

---

## 📱 6. Phase 5: Client Integration (Web & Flutter)

### 6.1 Web Client Integration (`web/js/bridge.js`)
Initialize Firebase JS SDK v10 in `web/index.html`:
```html
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
  import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
  import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "atlas-charge-plus.firebaseapp.com",
    projectId: "atlas-charge-plus",
    storageBucket: "atlas-charge-plus.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  const app = initializeApp(firebaseConfig);
  window.db = getFirestore(app);
  window.auth = getAuth(app);

  // Subscribe to live order updates
  window.subscribeToOrder = function(orderId, callback) {
    return onSnapshot(doc(window.db, "orders", orderId), (snapshot) => {
      callback(snapshot.data());
    });
  };
</script>
```

### 6.2 Flutter Mobile App Integration (`flutter_app/pubspec.yaml`)
Add dependencies:
```yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_auth: ^4.15.3
  cloud_firestore: ^4.13.6
  firebase_messaging: ^14.7.9
```

---

## 🛠️ 7. Phase 6: Production CI/CD Deployment

### Deploy Cloud Functions & Firestore Rules:
```bash
npm install -g firebase-tools
firebase login
firebase init
firebase deploy --only firestore:rules,functions
```

### Hosting Static Web Assets:
```bash
firebase deploy --only hosting
```
