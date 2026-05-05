    const API_URL = "https://script.google.com/macros/s/AKfycbx5lbAmTXpQRntpv4IQqM2jA67OeRVDYgWGGVrwjkzYhg6uatkqZFLEPuEKL24nvTV9/exec";

    function gasRun(funcName, ...args) {
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

