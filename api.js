const API_URL = "https://script.google.com/macros/s/AKfycbx5lbAmTXpQRntpv4IQqM2jA67OeRVDYgWGGVrwjkzYhg6uatkqZFLEPuEKL24nvTV9/exec";

function gasRun(funcName, ...args) {
    // ZETTBOT FIX: Interceptor untuk Mode Hybrid (Firebase Utama, GAS Cadangan)
    if (window.USE_FIREBASE && window.firebaseDB) {
        return runHybridDatabase(funcName, ...args);
    }

    return executeGoogleSheets(funcName, args);
}

// Fungsi murni untuk eksekusi ke Google Sheets (Dipisah agar bisa dipakai untuk Fallback)
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

    try {
        console.log(`🔥 Rute Firebase Aktif: Menjalankan eksekusi [${funcName}]`);
        let result;

        // 1. PEMETAAN FUNGSI BACA (READ)
        if (funcName === 'getData') {
            let sheetName = args[0];
            let snapshot = await getDocs(col(db, sheetName));
            let dataArray = [];
            
            snapshot.forEach(doc => {
                let d = doc.data();
                // Mengembalikan format JSON Firebase menjadi Array agar Frontend HTML tidak error
                if(d.rowArray) dataArray.push(d.rowArray); 
            });

            // Jika Firebase masih kosong, paksa Fallback ke GS agar UI tidak blank
            if (dataArray.length === 0) {
                throw new Error("Data di Firebase masih kosong, beralih membaca dari Google Sheets.");
            }
            result = dataArray;
        } 
        // Pemetaan Read yang kompleks (Bisa kita sinkronkan perlahan)
        else if (funcName === 'getDropdownData') {
            throw new Error("Fallback ke GS untuk Dropdown selama masa transisi.");
        } 
        
        // 2. PEMETAAN FUNGSI TULIS (WRITE / CREATE)
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
            // Format data mengikuti skema kolom tabel Google Sheets
            let row = [
                "KNT-FB-" + new Date().getTime(), // ID Generator Firebase Sementara
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
        // 3. JIKA FUNGSI BELUM DIBUAT (Update & Delete perlu logic khusus ID Firebase)
        else {
             throw new Error(`Fungsi [${funcName}] belum di-mapping di Firebase.`);
        }

        // =============================================================
        // 🚀 ZETTBOT AUTO-BACKUP KE GOOGLE SHEETS
        // Backup dieksekusi di background tanpa memblokir UI (No await)
        // =============================================================
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
        // Jika Firebase gagal/kosong/belum di-mapping, instruksi dilempar kembali ke sistem lama
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
        // 1. Panggil Endpoint getAllData di Code.gs
        const allData = await executeGoogleSheets('getAllData', []);

        if (!allData || allData.error) {
            throw new Error(allData.error || "Gagal mengambil data dari Google Sheets.");
        }

        let totalPushed = 0;
        const sheetNames = Object.keys(allData);

        // 2. Loop setiap sheet dan Push ke Firestore
        for (let i = 0; i < sheetNames.length; i++) {
            let sheetName = sheetNames[i];
            let rows = allData[sheetName];

            if (!rows || rows.length === 0) continue;

            Swal.update({
                html: `Memigrasikan tabel <b>${sheetName}</b>...<br>Proses: (${i + 1}/${sheetNames.length})`
            });

            console.log(`Memigrasikan ${rows.length} baris dari tabel ${sheetName}...`);

            // Eksekusi berurutan agar tidak terkena limit / timeout request
            for (let j = 0; j < rows.length; j++) {
                let rowData = rows[j];
                // Lewati baris kosong
                if (!rowData || rowData[0] === "") continue;

                await addDoc(col(db, sheetName), {
                    rowArray: rowData,
                    timestamp: new Date().getTime() + j // Ditambah j agar timestamp berurutan
                });
                totalPushed++;
            }
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
