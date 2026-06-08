// ZETTBOT: Konfigurasi Firebase & Mode Hybrid
// Menggunakan ES Modules dari CDN untuk environment GitHub Pages

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 1. Masukkan Config Firebase Anda di sini nanti (Dapat dari Console Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyCkv7rYTAIUy9Exd29HpLDvyubM2yq0jtc",
  authDomain: "bengkelgadget-l2.firebaseapp.com",
  projectId: "bengkelgadget-l2",
  storageBucket: "bengkelgadget-l2.firebasestorage.app",
  messagingSenderId: "8475192675",
  appId: "1:8475192675:web:da12ee67f40c7bfd2ab756",
  measurementId: "G-DVYLTDQK8Y"
};

// 2. State Mode Database (Switch: true = Firebase, false = Google Sheets murni)
window.USE_FIREBASE = true; // DIAKTIFKAN: Web -> Firebase -> Google Sheets (Backup)

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
