const API_URL = "https://script.google.com/macros/s/AKfycbx5lbAmTXpQRntpv4IQqM2jA67OeRVDYgWGGVrwjkzYhg6uatkqZFLEPuEKL24nvTV9/exec";

async function gasRun(funcName, ...args) {
    if (typeof window.USE_FIREBASE === 'undefined') {
        let retries = 30;
        while (typeof window.USE_FIREBASE === 'undefined' && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries--;
        }
    }

    if (window.USE_FIREBASE === true && window.firebaseDB) {
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

async function runHybridDatabase(funcName, ...args) {
    const db = window.firebaseDB;
    const col = window.fbCollection;
    const getDocs = window.fbGetDocs;
    const addDoc = window.fbAddDoc;
    const updateDoc = window.fbUpdateDoc;
    const deleteDoc = window.fbDeleteDoc;
    const docRef = window.fbDoc;

    const fRupiah = (angka) => {
        let num = parseInt(angka, 10) || 0;
        return "Rp " + num.toLocaleString('id-ID').replace(/,/g, '.');
    };

    try {
        console.log(`🔥 Rute Firebase Aktif: Menjalankan eksekusi [${funcName}]`);
        let result;

        if (funcName === 'getData') {
            let sheetName = args[0];
            let snapshot = await getDocs(col(db, sheetName));
            let dataObjects = [];

            snapshot.forEach(doc => {
                let d = doc.data();
                if(d.rowArray) {
                    d.timestamp = d.timestamp || 0;
                    dataObjects.push(d);
                }
            });

            dataObjects.sort((a, b) => a.timestamp - b.timestamp);
            let dataArray = dataObjects.map(obj => obj.rowArray);

            if (dataArray.length === 0) {
                throw new Error("Data di Firebase masih kosong, beralih membaca dari Google Sheets.");
            }
            result = dataArray;
        }
        else if (funcName === 'getDropdownData') {
            const collectionsToFetch = [
                'BrandHP', 'Provider', 'Bank', 'E_Wallet', 'PPOB',
                'KategoriACC', 'KategoriGame', 'Voucher', 'Perdana', 'ACC', 'Pulsa', 'Token'
            ];

            const fetchPromises = collectionsToFetch.map(sheet => getDocs(col(db, sheet)));
            const snapshots = await Promise.all(fetchPromises);

            const extractData = (snap) => {
                let arr = [];
                snap.forEach(doc => {
                    let d = doc.data();
                    if(d.rowArray) arr.push(d.rowArray);
                });
                return arr;
            };

            let brandRaw = extractData(snapshots[0]);
            let provRaw = extractData(snapshots[1]);
            let bankRaw = extractData(snapshots[2]);
            let ewRaw = extractData(snapshots[3]);
            let ppobRaw = extractData(snapshots[4]);
            let kAccRaw = extractData(snapshots[5]);
            let kGameRaw = extractData(snapshots[6]);
            let vRaw = extractData(snapshots[7]);
            let pRaw = extractData(snapshots[8]);
            let aRaw = extractData(snapshots[9]);
            let plRaw = extractData(snapshots[10]);
            let tRaw = extractData(snapshots[11]); 

            const parseNum = (str) => String(str || '').replace(/[^0-9]/g, '');

            result = {
                brandData: brandRaw.map(r => r[1]),
                providerData: provRaw.map(r => r[1]),
                bankData: bankRaw.map(r => r[1]),
                ewalletData: ewRaw.map(r => r[1]),
                ppobData: ppobRaw.map(r => r[1]),
                kategoriAccData: kAccRaw.map(r => r[1]),
                kategoriGameData: kGameRaw.map(r => r[1]),
                voucherData: vRaw.map(r => ({ provider: r[1], nama: r[2], beli: parseNum(r[3]), jual: parseNum(r[4]), stok: r[5] })),
                perdanaData: pRaw.map(r => ({ provider: r[1], nama: r[2], beli: parseNum(r[3]), jual: parseNum(r[4]), stok: r[5] })),
                accData: aRaw.map(r => ({ kategori: r[1], nama: r[2], beli: parseNum(r[3]), jual: parseNum(r[4]), stok: r[5] })),
                pulsaData: plRaw.map(r => ({ provider: r[1], nama: r[2], beli: parseNum(r[3]), jual: parseNum(r[4]) })),
                tokenData: tRaw.map(r => ({ nama: r[1], beli: parseNum(r[2]), jual: parseNum(r[3]) }))
            };
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

            let dateObj = new Date();
            let dd = String(dateObj.getDate()).padStart(2, '0');
            let mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            let yy = String(dateObj.getFullYear()).slice(-2);
            let prefix = `TRX-${dd}${mm}${yy}-`;

            let snapshot = await getDocs(col(db, 'DB_konter'));
            let maxNum = 0;

            snapshot.forEach(doc => {
                let d = doc.data();
                if (d.rowArray && d.rowArray[0] && String(d.rowArray[0]).startsWith(prefix)) {
                    let numPart = String(d.rowArray[0]).split('-')[2];
                    let num = parseInt(numPart, 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            });

            let newId = prefix + String(maxNum + 1).padStart(3, '0');

            let row = [
                newId,
                payload.tanggal,
                payload.jenis,
                payload.detail,
                fRupiah(payload.hargaBeliDB),
                fRupiah(payload.hargaJualDB),
                fRupiah(payload.hargaJualDB - payload.hargaBeliDB),
                new Date().toLocaleDateString('id-ID')
            ];

            await addDoc(col(db, 'DB_konter'), {
                rowArray: row,
                timestamp: new Date().getTime()
            });
            result = { status: 'success', message: 'Transaksi Konter Disimpan di Firebase & GS' };
        }
        else if (funcName === 'deleteData') {
            let sheetName = args[0];
            let itemId = args[2]; 

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
            let itemId = rowData[0]; 

            if (itemId) {
                let snapshot = await getDocs(col(db, sheetName));
                let targetDocId = null;
                let originalTimestamp = new Date().getTime(); 

                snapshot.forEach(doc => {
                    let d = doc.data();
                    if (d.rowArray && d.rowArray[0] === itemId) {
                        targetDocId = doc.id;
                        if (d.timestamp) originalTimestamp = d.timestamp; 
                    }
                });

                if (targetDocId) {
                    let newRow = [...rowData];
                    newRow.push(new Date().toLocaleDateString('id-ID'));
                    
                    await updateDoc(docRef(db, sheetName, targetDocId), {
                        rowArray: newRow,
                        timestamp: originalTimestamp 
                    });
                } else {
                    let newRow = [...rowData];
                    newRow.push(new Date().toLocaleDateString('id-ID'));
                    await addDoc(col(db, sheetName), {
                        rowArray: newRow,
                        timestamp: originalTimestamp
                    });
                }
            }
            result = { status: 'success', message: 'Data diupdate di Firebase & GS' };
        }
        else if (funcName === 'editKonterTransaction') {
            let payload = args[1];
            let itemId = args[2]; // ZETTBOT FIX: Mengambil ID secara eksplisit dari frontend
            let sheetName = 'DB_konter';

            if (itemId) {
                let snapshot = await getDocs(col(db, sheetName));
                let targetDocId = null;
                let originalTimestamp = new Date().getTime();
                let originalRow = null;

                snapshot.forEach(doc => {
                    let d = doc.data();
                    if (d.rowArray && d.rowArray[0] === itemId) {
                        targetDocId = doc.id;
                        if (d.timestamp) originalTimestamp = d.timestamp;
                        originalRow = d.rowArray;
                    }
                });

                if (targetDocId && originalRow) {
                    let updatedRow = [
                        itemId,
                        payload.tanggal !== undefined ? payload.tanggal : originalRow[1],
                        payload.jenis !== undefined ? payload.jenis : originalRow[2],
                        payload.detail !== undefined ? payload.detail : originalRow[3],
                        payload.hargaBeliDB !== undefined ? fRupiah(payload.hargaBeliDB) : originalRow[4],
                        payload.hargaJualDB !== undefined ? fRupiah(payload.hargaJualDB) : originalRow[5],
                        (payload.hargaJualDB !== undefined && payload.hargaBeliDB !== undefined) ? fRupiah(payload.hargaJualDB - payload.hargaBeliDB) : originalRow[6],
                        new Date().toLocaleDateString('id-ID')
                    ];

                    await updateDoc(docRef(db, sheetName, targetDocId), {
                        rowArray: updatedRow,
                        timestamp: originalTimestamp
                    });
                    console.log("✅ Update Firebase Berhasil!", updatedRow);
                } else {
                    console.warn("⚠️ Gagal edit: Doc ID Transaksi tidak ditemukan di Firebase");
                }
            } else {
                console.warn("⚠️ Gagal edit: Item ID tidak dikirim dari Frontend");
            }
            result = { status: 'success', message: 'Transaksi diedit' };
        }
        else {
             throw new Error(`Fungsi [${funcName}] belum di-mapping di Firebase.`);
        }

        const writeActions = ['saveData', 'updateData', 'deleteData', 'saveKonterTransaction', 'editKonterTransaction', 'batchSaveScrapedData'];
        if (writeActions.includes(funcName)) {
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
window.gasRun = gasRun;
