document.addEventListener('DOMContentLoaded', function() {
        if(typeof Swal !== 'undefined') {
            window.Swal = Swal.mixin({
                customClass: {
                    confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg mx-2',
                    cancelButton: 'bg-slate-400 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg mx-2',
                    actions: 'flex gap-2 justify-center mt-4 w-full'
                },
                buttonsStyling: false
            });
        }

        activeRole = 'Admin'; 
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('flex');
        
        var loader = document.getElementById('bootScreen');
        if(loader) { 
            loader.style.opacity = '0'; 
            setTimeout(function() { loader.style.display = 'none'; }, 300); 
        }

        // ZETTBOT FIX: Penjaga Global (Safety Guard) jika api.js gagal dimuat karena Syntax Error
        if (typeof gasRun === 'undefined') {
            console.error("ZETTBOT CRITICAL: gasRun tidak terdefinisi. Kemungkinan besar file api.js memiliki Syntax Error sehingga gagal dieksekusi browser.");
            Swal.fire({
                icon: 'error',
                title: 'API Crash!',
                text: 'Fungsi sistem utama (api.js) gagal dimuat karena Syntax Error. Silakan periksa Console (F12).'
            });
        }

        try {
            if(window.jQuery) {
                $('#kntJenis').select2({ width: '100%' });
                $(document).on('select2:select', '#kntJenis', function (e) { kntJenisChange(); });
                $(document).on('select2:select', '#kntDetailSelect', function (e) { kntDetailChange(); });
                $(document).on('select2:select', '#mutasiJenis', function (e) { if(window.mutasiJenisChange) window.mutasiJenisChange(); });
                // We don't need a specific mutasiVoucher listener if we bind .onchange directly, but Select2 doesn't always fire the native onchange, so let's fire it manually
                $(document).on('select2:select', '#mutasiVoucher', function (e) {
                    var el = document.getElementById('mutasiVoucher');
                    if (el && el.onchange) el.onchange();
                });

                // Fitur: Buka dropdown otomatis saat difokuskan (Tab/Klik area aktif) tanpa perlu diklik manual
                $(document).on('select2:closing', 'select', function (e) {
                    $(e.target).data("select2-closing", true);
                });
                $(document).on('select2:close', 'select', function (e) {
                    setTimeout(function() { $(e.target).removeData("select2-closing"); }, 50);
                });
                $(document).on('focus', '.select2-selection.select2-selection--single', function (e) {
                    var $select = $(this).closest(".select2-container").siblings('select:enabled');
                    if ($select.length && !$select.data('select2-closing') && !$select.data('select2').isOpen()) {
                        $select.select2('open');
                    }
                });
            }
        } catch(e) { console.error("Select2 Error:", e); }

        document.addEventListener('invalid', function(e) {
            e.preventDefault(); 
            window.isSubmittingMaster = false;
            var fieldName = "Beberapa form";
            if(e.target && e.target.previousElementSibling) {
                fieldName = e.target.previousElementSibling.innerText;
            }
            Swal.fire('Oops!', fieldName + ' wajib diisi atau dipilih!', 'warning');
        }, true); 

        switchPage('Konter', 'Konter HP');
    });

    window.updateBalances = async function(jenis, sumberDanaId, diterimaDiId, hargaBeli, hargaJual, multiplier) {
        if (!sumberDanaId || sumberDanaId === "") return;
        
        var sdData = window.BGL2_CACHE['Sumber_Dana'] || [];
        var kasirId = diterimaDiId || '';

        var sdData = window.BGL2_CACHE['Sumber_Dana'] || [];
        var kasirId = diterimaDiId || '';

        var sDocId = null, sSaldo = 0, sIdx = -1, sRow = null;
        var kDocId = null, kSaldo = 0, kIdx = -1, kRow = null;

        // Cari ID untuk Laci Kasir jika nilainya string "Laci Kasir"
        if (kasirId === 'Laci Kasir') {
            for (var j = 0; j < sdData.length; j++) {
                if (sdData[j][2] === 'Uang Tunai') {
                    kasirId = sdData[j][0];
                    break;
                }
            }
        }

        for (var i = 0; i < sdData.length; i++) {
            if (sumberDanaId && sdData[i][0] === sumberDanaId) { sIdx = i; sRow = sdData[i]; sDocId = sRow._docId; sSaldo = parseInt(String(sRow[3]||'0').replace(/[^0-9]/g, '')) || 0; }
            if (kasirId !== "" && sdData[i][0] === kasirId) { kIdx = i; kRow = sdData[i]; kDocId = kRow._docId; kSaldo = parseInt(String(kRow[3]||'0').replace(/[^0-9]/g, '')) || 0; }
        }

        // Fallback: Jika sDocId atau kDocId hilang dari cache (JSON.stringify issue), fetch dari Firebase
        if ((sRow && !sDocId) || (kRow && !kDocId)) {
            try {
                var db = firebase.firestore();
                var snapshot = await db.collection('Sumber_Dana').get();
                snapshot.forEach(doc => {
                    var idSd = doc.data().rowArray ? doc.data().rowArray[0] : null;
                    if (sRow && !sDocId && idSd === sumberDanaId) {
                        sDocId = doc.id;
                        sRow._docId = doc.id;
                    }
                    if (kRow && !kDocId && idSd === kasirId) {
                        kDocId = doc.id;
                        kRow._docId = doc.id;
                    }
                });
            } catch (e) { console.warn("Fallback query failed for updateBalances", e); }
        }

        // if sumber dana not found and NOT Jasa Transfer, do nothing
        if (!sDocId && jenis !== 'JASA TRANSFER') return;  

        // Helper function for format
        var fRupiah = (num) => "Rp " + parseInt(num).toLocaleString('id-ID').replace(/,/g, '.');

        var deltaS = 0;
        var deltaK = 0;

        if (jenis === 'JASA TRANSFER') {
            // Jasa Transfer EDC: Uang nasabah ke orang lain. Kita hanya terima biaya jasa (Profit) ke Laci Kasir
            deltaS = 0;
            deltaK = (hargaJual - hargaBeli) * multiplier;
        } else if (jenis === 'TARIK TUNAI') {
            // Customer transfer ke Sumber Dana (+ Harga Jual), kita beri Cash (- Harga Beli/Modal)
            deltaS = hargaJual * multiplier;
            deltaK = -hargaBeli * multiplier;
        } else if (jenis === 'TRANSFER') {
            // Kita transfer dari Sumber Dana (- Harga Beli/Modal), pelanggan beri Cash (+ Harga Jual)
            deltaS = -hargaBeli * multiplier;
            deltaK = hargaJual * multiplier;
        } else {
            // Jualan Digital: Sumber Dana (- Modal), Cash (+ Harga Jual)
            deltaS = -hargaBeli * multiplier;
            deltaK = hargaJual * multiplier;
        }

        // Update Sumber Dana (jika ada)
        if (sDocId) {
            sSaldo += deltaS;
            var newSRow = [...sRow]; newSRow[3] = fRupiah(sSaldo);
            await updateInFirebase('Sumber_Dana', sDocId, newSRow);
        }

        // Update Kasir (Diterima Di)
        if (kDocId && kDocId !== sDocId && kasirId !== "") {
            kSaldo += deltaK;
            var newKRow = [...kRow]; newKRow[3] = fRupiah(kSaldo);
            await updateInFirebase('Sumber_Dana', kDocId, newKRow);
        }
    };

    window.adjustStock = async function(jenis, detail, amount) {
        if (!['VOUCHER', 'PERDANA', 'ACC'].includes(jenis)) return;
        
        let targetSheet = '';
        if (jenis === 'VOUCHER') targetSheet = 'Voucher';
        else if (jenis === 'PERDANA') targetSheet = 'Perdana';
        else if (jenis === 'ACC') targetSheet = 'ACC';
        
        if (targetSheet) {
            let sheetData = window.BGL2_CACHE[targetSheet] || [];
            let itemIndex = sheetData.findIndex(row => row[2] === detail);
            if (itemIndex > -1) {
                let currentStok = parseInt(sheetData[itemIndex][5]) || 0;
                let newStok = currentStok + amount;
                if (newStok < 0) newStok = 0; 
                
                sheetData[itemIndex][5] = newStok;
                window.BGL2_CACHE[targetSheet] = sheetData;
                if(window.saveCacheToLocal) window.saveCacheToLocal();
                
                var docId = sheetData[itemIndex]._docId;
                if (!docId) {
                    try {
                        var idBarang = sheetData[itemIndex][0];
                        var db = firebase.firestore();
                        var snapshot = await db.collection(targetSheet).get();
                        snapshot.forEach(doc => {
                            if (doc.data().rowArray && doc.data().rowArray[0] === idBarang) {
                                docId = doc.id;
                                sheetData[itemIndex]._docId = doc.id;
                            }
                        });
                    } catch (e) { console.warn("Fallback docId query failed for adjustStock", e); }
                }

                if (docId) {
                    updateInFirebase(targetSheet, docId, sheetData[itemIndex]).catch(e => console.log("Gagal update stok Firebase", e));
                } else {
                    console.error("Critical: docId not found for adjustStock even after fallback", targetSheet, detail);
                }

                if(typeof gasRun !== 'undefined') {
                    gasRun('updateData', targetSheet, itemIndex, sheetData[itemIndex]).catch(e => console.log("Gagal update stok GS", e));
                }
            }
        }
    };

    // ZETTBOT FIX: Fungsi Perhitungan Margin Ultra-Robust (Anti Pergeseran Kolom & Typo)
    function calculateDynamicMargin(layananName, nominal) {
        var marginData = window.BGL2_CACHE['Pengaturan_Margin'] || [];
        var validRules = [];
        var safeLayanan = String(layananName || '').trim().toUpperCase();

        for (var i = 0; i < marginData.length; i++) {
            var row = marginData[i];
            if (!row || !row[0]) continue;
            
            // Coba dapatkan string layanan dari kolom 2 (Layanan Terkait)
            var layananDiDB = String(row[2] || '').toUpperCase();
            var layanans = layananDiDB.split(',').map(s => s.trim());
            
            // Pencarian aman (exact match)
            var isLayananMatch = layanans.some(function(l) { 
                return l !== "" && l === safeLayanan; 
            });

            if (isLayananMatch) {
                // Konversi seluruh baris ke huruf kecil untuk inspeksi cerdas
                var rowStr = row.join('|||').toLowerCase();
                var isPersentase = rowStr.includes('persen');
                
                var minNom = 0;
                var maxNom = Infinity;
                var pct = 0;
                var marginNom = 0;
                
                if (row[3]) minNom = parseInt(String(row[3]).replace(/[^0-9]/g, '')) || 0;
                
                if (isPersentase) {
                    // BRUTE-FORCE PARSING: Cari nilai desimal persentase di kolom 4 atau 5 secara berurutan
                    var col4 = String(row[4] || '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
                    var col5 = String(row[5] || '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
                    pct = parseFloat(col5) || parseFloat(col4) || 0;
                } else {
                    if (row[4] && String(row[4]).trim() !== '') {
                        maxNom = parseInt(String(row[4]).replace(/[^0-9]/g, '')) || Infinity;
                    }
                    if (row[6]) marginNom = parseInt(String(row[6]).replace(/[^0-9]/g, '')) || 0;
                    else if (row[5]) marginNom = parseInt(String(row[5]).replace(/[^0-9]/g, '')) || 0; // Fallback lama
                }
                
                validRules.push({
                    isPersentase: isPersentase,
                    minNom: minNom,
                    maxNom: maxNom,
                    pct: pct,
                    marginNom: marginNom
                });
            }
        }
        
        // Urutkan dari syarat Nominal Awal TERBESAR ke TERKECIL untuk memastikan Tier tertinggi dievaluasi duluan
        validRules.sort(function(a, b) { return b.minNom - a.minNom; });
        
        // Evaluasi Penentuan Margin
        for (var j = 0; j < validRules.length; j++) {
            var rule = validRules[j];
            
            if (rule.isPersentase) {
                if (nominal >= rule.minNom) {
                    // Hitung persentase murni tanpa potensi bocor
                    return Math.round(nominal * (rule.pct / 100));
                }
            } else {
                if (nominal >= rule.minNom && nominal < rule.maxNom) {
                    return rule.marginNom;
                }
            }
        }
        return null; 
    }

    async function refreshActiveData(showIconLoader = false) {
        var icon = document.getElementById('refreshIcon');
        if(icon && showIconLoader) icon.classList.add('fa-spin');
        
        try {
            // ZETTBOT FIX: Mencegah error macet jika gasRun rusak
            if (typeof gasRun === 'undefined') {
                throw new Error("gasRun is not defined (Terdapat Syntax Error di file api.js)");
            }

            if(!currentConfig) currentConfig = {}; 
            var activeSheet = isKonterMode ? 'DB_konter' : currentConfig.sheet;
            
            if (activeSheet) {
                let singleData = await getFromFirebase(activeSheet);
                window.BGL2_CACHE[activeSheet] = Array.isArray(singleData) ? singleData : [];
                if(window.saveCacheToLocal) window.saveCacheToLocal();
            }

            if (!window.BGL2_CACHE['Pengaturan_Margin'] && currentSheet !== 'Margin') {
                window.BGL2_CACHE['Pengaturan_Margin'] = await getFromFirebase('Pengaturan_Margin') || [];
                if(window.saveCacheToLocal) window.saveCacheToLocal();
            }
            var hdrs = isKonterMode ? ['ID TRX', 'Tanggal', 'Jenis', 'Detail', 'Harga Jual', 'Aksi'] : (currentConfig ? currentConfig.headers || [] : []);
                       
            if (isKonterMode) {
                renderKonterTable(window.BGL2_CACHE['DB_konter'], hdrs.length);
                renderMiniDashboard();
            }
            else if (currentSheet === 'Umum') {
                populateUmumSettings(window.BGL2_CACHE['Pengaturan_Umum'] || []);
            }
            else if (activeSheet) {
                renderGenericTable(window.BGL2_CACHE[activeSheet], hdrs.length);
            }
            
            filterTable();
        } catch(err) {
            console.error("Refresh failed", err);
            var tbody = document.getElementById('dataTableBody');
            if(tbody) tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-red-500 font-medium bg-red-50">Gagal memuat data: <br><span class="text-xs">' + (err.message || "Timeout Server") + '</span><br><button onclick="location.reload()" class="mt-2 text-xs bg-red-100 px-3 py-1 rounded text-red-700">Refresh Halaman</button></td></tr>';
        } finally {
            if (icon) icon.classList.remove('fa-spin');
        }
    }

    function handleLogin(e) { e.preventDefault(); }
    function logout() { sessionStorage.removeItem('bgl2_session'); location.reload(); }

    async function submitPengaturanUmum(e) {
        e.preventDefault();
        
        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        var btn = document.getElementById('btnSubmitUmum');
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...';
        
        var editIdx = parseInt(document.getElementById('umumEditIndex').value, 10);
        var arr = [
            document.getElementById('umumIdPengaturan').value,
            document.getElementById('umumNamaKonter').value,
            document.getElementById('umumAlamatKonter').value,
            document.getElementById('umumLogoBase64').value
        ];

        Swal.fire({ title: 'Memproses...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => Swal.showLoading() });
        
        try {
            if(editIdx === -1) {
                await saveToFirebase('Pengaturan_Umum', arr);
                gasRun('saveData', 'Pengaturan_Umum', arr).catch(e=>{});
            } else {
                var rowData = window.BGL2_CACHE['Pengaturan_Umum'][editIdx];
                var docId = rowData ? rowData._docId : null;
                if (!docId) throw new Error("Document ID tidak ditemukan. Harap refresh data.");
                await updateInFirebase('Pengaturan_Umum', docId, arr);
                gasRun('updateData', 'Pengaturan_Umum', editIdx, arr).catch(e=>{});
            }
            Swal.fire({title: 'Sukses', text:'Pengaturan berhasil disimpan!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false});
            refreshActiveData(false);
        } catch(err) {
            Swal.fire('Error', String(err), 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Simpan & Update Pengaturan';
        }
    }

    async function submitSmartPaste(e) {
        e.preventDefault();

        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        var btn = document.getElementById('btnSubmitPaste');
        var provider = document.getElementById('pasteProvider').value;
        var rawText = document.getElementById('pasteRawText').value;
        
        if (!provider) return Swal.fire('Oops', 'Pilih kategori terlebih dahulu!', 'warning');
        if (!rawText.trim()) return Swal.fire('Oops', 'Teks data masih kosong!', 'warning');

        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
        
        Swal.fire({ title: 'Mengekstrak Data...', text: 'Mohon tunggu.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            let payload = [];
            let lines = rawText.trim().split('\n');
            
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                let cols = line.split('\t');
                if (cols.length >= 3) {
                   let nama = cols[1].trim();
                   let hargaBeliStr = cols[2].replace(/[^0-9]/g, '');
                   let hargaBeli = parseInt(hargaBeliStr) || 0;

                   if (hargaBeli > 0 && nama !== "" && nama.toLowerCase() !== "produk") {
                       let nominalMatch = nama.match(/(\d{1,3}(?:\.\d{3})+|\d{4,})/g);
                       let nominal = 0;
                       if (nominalMatch && nominalMatch.length > 0) {
                           nominal = parseInt(nominalMatch[nominalMatch.length - 1].replace(/\./g, ''));
                       } else {
                           nominal = Math.round(hargaBeli / 5000) * 5000;
                       }

                       nama = nama.replace(/\.000/g, '').replace(/000\b/g, '').trim();

                       let dynamicMargin = calculateDynamicMargin(currentSheet, nominal);
                       let hargaJual = nominal + (dynamicMargin !== null ? dynamicMargin : (nominal >= 100000 ? 5000 : 3000));
                       
                       payload.push({ provider: provider, nama: nama, beli: hargaBeli, jual: hargaJual });
                   }
                }
            }

            if(payload.length === 0) throw new Error("Tidak ada data valid yang bisa diekstrak.");

            await batchSaveToFirebase(currentSheet, payload);
            gasRun('batchSaveScrapedData', currentSheet, payload).catch(e=>{});

            closeSmartPasteModal();
            Swal.fire({ title: 'Sukses!', html: `Berhasil memproses data ${currentSheet}.`, icon: 'success' });
            refreshActiveData(true); 
        } catch(err) { Swal.fire('Error', String(err), 'error'); } finally { btn.disabled = false; btn.innerText = "Ekstrak & Simpan Data"; }
    }

    async function submitAddKategori(e) {
        e.preventDefault();
        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        var btn = document.getElementById('btnSubmitKategori');
        var namaKat = document.getElementById('inputNamaKategori').value;
        btn.disabled = true; btn.innerText = "Menyimpan...";
        
        try {
            var newId = 'K-' + new Date().getTime().toString().slice(-6);
            await saveToFirebase('KategoriACC', [newId, namaKat]);
            gasRun('saveData', 'KategoriACC', [newId, namaKat]).catch(e=>{});
            
            localStorage.removeItem('bgl2_dropdown_cache');
            var db = await gasRun('getDropdownData');
            window.BGL2_DROPDOWN_CACHE = db;
            localStorage.setItem('bgl2_dropdown_cache', JSON.stringify(db));
            
            var sel = document.getElementById('kategori');
            if(sel) {
                var option = new Option(namaKat, namaKat, true, true);
                if(window.jQuery) $(sel).append(option).trigger('change');
            }
            
            closeAddKategoriModal();
            Swal.fire({title: 'Sukses', text: 'Kategori ditambahkan!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false});
        } catch(err) { Swal.fire('Error', String(err), 'error'); } finally { btn.disabled = false; btn.innerText = "Simpan Kategori"; }
    }

    async function submitAddProvider(e) {
        e.preventDefault();
        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        var btn = document.getElementById('btnSubmitProvider');
        var namaProv = document.getElementById('inputNamaProvider').value;
        btn.disabled = true; btn.innerText = "Menyimpan...";
        
        try {
            var newId = 'P-' + new Date().getTime().toString().slice(-6);
            await saveToFirebase('Provider', [newId, namaProv]);
            gasRun('saveData', 'Provider', [newId, namaProv]).catch(e=>{});
            
            localStorage.removeItem('bgl2_dropdown_cache');
            var db = await gasRun('getDropdownData');
            window.BGL2_DROPDOWN_CACHE = db;
            localStorage.setItem('bgl2_dropdown_cache', JSON.stringify(db));
            
            var sel = document.getElementById('provider');
            if(sel) {
                var option = new Option(namaProv, namaProv, true, true);
                if(window.jQuery) $(sel).append(option).trigger('change');
            }

            var selPaste = document.getElementById('pasteProvider');
            if(selPaste && currentSheet !== 'Game') {
                var optionPaste = new Option(namaProv, namaProv, true, true);
                if(window.jQuery) $(selPaste).append(optionPaste).trigger('change');
            }
            
            closeAddProviderModal();
            Swal.fire({title: 'Sukses', text: 'Provider ditambahkan!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false});
        } catch(err) { Swal.fire('Error', String(err), 'error'); } finally { btn.disabled = false; btn.innerText = "Simpan Provider"; }
    }

    async function submitAddKategoriGame(e) {
        e.preventDefault();
        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        var btn = document.getElementById('btnSubmitKategoriGame');
        var namaGame = document.getElementById('inputNamaKategoriGame').value;
        btn.disabled = true; btn.innerText = "Menyimpan...";
        
        try {
            var res = await gasRun('saveData', 'KategoriGame', ["", namaGame]);
            if(res && res.status === 'error') {
                if(res.message.includes('appendRow')) {
                    throw new Error("Backend Code.gs Anda belum diperbarui sepenuhnya! Tabel 'KategoriGame' belum tercetak di Spreadsheet. Silakan perbarui file Code.gs Anda.");
                }
                throw new Error(res.message);
            }
            

            localStorage.removeItem('bgl2_dropdown_cache');
            var db = await gasRun('getDropdownData');
            window.BGL2_DROPDOWN_CACHE = db;
            localStorage.setItem('bgl2_dropdown_cache', JSON.stringify(db));
            
            var sel = document.getElementById('kategori_game');
            if(sel) {
                var option = new Option(namaGame, namaGame, true, true);
                if(window.jQuery) $(sel).append(option).trigger('change');
            }

            var selPaste = document.getElementById('pasteProvider');
            if(selPaste && currentSheet === 'Game') {
                var optionPaste = new Option(namaGame, namaGame, true, true);
                if(window.jQuery) $(selPaste).append(optionPaste).trigger('change');
            }
            
            closeAddKategoriGameModal();
            Swal.fire({title: 'Sukses', text: 'Game ditambahkan!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false});
        } catch(err) { Swal.fire('Error', String(err), 'error'); } finally { btn.disabled = false; btn.innerText = "Simpan Game"; }
    }

    async function kntJenisChange() {
        var elJenis = getEl('kntJenis');
        if(!elJenis) return;
        var jenis = elJenis.value;

        var sdSection = document.getElementById('kntSumberDanaSection');
        var sdInput = document.getElementById('kntSumberDana');
        var mbSection = document.getElementById('kntMetodeBayarSection');
        var lblSd = document.getElementById('lblKntSumberDana');
        var cb = document.getElementById('kntMetodeBayar');
        var pdWrapper = document.getElementById('kntPotongDalamWrapper');

        if(sdSection) sdSection.style.display = 'block';
        if(sdInput) sdInput.required = true;
        if(mbSection) mbSection.style.display = 'block';
        if(lblSd) lblSd.innerText = 'Sumber Modal / Asal Uang';
        if(pdWrapper) {
            pdWrapper.classList.add('hidden');
            var pdCb = document.getElementById('kntPotongDalam');
            if(pdCb && pdCb.checked) { pdCb.checked = false; if(typeof togglePotongDalam === 'function') togglePotongDalam(); }
        }

        document.querySelectorAll('#kntStokWrapper').forEach(w => w.style.display = 'none');
        document.querySelectorAll('#kntNominal').forEach(n => { n.value = ''; n.readOnly = false; });
        document.querySelectorAll('#kntHargaBeliDB').forEach(b => b.value = '');
        document.querySelectorAll('#kntHargaJualDB').forEach(j => j.value = '');
        
        document.querySelectorAll('#kntDetailSection').forEach(el => el.style.display = 'block');
        document.querySelectorAll('#kntMarginSection').forEach(el => el.style.display = 'none'); 
        document.querySelectorAll('#kntMarginInput').forEach(m => m.value = ''); 

        var lblNominal = document.getElementById('lblKntNominal');
        if (lblNominal) {
            lblNominal.innerText = ['VOUCHER', 'PERDANA', 'ACC', 'PULSA', 'GAME'].includes(jenis) ? 'Harga' : 'Nominal';
        }

        if(['VOUCHER', 'PERDANA', 'ACC', 'PULSA', 'GAME', 'TOKEN PLN', 'PPOB', 'KUOTA INTERNET'].includes(jenis)) {
            if(sdSection) sdSection.style.display = 'none';
            if(sdInput) sdInput.required = false;
        }

        if(jenis === '') {
            document.querySelectorAll('#dynamicDetailContainer').forEach(container => {
                container.innerHTML = '<select id="kntDetailSelect" class="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-400 outline-none" disabled><option>-- Pilih Jenis Dulu --</option></select>';
                if(window.jQuery) $(container).find('select').select2({ width: '100%' });
            });
            return;
        }

        if(jenis === 'JASA TRANSFER') {
            document.querySelectorAll('#kntDetailSection').forEach(el => el.style.display = 'none');
            document.querySelectorAll('#dynamicDetailContainer').forEach(container => {
                container.innerHTML = '<input type="hidden" id="kntDetailInput" value="-">';
            });
            if(sdSection) sdSection.style.display = 'none';
            if(sdInput) sdInput.required = false;
            if(mbSection) mbSection.style.display = 'none';
            if(cb && cb.checked) { cb.checked = false; if(typeof toggleMetodeBayar === 'function') toggleMetodeBayar(); }
            if(pdWrapper) pdWrapper.classList.remove('hidden');
            return;
        }

        if(['TRANSFER', 'TARIK TUNAI'].includes(jenis)) {
            document.querySelectorAll('#kntDetailSection').forEach(el => el.style.display = 'none');
            document.querySelectorAll('#dynamicDetailContainer').forEach(container => {
                container.innerHTML = '<input type="hidden" id="kntDetailInput" value="-">';
            });
            if(mbSection) mbSection.style.display = 'none';
            if(cb && cb.checked) { cb.checked = false; if(typeof toggleMetodeBayar === 'function') toggleMetodeBayar(); }
            if(lblSd) lblSd.innerText = (jenis === 'TARIK TUNAI') ? 'Tujuan Akun' : 'Akun Sumber';
            if(pdWrapper && (jenis === 'TRANSFER' || jenis === 'TARIK TUNAI')) pdWrapper.classList.remove('hidden');
            return;
        }

        if(jenis === 'TOKEN PLN') {
            if(mbSection) mbSection.style.display = 'none';
            if(cb && cb.checked) { cb.checked = false; if(typeof toggleMetodeBayar === 'function') toggleMetodeBayar(); }
        }

        if(jenis === 'KUOTA INTERNET') {
            document.querySelectorAll('#kntDetailSection').forEach(el => el.style.display = 'none');
            document.querySelectorAll('#dynamicDetailContainer').forEach(container => {
                container.innerHTML = '<input type="hidden" id="kntDetailInput" value="-">';
            });
            document.querySelectorAll('#kntMarginSection').forEach(el => el.style.display = 'block');
            return;
        }

        if(jenis === 'GAME') {
            document.querySelectorAll('#dynamicDetailContainer').forEach(container => {
                container.innerHTML = '<select id="kntDetailSelect" required onchange="kntDetailChange()" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"><option value="">Memuat data...</option></select>';
                if(window.jQuery) $(container).find('select').select2({ width: '100%' });
            });
        } else {
            // ZETTBOT FIX: Mengembalikan TOKEN PLN agar dirender sebagai select (dropdown biasa) seperti menu lainnya
            document.querySelectorAll('#dynamicDetailContainer').forEach(container => {
                container.innerHTML = '<select id="kntDetailSelect" required onchange="kntDetailChange()" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"><option value="">Memuat data...</option></select>';
                if(window.jQuery) $(container).find('select').select2({ width: '100%' });
            });
        }

        try {
            var opts = [];
            
            if(jenis === 'TRANSFER' || jenis === 'TARIK TUNAI') {
                let d = window.BGL2_CACHE['Bank'];
                if(!d || d.length===0) { d = await window.getFromFirebase('Bank'); window.BGL2_CACHE['Bank'] = d; }
                opts = (d || []).filter(v => v && v[1]).map(v => `<option value="${v[1]}">${v[1]}</option>`);
            }
            else if(jenis === 'E-WALLET') {
                let d = window.BGL2_CACHE['E_Wallet'];
                if(!d || d.length===0) { d = await window.getFromFirebase('E_Wallet'); window.BGL2_CACHE['E_Wallet'] = d; }
                opts = (d || []).filter(v => v && v[0]).map(v => `<option value="${v[0]}">${v[1]}</option>`);
            }
            else if(jenis === 'PPOB') {
                let d = window.BGL2_CACHE['PPOB'];
                if(!d || d.length===0) { d = await window.getFromFirebase('PPOB'); window.BGL2_CACHE['PPOB'] = d; }
                opts = (d || []).filter(v => v && v[1]).map(v => `<option value="${v[1]}">${v[1]}</option>`);
            }
            else if(jenis === 'VOUCHER') {
                let d = window.BGL2_CACHE['Voucher'];
                if(!d || d.length===0) { d = await window.getFromFirebase('Voucher'); window.BGL2_CACHE['Voucher'] = d; }
                opts = (d || []).filter(v => v && v[2]).map(v => `<option value="${v[2]}" data-b="${String(v[3]||'').replace(/[^0-9]/g,'')}" data-j="${String(v[4]||'').replace(/[^0-9]/g,'')}" data-s="${v[5]||'0'}">${v[2]} (${v[1]})</option>`);
            }
            else if(jenis === 'PERDANA') {
                let d = window.BGL2_CACHE['Perdana'];
                if(!d || d.length===0) { d = await window.getFromFirebase('Perdana'); window.BGL2_CACHE['Perdana'] = d; }
                opts = (d || []).filter(v => v && v[2]).map(v => `<option value="${v[2]}" data-b="${String(v[3]||'').replace(/[^0-9]/g,'')}" data-j="${String(v[4]||'').replace(/[^0-9]/g,'')}" data-s="${v[5]||'0'}">${v[2]} (${v[1]})</option>`);
            }
            else if(jenis === 'ACC') {
                let d = window.BGL2_CACHE['ACC'];
                if(!d || d.length===0) { d = await window.getFromFirebase('ACC'); window.BGL2_CACHE['ACC'] = d; }
                opts = (d || []).filter(v => v && v[2]).map(v => `<option value="${v[2]}" data-b="${String(v[3]||'').replace(/[^0-9]/g,'')}" data-j="${String(v[4]||'').replace(/[^0-9]/g,'')}" data-s="${v[5]||'0'}">${v[2]} (${v[1]})</option>`);
            }
            else if(jenis === 'PULSA') {
                let d = window.BGL2_CACHE['Pulsa'];
                if(!d || d.length===0) { d = await window.getFromFirebase('Pulsa'); window.BGL2_CACHE['Pulsa'] = d; }
                opts = (d || []).filter(v => v && v[2]).map(v => `<option value="${v[2]}" data-b="${String(v[3]||'').replace(/[^0-9]/g,'')}" data-j="${String(v[4]||'').replace(/[^0-9]/g,'')}">${v[2]} (${v[1]})</option>`);
            }
            else if(jenis === 'TOKEN PLN') {
                let d = window.BGL2_CACHE['Token'];
                if(!d || d.length===0) { d = await window.getFromFirebase('Token'); window.BGL2_CACHE['Token'] = d; }
                opts = (d || []).filter(v => v && v[1]).map(v => `<option value="${v[1]}" data-b="${String(v[2]||'').replace(/[^0-9]/g,'')}" data-j="${String(v[3]||'').replace(/[^0-9]/g,'')}">Token ${v[1]}</option>`);
            }
            else if(jenis === 'GAME') {
                let d = window.BGL2_CACHE['Game'];
                if(!d || d.length===0) { d = await window.getFromFirebase('Game'); window.BGL2_CACHE['Game'] = d; }
                opts = (d || []).filter(v => v && v[2]).map(v => `<option value="${v[2]}" data-b="${String(v[3]||'').replace(/[^0-9]/g,'')}" data-j="${String(v[4]||'').replace(/[^0-9]/g,'')}">${v[2]} (${v[1]})</option>`);
            }
            
            document.querySelectorAll('#kntDetailSelect').forEach(sel => {
                sel.innerHTML = '<option value="">-- Pilih Detail --</option>' + opts.join('');
                if(window.jQuery) $(sel).select2({ width: '100%' });
            });
        } catch(error) {
            console.error("Error Dropdown:", error);
        }
    }

    function kntDetailChange() {
        var sel = getEl('kntDetailSelect');
        if(!sel || sel.selectedIndex < 0) return;
        var opt = sel.options[sel.selectedIndex];
        
        if(opt && opt.hasAttribute('data-j')) {
            document.querySelectorAll('#kntNominal').forEach(nom => {
                nom.value = opt.getAttribute('data-j');
                window.formatRupiahUI(nom);
                nom.readOnly = true;
            });
            document.querySelectorAll('#kntHargaBeliDB').forEach(el => el.value = opt.getAttribute('data-b'));
            document.querySelectorAll('#kntHargaJualDB').forEach(el => el.value = opt.getAttribute('data-j'));
            
            if (opt.hasAttribute('data-s') && opt.getAttribute('data-s') !== "undefined" && opt.getAttribute('data-s') !== null) {
                document.querySelectorAll('#kntStokLabel').forEach(el => el.innerText = opt.getAttribute('data-s'));
                document.querySelectorAll('#kntStokWrapper').forEach(el => el.style.display = 'flex'); 
            } else {
                document.querySelectorAll('#kntStokWrapper').forEach(el => el.style.display = 'none'); 
            }
        } else {
            document.querySelectorAll('#kntNominal').forEach(nom => { nom.readOnly = false; nom.value = ''; });
            document.querySelectorAll('#kntHargaBeliDB').forEach(el => el.value = '');
            document.querySelectorAll('#kntHargaJualDB').forEach(el => el.value = '');
            document.querySelectorAll('#kntStokWrapper').forEach(el => el.style.display = 'none');
        }
    }

    window.isSubmittingKonter = false;
    async function submitKonterForm(e, formEl) {
        e.preventDefault();
        
        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        if(window.isSubmittingKonter) return;
        window.isSubmittingKonter = true;
        
        var getVal = (selector) => { var el = formEl.querySelector(selector); return el ? el.value : ''; };
        var jenisVal = getVal('#kntJenis');
        var sel = formEl.querySelector('#kntDetailSelect');
        var inp = formEl.querySelector('#kntDetailInput');
        var detailVal = '';
        
        // ZETTBOT FIX: Mengembalikan logika penarikan detail standar
        if (sel && !sel.disabled && !sel.classList.contains('hidden')) detailVal = sel.value;
        else if (inp) detailVal = inp.value;

        var nomVal = getVal('#kntNominal');
        var nominal = parseInt(nomVal.replace(/[^0-9]/g, '')) || 0;
        
        var hBeli = parseInt(String(getVal('#kntHargaBeliDB')).replace(/[^0-9]/g, '')) || 0;
        var hJual = parseInt(String(getVal('#kntHargaJualDB')).replace(/[^0-9]/g, '')) || 0;
        var marginVal = getVal('#kntMarginInput'); 

        var sdVal = getVal('#kntSumberDana');
        var methodCbx = formEl.querySelector('#kntMetodeBayar');
        var isNonTunai = methodCbx ? methodCbx.checked : false;
        var tdVal = isNonTunai ? getVal('#kntTerimaDi') : 'Laci Kasir';

        var dynamicMargin = calculateDynamicMargin(jenisVal, nominal);
        
        var isPotongDalam = formEl.querySelector('#kntPotongDalam') ? formEl.querySelector('#kntPotongDalam').checked : false;

        if (dynamicMargin !== null) {
            if (hBeli === 0) {
                if (isPotongDalam) { hBeli = nominal - dynamicMargin; hJual = nominal; }
                else { hBeli = nominal; hJual = nominal + dynamicMargin; }
            } else {
                if (isPotongDalam) { hJual = hBeli + dynamicMargin; } // Manual hBeli edge case
                else { hJual = hBeli + dynamicMargin; }
            }
        } else {
            if (jenisVal === 'JASA TRANSFER') {
                if (isPotongDalam) { hBeli = nominal - 5000; hJual = nominal; }
                else { hBeli = nominal; hJual = nominal + 5000; }
            } else if (jenisVal === 'KUOTA INTERNET') {
                var mInt = parseInt(marginVal.replace(/[^0-9]/g, '')) || 5000;
                hBeli = nominal; hJual = nominal + mInt;
            } else if (['TRANSFER', 'TARIK TUNAI', 'E-WALLET', 'PPOB', 'TOKEN PLN'].includes(jenisVal)) {
                if (hBeli === 0) { 
                    hBeli = nominal; hJual = nominal; 
                }
            }
        }

        var payload = { 
            tanggal: getVal('#kntTanggal'), 
            jenis: jenisVal, 
            detail: detailVal, 
            nominal: nomVal, 
            hargaBeliDB: hBeli, 
            hargaJualDB: hJual,
            sumberDana: sdVal,
            diterimaDi: tdVal
        };
        
        var currentIndex = parseInt(editIndex, 10); 
        closeKonterModal(); 
        Swal.fire({ title: 'Memproses...', toast: true, position: 'top-end', showConfirmButton: false, timerProgressBar: true, didOpen: () => Swal.showLoading() });

        try {
            let res;
            if(currentIndex === -1) {
                var newId = 'KNT-' + new Date().getTime().toString().slice(-6);
                var fRupiah = (num) => "Rp " + parseInt(num).toLocaleString('id-ID').replace(/,/g, '.');
                var newRow = [
                    newId, payload.tanggal, payload.jenis, payload.detail, 
                    fRupiah(payload.hargaBeliDB), fRupiah(payload.hargaJualDB), 
                    fRupiah(payload.hargaJualDB - payload.hargaBeliDB), 
                    new Date().toLocaleDateString('id-ID'),
                    payload.sumberDana, payload.diterimaDi
                ];
                
                let docRef = await saveToFirebase('DB_konter', newRow);
                
                // Optimistic UI Update
                newRow._docId = docRef.id;
                newRow._timestamp = Date.now();
                if(!window.BGL2_CACHE['DB_konter']) window.BGL2_CACHE['DB_konter'] = [];
                let exists = window.BGL2_CACHE['DB_konter'].findIndex(r => r[0] === newRow[0]);
                if (exists === -1) {
                    window.BGL2_CACHE['DB_konter'].push(newRow);
                } else {
                    window.BGL2_CACHE['DB_konter'][exists] = newRow;
                }
                
                // Listener Firebase akan memperbarui tabel otomatis (sebagai backup sync)
                window.adjustStock(payload.jenis, payload.detail, -1);
                
                // Execute Balance Update
                await window.updateBalances(payload.jenis, payload.sumberDana, payload.diterimaDi, payload.hargaBeliDB, payload.hargaJualDB, 1);

                // ZETTBOT FIX: Silent background sync to Google Sheet (Backup)
                payload.id_override = newId; // jika Code.gs mendukung
                gasRun('saveKonterTransaction', payload).catch(e=>console.error(e));

            } else {
                var rowData = window.BGL2_CACHE['DB_konter'][currentIndex];
                var originalId = rowData[0];
                var oldJenis = rowData[2];
                var oldDetail = rowData[3];
                var oldHBeli = parseInt(String(rowData[4]||'0').replace(/[^0-9]/g, '')) || 0;
                var oldHJual = parseInt(String(rowData[5]||'0').replace(/[^0-9]/g, '')) || 0;
                var oldSumber = rowData[8];
                var oldDiterima = rowData[9];
                var docId = rowData._docId;
                
                if (!docId) {
                    // Fallback: Cari docId berdasarkan ID TRX (originalId)
                    try {
                        let snapshot = await db.collection('DB_konter').get();
                        snapshot.forEach(doc => {
                            let data = doc.data();
                            if (data && data.rowArray && data.rowArray[0] === originalId) {
                                docId = doc.id;
                            }
                        });
                    } catch(e) {
                        console.error("Gagal fallback mencari docId", e);
                    }
                }

                if (!docId) throw new Error("Document ID tidak ditemukan. Harap refresh data.");

                var originalDate = rowData[7];
                var fRupiah = (num) => "Rp " + parseInt(num).toLocaleString('id-ID').replace(/,/g, '.');
                var updatedRow = [
                    originalId, payload.tanggal, payload.jenis, payload.detail, 
                    fRupiah(payload.hargaBeliDB), fRupiah(payload.hargaJualDB), 
                    fRupiah(payload.hargaJualDB - payload.hargaBeliDB), 
                    originalDate,
                    payload.sumberDana, payload.diterimaDi
                ];
                
                await updateInFirebase('DB_konter', docId, updatedRow);
                
                // Optimistic UI Update
                updatedRow._docId = docId;
                updatedRow._timestamp = rowData._timestamp || Date.now();
                window.BGL2_CACHE['DB_konter'][currentIndex] = updatedRow;

                // Listener Firebase akan memperbarui tabel otomatis (sebagai backup sync)
                
                if (oldJenis !== payload.jenis || oldDetail !== payload.detail) {
                    window.adjustStock(oldJenis, oldDetail, 1);
                    window.adjustStock(payload.jenis, payload.detail, -1);
                }
                
                // Revert old balance, apply new balance
                await window.updateBalances(oldJenis, oldSumber, oldDiterima, oldHBeli, oldHJual, -1);
                await window.updateBalances(payload.jenis, payload.sumberDana, payload.diterimaDi, payload.hargaBeliDB, payload.hargaJualDB, 1);

                // ZETTBOT FIX: Silent background sync to Google Sheet (Backup)
                gasRun('editKonterTransaction', currentIndex, payload, originalId).catch(e=>console.error(e));
            }
            
            if (window.saveCacheToLocal) window.saveCacheToLocal();
            if (typeof loadTableData === 'function') loadTableData(false);
            
            Swal.fire({ title: 'Tersimpan!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });

        } catch(err) { Swal.fire('Error', String(err), 'error'); } finally { window.isSubmittingKonter = false; }
    }

    window.mutasiJenisChange = function() {
        var jenis = document.getElementById('mutasiJenis').value;
        var vcSection = document.getElementById('mutasiVoucherSection');
        var tjWrapper = document.getElementById('mutasiTujuanWrapper');
        var tujuan = document.getElementById('mutasiTujuan');
        var lblNom = document.getElementById('lblMutasiNominal');

        if (jenis === 'Tembak Voucher') {
            vcSection.classList.remove('hidden');
            tjWrapper.classList.add('hidden');
            tujuan.required = false;
            tujuan.value = '';
            lblNom.innerText = 'Total Biaya Saldo (-)';
        } else {
            vcSection.classList.add('hidden');
            tjWrapper.classList.remove('hidden');
            tujuan.required = true;
            lblNom.innerText = 'Total Nominal Mutasi';
        }

        var vcSelect = document.getElementById('mutasiVoucher');
        var qtyInput = document.getElementById('mutasiQty');
        var nominalInput = document.getElementById('mutasiNominal');

        function calcVoucherCost() {
            if (!vcSelect || !qtyInput || !nominalInput) return;
            var opt = vcSelect.options[vcSelect.selectedIndex];
            if (!opt || opt.value === "") {
                nominalInput.value = '';
                return;
            }
            var hargaBeli = parseInt(opt.getAttribute('data-beli')) || 0;
            var qty = parseInt(qtyInput.value) || 0;
            
            if (hargaBeli > 0 && qty > 0) {
                nominalInput.value = (hargaBeli * qty).toString();
                window.formatRupiahUI(nominalInput);
            } else {
                nominalInput.value = '';
            }
        }

        if (jenis === 'Tembak Voucher' && vcSelect) {
            vcSelect.onchange = function() {
                var opt = vcSelect.options[vcSelect.selectedIndex];
                var txt = opt ? opt.text.toLowerCase() : '';
                var costInp = document.getElementById('mutasiFisikCost');
                if (txt.includes('xl') || txt.includes('axis')) {
                    costInp.value = '250';
                } else if (txt.includes('im3') || txt.includes('indosat') || txt.includes('tri') || txt.includes(' 3 ')) {
                    costInp.value = '600';
                } else {
                    costInp.value = '0';
                }
                window.formatRupiahUI(costInp);
                calcVoucherCost();
            };

            if (qtyInput) {
                qtyInput.oninput = calcVoucherCost;
            }
        }
    };

    window.isSubmittingMutasi = false;
    window.submitMutasiForm = async function(e, formEl) {
        e.preventDefault();
        if(window.isSubmittingMutasi) return;
        window.isSubmittingMutasi = true;

        var tanggal = document.getElementById('mutasiTanggal').value;
        var jenis = document.getElementById('mutasiJenis').value;
        var asal = document.getElementById('mutasiAsal').value;
        var tujuan = document.getElementById('mutasiTujuan').value;
        var nomInp = document.getElementById('mutasiNominal').value;
        var nominal = parseInt(nomInp.replace(/[^0-9]/g, '')) || 0;
        var ket = document.getElementById('mutasiKeterangan').value;
        
        var voucherId = document.getElementById('mutasiVoucher').value;
        var qty = parseInt(document.getElementById('mutasiQty').value) || 0;
        var fisikInp = document.getElementById('mutasiFisikCost').value;
        var fisikCost = parseInt(fisikInp.replace(/[^0-9]/g, '')) || 0;

        if (jenis === 'Tembak Voucher') {
            if (!voucherId) { Swal.fire('Oops', 'Pilih Voucher Tujuan!', 'warning'); window.isSubmittingMutasi = false; return; }
            if (qty < 1) { Swal.fire('Oops', 'Qty tidak boleh kosong!', 'warning'); window.isSubmittingMutasi = false; return; }
        }

        Swal.fire({ title: 'Memproses...', toast: true, position: 'top-end', showConfirmButton: false, timerProgressBar: true, didOpen: () => Swal.showLoading() });

        try {
            var newId = 'MT-' + new Date().getTime().toString().slice(-6);
            var fRupiah = (num) => "Rp " + parseInt(num).toLocaleString('id-ID').replace(/,/g, '.');
            
            var rowTujuan = tujuan || voucherId;
            var newRow = [
                newId, tanggal, jenis, `${asal} -> ${rowTujuan}`, ket, fRupiah(nominal), new Date().toLocaleDateString('id-ID')
            ];

            await saveToFirebase('DB_mutasi', newRow);

            if (jenis === 'Tembak Voucher') {
                var debitAsal = nominal - (fisikCost * qty);
                await window.updateBalances('TRANSFER', asal, '', debitAsal, 0, 1);
                
                var vcData = window.BGL2_CACHE['Voucher'] || [];
                var vcItem = vcData.find(v => v[2] === voucherId);
                if(vcItem) {
                    await window.adjustStock('VOUCHER', voucherId, qty);
                }
            } else {
                await window.updateBalances('TRANSFER', asal, tujuan, nominal, nominal, 1);
            }

            closeMutasiModal();
            Swal.fire({ title: 'Mutasi Berhasil!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });

        } catch(err) { 
            Swal.fire('Error', String(err), 'error'); 
        } finally { 
            window.isSubmittingMutasi = false; 
        }
    };

    async function editKonterData(origIdx) {
        try {
            var rowData = null;
            var origIdxNum = parseInt(origIdx, 10);
            for(var k=0; k<currentTableData.length; k++){
                if(currentTableData[k].originalIndex === origIdxNum) { rowData = currentTableData[k].row; break; }
            }
            if(!rowData) return;
            editIndex = origIdxNum;
            document.querySelectorAll('#kntFormTitle').forEach(el => el.innerText = 'Edit Transaksi Konter');
            document.querySelectorAll('#btnSubmitKonter').forEach(el => el.innerText = 'Update Transaksi');
            document.querySelectorAll('#kntTanggal').forEach(el => el.value = rowData[1]);
            var jenis = rowData[2];
            document.querySelectorAll('#kntJenis').forEach(elJenis => {
                elJenis.value = jenis;
                if(window.jQuery) $(elJenis).trigger('change.select2');
            });
            
            await kntJenisChange();
            
            document.querySelectorAll('#kntDetailSelect').forEach(sel => {
                if(!sel.disabled) {
                    // ZETTBOT FIX: Mengembalikan logika assign standar tanpa memecah string meteran
                    sel.value = rowData[3];
                    if(window.jQuery) $(sel).trigger('change.select2');
                    kntDetailChange(); 
                }
            });
            
            document.querySelectorAll('#kntDetailInput').forEach(inp => { inp.value = rowData[3]; });

            // ZETTBOT FIX: Memastikan Field Nominal & Harga Jual/Beli diisi dengan benar agar tidak bernilai Rp 0 saat di-update
            var isFixedPrice = ['VOUCHER', 'PERDANA', 'ACC', 'PULSA', 'GAME', 'TOKEN PLN'].includes(jenis);
            document.querySelectorAll('#kntNominal').forEach(nom => {
                var targetVal = isFixedPrice ? String(rowData[5]) : String(rowData[4]); 
                nom.value = targetVal.replace(/[^0-9]/g, '');
                window.formatRupiahUI(nom);
            });
            
            if (isFixedPrice) {
                document.querySelectorAll('#kntHargaBeliDB').forEach(el => el.value = String(rowData[4]).replace(/[^0-9]/g, ''));
                document.querySelectorAll('#kntHargaJualDB').forEach(el => el.value = String(rowData[5]).replace(/[^0-9]/g, ''));
            } else {
                document.querySelectorAll('#kntHargaBeliDB').forEach(el => el.value = '');
                document.querySelectorAll('#kntHargaJualDB').forEach(el => el.value = '');
            }

            openKonterModal();

            // Set Sumber Dana dan Terima Di (setelah modal & dropdown options dirender)
            setTimeout(() => {
                var oldSumber = rowData[8];
                var oldDiterima = rowData[9];
                
                var sdSelect = document.getElementById('kntSumberDana');
                if (sdSelect && oldSumber) {
                    sdSelect.value = oldSumber;
                    if(window.jQuery) $(sdSelect).trigger('change.select2');
                }
                
                var cb = document.getElementById('kntMetodeBayar');
                if (oldDiterima && oldDiterima !== 'Laci Kasir' && oldDiterima !== '-') {
                    if(cb && !cb.checked) { cb.checked = true; toggleMetodeBayar(); }
                    var tdSelect = document.getElementById('kntTerimaDi');
                    if (tdSelect) {
                        tdSelect.value = oldDiterima;
                        if(window.jQuery) $(tdSelect).trigger('change.select2');
                    }
                } else {
                    if(cb && cb.checked) { cb.checked = false; toggleMetodeBayar(); }
                }
            }, 400);

        } catch(err) { console.error(err); }
    }

    async function editDataGen(displayIndex) {
        try {
            var displayIdxNum = parseInt(displayIndex, 10);
            var rowData = currentTableData[displayIdxNum].row;
            if (!rowData) return;
            editIndex = currentTableData[displayIdxNum].originalIndex;
            
            await toggleForm(true); 
            
            document.querySelectorAll('#genFormTitle').forEach(el => el.innerText = 'Form Edit Data');
            document.querySelectorAll('#btnSubmitGen').forEach(el => el.innerText = 'Update Data');
            for(var i=0; i<currentConfig.fields.length; i++) {
                var f = currentConfig.fields[i];
                var el = document.getElementById(f.id);
                if(!el) continue;
                var val = rowData[i];

                if (f.type === 'select_multiple') {
                    var arrVal = val ? val.split(',').map(s => s.trim()) : [];
                    if(window.jQuery) { $(el).val(arrVal).trigger('change'); }
                } else if (f.type === 'rupiah' && val) {
                    val = val.replace(/Rp /g, '').replace(/\./g, '');
                    el.value = val; window.formatRupiahUI(el); 
                } else { 
                    el.value = val; 
                    if ((f.type === 'select' || f.type === 'select_dynamic' || f.type === 'select_dynamic_add') && window.jQuery) { $(el).trigger('change.select2'); }
                }
            }
        } catch(err) { console.error(err); }
    }

    function initGenericForm() {
        document.querySelectorAll('#dynamicForm').forEach(form => form.reset());
        if (currentConfig && currentConfig.prefix && currentConfig.fields[0] && currentConfig.fields[0].disabled) {
            var sheetData = window.BGL2_CACHE[currentConfig.sheet] || [];
            var nextNum = 1;
            if (sheetData.length > 0) {
                var maxNum = 0;
                for(var i=0; i<sheetData.length; i++) {
                    var idStr = String(sheetData[i][0] || '');
                    var parts = idStr.split('-');
                    if (parts.length > 1) {
                        var num = parseInt(parts[1]);
                        if (!isNaN(num) && num > maxNum) maxNum = num;
                    }
                }
                nextNum = maxNum + 1;
            }
            var newId = currentConfig.prefix + "-" + nextNum.toString().padStart(3, '0');
            document.querySelectorAll('#' + currentConfig.fields[0].id).forEach(el => el.value = newId);
        }
    }

    function delKonter(idx) { 
        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        Swal.fire({
            title: 'Hapus Transaksi?', text: "Data tidak bisa dikembalikan!", icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({title: 'Menghapus...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => Swal.showLoading()});
                try {
                    var safeIdx = parseInt(idx, 10);
                    var rowData = window.BGL2_CACHE['DB_konter'][safeIdx];
                    var itemId = rowData ? rowData[0] : null;
                    var delJenis = rowData ? rowData[2] : null;
                    var delDetail = rowData ? rowData[3] : null;
                    var docId = rowData ? rowData._docId : null;

                    if (!docId && itemId) {
                        try {
                            let snapshot = await db.collection('DB_konter').get();
                            snapshot.forEach(doc => {
                                let data = doc.data();
                                if (data && data.rowArray && data.rowArray[0] === itemId) docId = doc.id;
                            });
                        } catch(e) { console.error(e); }
                    }

                    if (!docId) throw new Error("Document ID tidak ditemukan. Harap refresh data.");

                    await deleteFromFirebase('DB_konter', docId); 
                    
                    if(delJenis && delDetail) window.adjustStock(delJenis, delDetail, 1);
                    
                    Swal.fire({title: 'Berhasil', icon: 'success', timer: 1500, showConfirmButton: false}); 

                    // ZETTBOT FIX: Silent background sync to Google Sheet (Backup)
                    gasRun('deleteData', 'DB_konter', safeIdx, itemId).catch(e=>{console.error("Backup Error:", e)});
                } catch(err) { Swal.fire('Error', String(err), 'error'); }
            }
        });
    }
    
    function delGen(idx, sheetKey) { 
        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        Swal.fire({title: 'Hapus?', text: "Hapus permanen!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444'}).then(async function(r) {
            if(r.isConfirmed) {
                Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                try { 
                    var safeIdx = parseInt(idx, 10);
                    var actualSheet = (currentConfig && currentConfig.sheet) ? currentConfig.sheet : (pageConfigs[sheetKey] ? pageConfigs[sheetKey].sheet : sheetKey);
                    
                    var rowData = window.BGL2_CACHE[actualSheet][safeIdx];
                    var itemId = rowData ? rowData[0] : null;
                    var docId = rowData ? rowData._docId : null;

                    if (!docId && itemId) {
                        try {
                            let snapshot = await db.collection(actualSheet).get();
                            snapshot.forEach(doc => {
                                let data = doc.data();
                                if (data && data.rowArray && data.rowArray[0] === itemId) docId = doc.id;
                            });
                        } catch(e) { console.error(e); }
                    }

                    if (!docId) throw new Error("Document ID tidak ditemukan. Harap refresh data.");

                    await deleteFromFirebase(actualSheet, docId); 
                    
                    window.BGL2_DROPDOWN_CACHE = null;
                    localStorage.removeItem('bgl2_dropdown_cache'); 
                    
                    Swal.fire({title: 'Berhasil', icon: 'success', timer: 1500, showConfirmButton: false}); 

                    // ZETTBOT FIX: Silent background sync to Google Sheet
                    gasRun('deleteData', actualSheet, safeIdx, itemId).catch(e=>{});
                } catch(err) { 
                    Swal.fire('Error', String(err), 'error'); 
                }
            }
        });
    }

    window.isSubmittingMaster = false;
    async function handleFormSubmit(e, formEl) {
        e.preventDefault();

        if (typeof gasRun === 'undefined') return Swal.fire('Error', 'API belum siap. Silakan refresh halaman.', 'error');

        if(window.isSubmittingMaster) return;
        window.isSubmittingMaster = true;
        
        var arr = [];
        for(var i=0; i<currentConfig.fields.length; i++) {
            var f = currentConfig.fields[i];
            var el = formEl.querySelector('#' + f.id);
            var v = "";
            
            if (f.type === 'select_multiple') {
                var selected = window.jQuery ? $('#' + f.id).val() : [];
                v = selected ? selected.join(', ') : '';
                
                if (f.required && v === '') {
                    Swal.fire('Perhatian', f.label + ' wajib dipilih!', 'warning');
                    window.isSubmittingMaster = false;
                    return;
                }
            } else {
                v = el ? el.value : "";
            }

            if(f.type === 'rupiah') {
                if (v.trim() !== '') {
                    arr.push("Rp " + v);
                } else {
                    arr.push(""); 
                }
            } else {
                arr.push(v);
            }
        }
        
        var currentIndex = parseInt(editIndex, 10); 
        closeGenericModal(); 
        
        Swal.fire({ title: 'Memproses...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => Swal.showLoading() });
        try {
            if(currentIndex === -1) {
                var newId = 'M-' + new Date().getTime().toString().slice(-6);
                if (currentConfig.fields[0] && currentConfig.fields[0].id.toLowerCase().includes('id')) {
                    arr[0] = newId; 
                }

                await saveToFirebase(currentConfig.sheet, arr);

                // Listener Firebase akan memperbarui tabel otomatis
                
                gasRun('saveData', currentConfig.sheet, arr).catch(e=>{});
            } else {
                var rowData = window.BGL2_CACHE[currentConfig.sheet][currentIndex];
                var docId = rowData ? rowData._docId : null;
                var itemId = rowData ? rowData[0] : null;

                if (!docId && itemId) {
                    try {
                        let snapshot = await db.collection(currentConfig.sheet).get();
                        snapshot.forEach(doc => {
                            let data = doc.data();
                            if (data && data.rowArray && data.rowArray[0] === itemId) docId = doc.id;
                        });
                    } catch(e) { console.error(e); }
                }

                if (!docId) throw new Error("Document ID tidak ditemukan. Harap refresh data.");

                await updateInFirebase(currentConfig.sheet, docId, arr);

                gasRun('updateData', currentConfig.sheet, currentIndex, arr).catch(e=>{});
            }

            Swal.fire({title: 'Sukses', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false}); 

            // Clear dropdown cache so next transaction popup gets fresh data
            window.BGL2_DROPDOWN_CACHE = null;
            localStorage.removeItem('bgl2_dropdown_cache');

        } catch(err) { Swal.fire('Error', String(err), 'error'); } finally { window.isSubmittingMaster = false; }
    }

    function closeDetailGenModal() {
        var m = document.getElementById('modalDetailGen');
        var c = document.getElementById('modalDetailGenContent');
        if(m) {
            m.classList.remove('opacity-100', 'pointer-events-auto');
            m.classList.add('opacity-0', 'pointer-events-none');
        }
        if(c) {
            c.classList.remove('scale-100');
            c.classList.add('scale-95');
        }
        if (window.popOverlayState) window.popOverlayState('modalDetailGen');
    }

    function showDetailGen(originalIndex) {
        if (!currentConfig || !window.BGL2_CACHE[currentConfig.sheet]) return;
        var r = window.BGL2_CACHE[currentConfig.sheet][originalIndex];
        if (!r) return;

        var html = '';
        for (var i = 0; i < currentConfig.headers.length - 1; i++) {
            var val = r[i] || '-';
            html += `
            <div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">${currentConfig.headers[i]}</div>
                <div class="text-sm font-medium text-slate-800 break-words">${String(val).replace(/^'/,'')}</div>
            </div>`;
        }
        document.getElementById('detailGenBody').innerHTML = html;

        var btnEdit = document.getElementById('btnEditDetailGen');
        var btnDel = document.getElementById('btnDelDetailGen');
        if(btnEdit) {
            var paginatedIndex = -1;
            if(window.currentTableData) {
                for(var j=0; j<window.currentTableData.length; j++) {
                    if(window.currentTableData[j].originalIndex === originalIndex) {
                        paginatedIndex = j; break;
                    }
                }
            }
            btnEdit.onclick = function() { closeDetailGenModal(); if(paginatedIndex > -1) editDataGen(paginatedIndex); };
        }
        if(btnDel) {
            btnDel.onclick = function() { closeDetailGenModal(); delGen(originalIndex, currentConfig.sheet); };
        }

        var m = document.getElementById('modalDetailGen');
        var c = document.getElementById('modalDetailGenContent');
        if(m) {
            m.classList.remove('opacity-0', 'pointer-events-none');
            m.classList.add('opacity-100', 'pointer-events-auto');
        }
        if(c) {
            c.classList.remove('scale-95');
            c.classList.add('scale-100');
        }
        if (window.pushOverlayState) window.pushOverlayState('modalDetailGen');
    }

    window.handleLogin = handleLogin; window.logout = logout; window.toggleSidebar = toggleSidebar; window.switchPage = switchPage; window.toggleForm = toggleForm; 
    window.openModal = openModal; window.closeModal = closeModal;
    window.openGenericModal = openGenericModal; window.closeGenericModal = closeGenericModal; window.openKonterModal = openKonterModal; window.closeKonterModal = closeKonterModal;
    window.showDetailGen = showDetailGen; window.closeDetailGenModal = closeDetailGenModal;
    window.kntJenisChange = kntJenisChange; window.kntDetailChange = kntDetailChange; window.editKonterData = editKonterData;
    window.editDataGen = editDataGen; window.initGenericForm = initGenericForm; 
    window.loadTableData = loadTableData; window.delKonter = delKonter; window.delGen = delGen;
    window.renderMiniDashboard = renderMiniDashboard; window.filterTable = filterTable;
    window.openAddKategoriModal = openAddKategoriModal; window.closeAddKategoriModal = closeAddKategoriModal; window.submitAddKategori = submitAddKategori;
    window.openAddProviderModal = openAddProviderModal; window.closeAddProviderModal = closeAddProviderModal; window.submitAddProvider = submitAddProvider;
    window.openAddKategoriGameModal = openAddKategoriGameModal; window.closeAddKategoriGameModal = closeAddKategoriGameModal; window.submitAddKategoriGame = submitAddKategoriGame;
    window.openSmartPasteModal = openSmartPasteModal; window.closeSmartPasteModal = closeSmartPasteModal; window.submitSmartPaste = submitSmartPaste;
    window.populateUmumSettings = populateUmumSettings; window.previewUmumLogo = previewUmumLogo; window.submitPengaturanUmum = submitPengaturanUmum;
