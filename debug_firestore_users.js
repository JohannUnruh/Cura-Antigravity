const { initializeApp, getApp, getApps } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function checkUsers() {
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const snap = await getDocs(collection(db, 'users'));
        console.log("USERS FOUND:", snap.size);
        snap.forEach(d => {
            console.log(`UID: ${d.id}, Name: ${d.data().name}, Email: ${d.data().email}`);
        });
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkUsers();
