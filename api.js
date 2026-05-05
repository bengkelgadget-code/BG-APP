const API_URL = "https://script.google.com/macros/s/AKfycbx5lbAmTXpQRntpv4IQqM2jA67OeRVDYgWGGVrwjkzYhg6uatkqZFLEPuEKL24nvTV9/exec";

function gasRun(funcName, ...args) {
    // ZETTBOT FIX: Interceptor untuk Mode Hybrid (Firebase Utama, GAS Cadangan)
    if (window.USE_FIREBASE && window.firebaseDB) {
        return runHybridDatabase(funcName, ...args);
    }

    return new Promise(async function(resolve, reject) {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
<!-- ... existing code ... -->
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

// ZETTBOT: Kerangka Kerja Hybrid Database
async function runHybridDatabase(funcName, ...args) {
    try {
        console.log(`🔥 Rute Firebase Aktif: Menjalankan eksekusi ${funcName}`);
        let result;

        // TODO: Nanti kita buatkan pemetaan operasi CRUD Firebase di sini
        throw new Error("Modul CRUD Firebase sedang dalam tahap pembangunan (Pending API Keys).");

        /* // -------------------------------------------------------------
        // KERANGKA BACKUP OTOMATIS KE GOOGLE SHEETS
        // Sengaja tidak di-await agar UI tidak nge-lag/freeze. 
        // Backup akan dikirim diam-diam di background.
        // -------------------------------------------------------------
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: funcName, args: args })
        }).catch(e => console.error("Backup Google Sheets Gagal:", e));
        */

        // return result;
    } catch(error) {
        console.warn("⚠️ Fallback ke Google Sheets:", error.message);
        window.USE_FIREBASE = false; // Matikan Firebase otomatis agar UI tidak error
        return gasRun(funcName, ...args); // Lempar kembali instruksi ke Google Sheets (Aman)
    }
}
