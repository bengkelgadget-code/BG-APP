    document.addEventListener('DOMContentLoaded', function() {
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
        window.BGL2_CACHE = {};
        window.BGL2_DROPDOWN_CACHE = null;

        switchPage('Konter', 'Konter HP');
    });

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
                let singleData = await gasRun('getData', activeSheet);
                window.BGL2_CACHE[activeSheet] = Array.isArray(singleData) ? singleData : [];
                if(window.saveCacheToLocal) window.saveCacheToLocal();
            }

            if (!window.BGL2_CACHE['Pengaturan_Margin'] && currentSheet !== 'Margin') {
                window.BGL2_CACHE['Pengaturan_Margin'] = await gasRun('getData', 'Pengaturan_Margin') || [];
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
                await gasRun('saveData', 'Pengaturan_Umum', arr);
            } else {
                await gasRun('updateData', 'Pengaturan_Umum', editIdx, arr);
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

            var res = await gasRun('batchSaveScrapedData', currentSheet, payload);
            if(res && res.status === 'error') {
                if(res.message.includes('appendRow')) {
                    throw new Error("Backend Code.gs Anda belum diperbarui sepenuhnya! Tabel 'KategoriGame' belum tercetak di Spreadsheet. Silakan perbarui file Code.gs Anda.");
                }
                throw new Error(res.message);
            }

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
            var res = await gasRun('saveData', 'KategoriACC', ["", namaKat]);
            if(res && res.status === 'error') throw new Error(res.message);
            
            window.BGL2_DROPDOWN_CACHE = null;
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
            var res = await gasRun('saveData', 'Provider', ["", namaProv]);
            if(res && res.status === 'error') throw new Error(res.message);
            
            window.BGL2_DROPDOWN_CACHE = null;
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
            
            window.BGL2_DROPDOWN_CACHE = null;
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
            return;
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
            if (typeof gasRun === 'undefined') throw new Error("API terganggu. gasRun not defined.");

            var db = window.BGL2_DROPDOWN_CACHE;
            if(!db || !db.providerData || typeof db.pulsaData === 'undefined') { 
                Swal.fire({ title: 'Memuat Opsi...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => Swal.showLoading() });
                db = await gasRun('getDropdownData');
                window.BGL2_DROPDOWN_CACHE = db;
                localStorage.setItem('bgl2_dropdown_cache', JSON.stringify(db));
                Swal.close();
            }
            if(!db) db = {}; 

            var opts = [];
            if(jenis === 'TRANSFER' || jenis === 'TARIK TUNAI') opts = (db.bankData || []).map(v => `<option value="${v}">${v}</option>`);
            else if(jenis === 'E-WALLET') opts = (db.ewalletData || []).map(v => `<option value="${v}">${v}</option>`);
            else if(jenis === 'PPOB') opts = (db.ppobData || []).map(v => `<option value="${v}">${v}</option>`);
            else if(jenis === 'VOUCHER') opts = (db.voucherData || []).map(v => `<option value="${v.nama}" data-b="${v.beli}" data-j="${v.jual}" data-s="${v.stok}">${v.nama} (${v.provider})</option>`);
            else if(jenis === 'PERDANA') opts = (db.perdanaData || []).map(v => `<option value="${v.nama}" data-b="${v.beli}" data-j="${v.jual}" data-s="${v.stok}">${v.nama} (${v.provider})</option>`);
            else if(jenis === 'ACC') opts = (db.accData || []).map(v => `<option value="${v.nama}" data-b="${v.beli}" data-j="${v.jual}" data-s="${v.stok}">${v.nama} (${v.kategori})</option>`);
            else if(jenis === 'PULSA') opts = (db.pulsaData || []).map(v => `<option value="${v.nama}" data-b="${v.beli}" data-j="${v.jual}">${v.nama} (${v.provider})</option>`);
            else if(jenis === 'TOKEN PLN') {
                let tData = db.tokenData;
                if (!tData) {
                    try {
                        let rawToken = window.BGL2_CACHE['Token'];
                        if(!rawToken || rawToken.length === 0) {
                            rawToken = await gasRun('getData', 'Token');
                            window.BGL2_CACHE['Token'] = rawToken;
                        }
                        tData = [];
                        for(let i=0; i<rawToken.length; i++) {
                            if(rawToken[i] && rawToken[i][0]) {
                                tData.push({ 
                                    nama: rawToken[i][1], 
                                    beli: String(rawToken[i][2]).replace(/[^0-9]/g,''), 
                                    jual: String(rawToken[i][3]).replace(/[^0-9]/g,'') 
                                });
                            }
                        }
                    } catch(e) { console.error("Gagal load data Token sementara:", e); tData = []; }
                }
                opts = tData.map(v => `<option value="${v.nama}" data-b="${v.beli}" data-j="${v.jual}">Token ${v.nama}</option>`);
            }
            else if(jenis === 'GAME') {
                let gameProd = window.BGL2_CACHE['Game'] || [];
                opts = gameProd.map(v => `<option value="${v[2]}" data-b="${String(v[3]||'').replace(/[^0-9]/g,'')}" data-j="${String(v[4]||'').replace(/[^0-9]/g,'')}">${v[2]} (${v[1]})</option>`);
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

        var dynamicMargin = calculateDynamicMargin(jenisVal, nominal);

        if (dynamicMargin !== null) {
            if (hBeli === 0) hBeli = nominal;
            hJual = hBeli + dynamicMargin;
        } else {
            if (jenisVal === 'JASA TRANSFER') {
                hBeli = nominal; hJual = nominal + 5000;
            } else if (jenisVal === 'KUOTA INTERNET') {
                var mInt = parseInt(marginVal.replace(/[^0-9]/g, '')) || 5000;
                hBeli = nominal; hJual = nominal + mInt;
            } else if (['TRANSFER', 'TARIK TUNAI', 'E-WALLET', 'PPOB', 'TOKEN PLN'].includes(jenisVal)) {
                if (hBeli === 0) { hBeli = nominal; hJual = nominal; }
            }
        }

        var payload = { tanggal: getVal('#kntTanggal'), jenis: jenisVal, detail: detailVal, nominal: nomVal, hargaBeliDB: hBeli, hargaJualDB: hJual };
        
        var currentIndex = parseInt(editIndex, 10); 
        closeKonterModal(); 
        Swal.fire({ title: 'Memproses...', toast: true, position: 'top-end', showConfirmButton: false, timerProgressBar: true, didOpen: () => Swal.showLoading() });

        try {
            let res;
            if(currentIndex === -1) {
                res = await gasRun('saveKonterTransaction', payload);
                if (res && res.status === 'error') throw new Error(res.message);
                var fakeId = 'TRX-PENDING-' + new Date().getTime().toString().slice(-4);
                var fRupiah = (num) => "Rp " + parseInt(num).toLocaleString('id-ID').replace(/,/g, '.');
                var newRow = [fakeId, payload.tanggal, payload.jenis, payload.detail, fRupiah(payload.hargaBeliDB), fRupiah(payload.hargaJualDB), fRupiah(payload.hargaJualDB - payload.hargaBeliDB), new Date().toLocaleDateString('id-ID')];
                if (!window.BGL2_CACHE['DB_konter']) window.BGL2_CACHE['DB_konter'] = [];
                window.BGL2_CACHE['DB_konter'].push(newRow);
                if(window.saveCacheToLocal) window.saveCacheToLocal();
                window.adjustStock(payload.jenis, payload.detail, -1);
                gasRun('getData', 'DB_konter').then(d => { window.BGL2_CACHE['DB_konter'] = d; if(window.saveCacheToLocal) window.saveCacheToLocal(); loadTableData(false); }).catch(e=>console.log("Background load failed", e));
            } else {
                var originalId = window.BGL2_CACHE['DB_konter'][currentIndex][0];
                var oldJenis = window.BGL2_CACHE['DB_konter'][currentIndex][2];
                var oldDetail = window.BGL2_CACHE['DB_konter'][currentIndex][3];
                
                res = await gasRun('editKonterTransaction', currentIndex, payload, originalId);
                if (res && res.status === 'error') throw new Error(res.message);
                var originalDate = window.BGL2_CACHE['DB_konter'][currentIndex][7];
                var fRupiah = (num) => "Rp " + parseInt(num).toLocaleString('id-ID').replace(/,/g, '.');
                var updatedRow = [originalId, payload.tanggal, payload.jenis, payload.detail, fRupiah(payload.hargaBeliDB), fRupiah(payload.hargaJualDB), fRupiah(payload.hargaJualDB - payload.hargaBeliDB), originalDate];
                window.BGL2_CACHE['DB_konter'][currentIndex] = updatedRow;
                if(window.saveCacheToLocal) window.saveCacheToLocal();
                
                if (oldJenis === payload.jenis && oldDetail === payload.detail) {
                    // Item did not change, no stock adjustment needed
                } else {
                    window.adjustStock(oldJenis, oldDetail, 1);
                    window.adjustStock(payload.jenis, payload.detail, -1);
                }
            }
            Swal.fire({ title: 'Tersimpan!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            loadTableData(false); 
        } catch(err) { Swal.fire('Error', String(err), 'error'); } finally { window.isSubmittingKonter = false; }
    }

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

        Swal.fire({title: 'Hapus?', text: "Data tidak bisa balik!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444'}).then(async function(r) {
            if(r.isConfirmed) {
                Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                try { 
                    var safeIdx = parseInt(idx, 10);
                    // ZETTBOT FIX: Mendapatkan ID item (TRX-...) untuk dikirim ke API Firebase
                    var rowData = window.BGL2_CACHE['DB_konter'][safeIdx];
                    var itemId = rowData ? rowData[0] : null;
                    var delJenis = rowData ? rowData[2] : null;
                    var delDetail = rowData ? rowData[3] : null;

                    await gasRun('deleteData', 'DB_konter', safeIdx, itemId); 
                    if(window.BGL2_CACHE['DB_konter']) {
                        window.BGL2_CACHE['DB_konter'].splice(safeIdx, 1);
                        if(window.saveCacheToLocal) window.saveCacheToLocal();
                        if(delJenis && delDetail) window.adjustStock(delJenis, delDetail, 1);
                    }
                    loadTableData(false);
                    Swal.fire({title: 'Berhasil', icon: 'success', timer: 1500, showConfirmButton: false}); 
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
                    
                    // ZETTBOT FIX: Mendapatkan ID unik item untuk dikirim ke API Firebase
                    var rowData = window.BGL2_CACHE[actualSheet][safeIdx];
                    var itemId = rowData ? rowData[0] : null;

                    await gasRun('deleteData', actualSheet, safeIdx, itemId); 
                    
                    window.BGL2_DROPDOWN_CACHE = null; 
                    localStorage.removeItem('bgl2_dropdown_cache'); 
                    if(window.BGL2_CACHE[actualSheet]) {
                        window.BGL2_CACHE[actualSheet].splice(safeIdx, 1);
                        if(window.saveCacheToLocal) window.saveCacheToLocal();
                    }
                    loadTableData(false);
                    
                    Swal.fire({title: 'Berhasil', icon: 'success', timer: 1500, showConfirmButton: false}); 
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
                await gasRun('saveData', currentConfig.sheet, arr);
                if (!window.BGL2_CACHE[currentConfig.sheet]) window.BGL2_CACHE[currentConfig.sheet] = [];
                window.BGL2_CACHE[currentConfig.sheet].push(arr);
                if(window.saveCacheToLocal) window.saveCacheToLocal();
                gasRun('getData', currentConfig.sheet).then(d => { window.BGL2_CACHE[currentConfig.sheet] = d; if(window.saveCacheToLocal) window.saveCacheToLocal(); loadTableData(false); }).catch(e=>console.log(e));
            } else {
                await gasRun('updateData', currentConfig.sheet, currentIndex, arr);
                if(window.BGL2_CACHE[currentConfig.sheet] && window.BGL2_CACHE[currentConfig.sheet][currentIndex]) {
                    window.BGL2_CACHE[currentConfig.sheet][currentIndex] = arr;
                    if(window.saveCacheToLocal) window.saveCacheToLocal();
                }
            }
            window.BGL2_DROPDOWN_CACHE = null; localStorage.removeItem('bgl2_dropdown_cache');
            Swal.fire({title: 'Sukses', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false});
            loadTableData(false); 
        } catch(err) { Swal.fire('Error', String(err), 'error'); } finally { window.isSubmittingMaster = false; }
    }

    window.handleLogin = handleLogin; window.logout = logout; window.toggleSidebar = toggleSidebar; window.switchPage = switchPage; window.toggleForm = toggleForm; 
    window.openModal = openModal; window.closeModal = closeModal;
    window.openGenericModal = openGenericModal; window.closeGenericModal = closeGenericModal; window.openKonterModal = openKonterModal; window.closeKonterModal = closeKonterModal;
    window.kntJenisChange = kntJenisChange; window.kntDetailChange = kntDetailChange; window.editKonterData = editKonterData;
    window.editDataGen = editDataGen; window.initGenericForm = initGenericForm; 
    window.loadTableData = loadTableData; window.delKonter = delKonter; window.delGen = delGen;
    window.renderMiniDashboard = renderMiniDashboard; window.filterTable = filterTable;
    window.openAddKategoriModal = openAddKategoriModal; window.closeAddKategoriModal = closeAddKategoriModal; window.submitAddKategori = submitAddKategori;
    window.openAddProviderModal = openAddProviderModal; window.closeAddProviderModal = closeAddProviderModal; window.submitAddProvider = submitAddProvider;
    window.openAddKategoriGameModal = openAddKategoriGameModal; window.closeAddKategoriGameModal = closeAddKategoriGameModal; window.submitAddKategoriGame = submitAddKategoriGame;
    window.openSmartPasteModal = openSmartPasteModal; window.closeSmartPasteModal = closeSmartPasteModal; window.submitSmartPaste = submitSmartPaste;
    window.populateUmumSettings = populateUmumSettings; window.previewUmumLogo = previewUmumLogo; window.submitPengaturanUmum = submitPengaturanUmum;
