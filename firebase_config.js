// ZETTBOT: Konfigurasi Firebase & Mode Hybrid
// Menggunakan ES Modules dari CDN untuk environment GitHub Pages

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 1. Masukkan Config Firebase Anda di sini nanti (Dapat dari Console Firebase)
const firebaseConfig = {
    apiKey: "ISI_API_KEY_ANDA",
    authDomain: "ISI_AUTH_DOMAIN_ANDA",
    projectId: "ISI_PROJECT_ID_ANDA",
    storageBucket: "ISI_STORAGE_BUCKET_ANDA",
    messagingSenderId: "ISI_MESSAGING_SENDER_ID_ANDA",
    appId: "ISI_APP_ID_ANDA"
};

// 2. State Mode Database (Switch: true = Firebase, false = Google Sheets murni)
window.USE_FIREBASE = false; // SAAT INI DIMATIKAN agar Google Sheets Anda tetap jalan normal

// 3. Inisialisasi Database (Hanya jika konfigurasi sudah diisi)
try {
    if (firebaseConfig.apiKey !== "ISI_API_KEY_ANDA") {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        // Ekspor fungsi Firebase ke global window agar bisa dipakai oleh api.js nanti
        window.firebaseDB = db;
        window.fbCollection = collection;
        window.fbAddDoc = addDoc;
        window.fbGetDocs = getDocs;
        window.fbUpdateDoc = updateDoc;
        window.fbDeleteDoc = deleteDoc;
        window.fbDoc = doc;
        
        console.log("🔥 ZettBOT: Firebase Core berhasil dimuat dan siap digunakan.");
    } else {
        console.log("⚠️ ZettBOT: Menunggu Config Firebase. Aplikasi saat ini berjalan 100% menggunakan Google Sheets murni.");
    }
} catch (error) {
    console.error("Firebase Init Error:", error);
}
