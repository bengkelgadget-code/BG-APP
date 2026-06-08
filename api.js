const API_URL = "https://script.google.com/macros/s/AKfycbx5lbAmTXpQRntpv4IQqM2jA67OeRVDYgWGGVrwjkzYhg6uatkqZFLEPuEKL24nvTV9/exec";

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCkv7rYTAIUy9Exd29HpLDvyubM2yq0jtc",
  authDomain: "bengkelgadget-l2.firebaseapp.com",
  projectId: "bengkelgadget-l2",
  storageBucket: "bengkelgadget-l2.firebasestorage.app",
  messagingSenderId: "8475192675",
  appId: "1:8475192675:web:da12ee67f40c7bfd2ab756",
  measurementId: "G-DVYLTDQK8Y"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Global listener registry to prevent duplicate listeners
window.BGL2_LISTENERS = window.BGL2_LISTENERS || {};

// ==========================================
// FIREBASE CRUD FUNCTIONS
// ==========================================

// Subscribe to a collection in real-time
window.listenToCollection = function(collectionName, callback) {
    if (window.BGL2_LISTENERS[collectionName]) {
        window.BGL2_LISTENERS[collectionName](); // Unsubscribe previous
    }

    window.BGL2_LISTENERS[collectionName] = db.collection(collectionName)
        // Sort by timestamp if possible, or just listen to all
        // .orderBy('timestamp', 'asc') // Removing orderBy temporarily to avoid index errors if not created
        .onSnapshot(function(querySnapshot) {
            let dataArr = [];
            querySnapshot.forEach(function(doc) {
                let docData = doc.data();
                if (docData && docData.rowArray) {
                    let arr = [...docData.rowArray];
                    arr._docId = doc.id; // Attach docId invisibly
                    arr._timestamp = docData.timestamp || 0;
                    dataArr.push(arr);
                }
            });
            // Sort by timestamp ascending locally to avoid requiring Firestore composite indexes
            dataArr.sort((a, b) => a._timestamp - b._timestamp);
            callback(dataArr);
        }, function(error) {
            console.error("Firebase listen error:", error);
        });
};

// Stop listening to a collection
window.stopListeningToCollection = function(collectionName) {
    if (window.BGL2_LISTENERS[collectionName]) {
        window.BGL2_LISTENERS[collectionName]();
        delete window.BGL2_LISTENERS[collectionName];
    }
};

window.getFromFirebase = async function(collectionName) {
    let snapshot = await db.collection(collectionName).get();
    let dataArr = [];
    snapshot.forEach(function(doc) {
        let docData = doc.data();
        if (docData && docData.rowArray) {
            let arr = [...docData.rowArray];
            arr._docId = doc.id;
            arr._timestamp = docData.timestamp || 0;
            dataArr.push(arr);
        }
    });
    dataArr.sort((a, b) => a._timestamp - b._timestamp);
    return dataArr;
};

window.saveToFirebase = async function(collectionName, rowArray) {
    return await db.collection(collectionName).add({
        rowArray: rowArray,
        timestamp: Date.now()
    });
};

window.updateInFirebase = async function(collectionName, docId, rowArray) {
    return await db.collection(collectionName).doc(docId).update({
        rowArray: rowArray,
        // We do NOT update timestamp on edit to preserve order
    });
};

window.deleteFromFirebase = async function(collectionName, docId) {
    return await db.collection(collectionName).doc(docId).delete();
};

window.batchSaveToFirebase = async function(collectionName, payloadArray) {
    let batch = db.batch();
    let colRef = db.collection(collectionName);
    
    // We must map [{provider: '...', nama: '...', beli: 100, jual: 200}] to rowArray
    // But wait! batchSaveScrapedData is specifically for Voucher/Perdana/ACC which have structure:
    // [ID, Provider, Nama Barang, Kategori, Harga Beli, Stok, Harga Jual]
    // We should let the backend do this, OR do it here. 
    // Actually, `Code.gs` does the mapping. We need to map it locally!
    
    // Let's just create generic IDs and map it
    for (let p of payloadArray) {
        let newId = 'M-' + new Date().getTime().toString().slice(-6) + Math.floor(Math.random()*1000);
        let fRupiah = (num) => "Rp " + parseInt(num).toLocaleString('id-ID').replace(/,/g, '.');
        let rowArr = [newId, p.provider, p.nama, collectionName, fRupiah(p.beli), "10", fRupiah(p.jual)];
        let newDocRef = colRef.doc();
        batch.set(newDocRef, {
            rowArray: rowArr,
            timestamp: Date.now()
        });
    }
    return await batch.commit();
};

async function gasRun(funcName, ...args) {
    return new Promise(async function(resolve, reject) {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run
                .withSuccessHandler(resolve)
                .withFailureHandler(reject)
                [funcName](...args);
        } else {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: funcName, args: args })
                });

                const res = await response.json();
                if(res.status === 'success') {
                    resolve(res.data);
                } else {
                    reject(new Error(res.message));
                }
            } catch(err) {
                console.error("API Error:", err);
                reject(new Error("Koneksi ke server API terputus atau URL tidak valid."));
            }
        }
    });
}

window.gasRun = gasRun;
