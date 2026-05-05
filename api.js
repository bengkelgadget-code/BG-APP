const API_URL = "https://script.google.com/macros/s/AKfycbx5lbAmTXpQRntpv4IQqM2jA67OeRVDYgWGGVrwjkzYhg6uatkqZFLEPuEKL24nvTV9/exec";

function gasRun(funcName, ...args) {
    if (window.USE_FIREBASE && window.firebaseDB) {
        return runHybridDatabase(funcName, ...args);
    }

    return executeGoogleSheets(funcName, args);
}

function executeGoogleSheets(funcName, args) {
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

// ============================================================================
// 🤖 ZETTBOT: MESIN HYBRID DATABASE (FIREBASE -> GOOGLE SHEETS)
// ============================================================================
async function runHybridDatabase(funcName, ...args) {
    const db = window.firebaseDB;
    const col = window.fbCollection;
    const getDocs = window.fbGetDocs;
    const addDoc = window.fbAddDoc;
    // ZETTBOT FIX: Menambahkan modul Firebase untuk Edit & Hapus
    const updateDoc = window.fbUpdateDoc;
    const deleteDoc = window.fbDeleteDoc;
    const docRef = window.fbDoc;

    try {
        console.log(`🔥 Rute Firebase Aktif: Menjalankan eksekusi [${funcName}]`);
        let result;

        if (funcName === 'getData') {
            let sheetName = args[0];
            let snapshot = await getDocs(col(db, sheetName));
            let dataArray = [];
            
            snapshot.forEach(doc => {
                let d = doc.data();
                if(d.rowArray) dataArray.push(d.rowArray); 
            });

            if (dataArray.length === 0) {
                throw new Error("Data di Firebase masih kosong, beralih membaca dari Google Sheets.");
            }
            result = dataArray;
        } 
        else if (funcName === 'getDropdownData') {
            throw new Error("Fallback ke GS untuk Dropdown selama masa transisi.");
        } 
        else if (funcName === 'saveData') {
            let sheetName = args[0];
            let rowData = args[1];
            await addDoc(col(db, sheetName), {
                rowArray: rowData,
                timestamp: new Date().getTime()
            });
            result = { status: 'success', message: 'Data tersimpan di Firebase & GS' };
        } 
        else if (funcName === 'saveKonterTransaction') {
            let payload = args[0];
            let row = [
                "KNT-FB-" + new Date().getTime(), 
                payload.tanggal,
                payload.jenis,
                payload.detail,
                "Rp " + payload.hargaBeliDB,
                "Rp " + payload.hargaJualDB,
                "Rp " + (payload.hargaJualDB - payload.hargaBeliDB),
                new Date().toLocaleDateString('id-ID')
            ];
            await addDoc(col(db, 'DB_konter'), { 
                rowArray: row, 
                timestamp: new Date().getTime() 
            });
            result = { status: 'success', message: 'Transaksi Konter Disimpan di Firebase & GS' };
        } 
        // ZETTBOT FIX: FULL FIREBASE MAPPING UNTUK DELETE & UPDATE
        else if (funcName === 'deleteData') {
            let sheetName = args[0];
            let itemId = args[2]; // ID Unik hasil ekstrak dari app_logic.js

            if (itemId) {
                let snapshot = await getDocs(col(db, sheetName));
                let targetDocId = null;
                
                // Cari dokumen Firebase yang memiliki ID yang sama dengan tabel
                snapshot.forEach(doc => {
                    let d = doc.data();
                    if (d.rowArray && d.rowArray[0] === itemId) {
                        targetDocId = doc.id;
                    }
                });

                if (targetDocId) {
                    await deleteDoc(docRef(db, sheetName, targetDocId));
                } else {
                    console.warn("Data tidak ditemukan di Firebase, mungkin sudah terhapus.");
                }
            }
            result = { status: 'success', message: 'Data dihapus dari Firebase & GS' };
        }
        else if (funcName === 'updateData') {
            let sheetName = args[0];
            let rowData = args[2];
            let itemId = rowData[0]; // ID selalu berada di urutan pertama array

            if (itemId) {
                let snapshot = await getDocs(col(db, sheetName));
                let targetDocId = null;
                snapshot.forEach(doc => {
                    let d = doc.data();
                    if (d.rowArray && d.rowArray[0] === itemId) {
                        targetDocId = doc.id;
                    }
                });

                if (targetDocId) {
                    await updateDoc(docRef(db, sheetName, targetDocId), {
                        rowArray: rowData,
                        timestamp: new Date().getTime()
                    });
                } else {
                    // Jika data belum ada di Firebase, tambahkan sebagai data baru
                    await addDoc(col(db, sheetName), {
                        rowArray: rowData,
                        timestamp: new Date().getTime()
                    });
                }
            }
            result = { status: 'success', message: 'Data diupdate di Firebase & GS' };
        }
        else if (funcName === 'editKonterTransaction') {
            let payload = args[1];
            let itemId = payload.id; // Diambil dari modifikasi submitKonterForm

            if (itemId) {
                let snapshot = await getDocs(col(db, 'DB_konter'));
                let targetDocId = null;
                snapshot.forEach(doc => {
                    let d = doc.data();
                    if (d.rowArray && d.rowArray[0] === itemId) {
                        targetDocId = doc.id;
                    }
                });

                let row = [
                    itemId,
                    payload.tanggal,
                    payload.jenis,
                    payload.detail,
                    "Rp " + payload.hargaBeliDB,
                    "Rp " + payload.hargaJualDB,
                    "Rp " + (payload.hargaJualDB - payload.hargaBeliDB),
                    new Date().toLocaleDateString('id-ID')
                ];

                if (targetDocId) {
                    await updateDoc(docRef(db, 'DB_konter', targetDocId), {
                        rowArray: row,
                        timestamp: new Date().getTime()
                    });
                } else {
                     await addDoc(col(db, 'DB_konter'), {
                        rowArray: row,
                        timestamp: new Date().getTime()
                    });
                }
            }
            result = { status: 'success', message: 'Transaksi Konter diupdate di Firebase & GS' };
        }
        else {
             throw new Error(`Fungsi [${funcName}] belum di-mapping di Firebase.`);
        }

        const writeActions = ['saveData', 'updateData', 'deleteData', 'saveKonterTransaction', 'editKonterTransaction', 'batchSaveScrapedData'];
        if (writeActions.includes(funcName)) {
            console.log("Mem-backup data ke Google Sheets di background...");
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: funcName, args: args })
            }).catch(e => console.error("Backup GS Gagal:", e));
        }

        return result;

    } catch(error) {
        console.warn(`⚠️ Fallback ke Google Sheets:`, error.message);
        return executeGoogleSheets(funcName, args); 
    }
}

// ============================================================================
// 🚀 ZETTBOT: SCRIPT MIGRASI DATA 1-KLIK (GOOGLE SHEETS -> FIREBASE)
// ============================================================================
window.migrateAllDataToFirebase = async function() {
    if (!window.firebaseDB) {
        Swal.fire('Error', 'Firebase belum siap atau belum dikonfigurasi. Pastikan window.USE_FIREBASE = true di config Anda.', 'error');
        return;
    }

    const db = window.firebaseDB;
    const col = window.fbCollection;
    const addDoc = window.fbAddDoc;

    Swal.fire({
        title: 'Memulai Migrasi...',
        html: 'Mengunduh seluruh database dari Google Sheets.<br><b>Mohon jangan tutup halaman ini.</b>',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        console.log("Mengunduh semua data dari Google Sheets...");
        const allData = await executeGoogleSheets('getAllData', []);

        if (!allData || allData.error) {
            throw new Error(allData.error || "Gagal mengambil data dari Google Sheets.");
        }

        let totalPushed = 0;
        const sheetNames = Object.keys(allData);

        for (let i = 0; i < sheetNames.length; i++) {
            let sheetName = sheetNames[i];
            let rows = allData[sheetName];

            if (!rows || rows.length === 0) continue;

            Swal.update({
                html: `Memigrasikan tabel <b>${sheetName}</b>...<br>Proses: (${i + 1}/${sheetNames.length})`
            });

            console.log(`Memigrasikan ${rows.length} baris dari tabel ${sheetName}...`);

            let pushPromises = [];
            for (let j = 0; j < rows.length; j++) {
                let rowData = rows[j];
                if (!rowData || rowData[0] === "") continue;

                let task = addDoc(col(db, sheetName), {
                    rowArray: rowData,
                    timestamp: new Date().getTime() + j
                }).then(() => { totalPushed++; });
                
                pushPromises.push(task);
            }
            
            await Promise.all(pushPromises);
        }

        Swal.fire({
            title: 'Migrasi Selesai! 🎉',
            text: `Berhasil memindahkan ${totalPushed} baris data ke Firebase Firestore.`,
            icon: 'success'
        }).then(() => {
            location.reload(); 
        });

    } catch (error) {
        console.error("Migrasi Error:", error);
        Swal.fire('Gagal Migrasi', error.message, 'error');
    }
};
