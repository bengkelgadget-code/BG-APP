    function renderMiniDashboard() {
        var dash = document.getElementById('miniDashboardKonterContainer');
        if (!dash) return;

        if (activeRole !== 'Admin' || !isKonterMode) {
            dash.classList.add('hidden'); dash.classList.remove('flex');
            return;
        }

        dash.classList.remove('hidden'); dash.classList.add('flex');

        var filterVal = document.getElementById('dashFilterPeriode') ? document.getElementById('dashFilterPeriode').value : 'harian';
        var data = window.BGL2_CACHE['DB_konter'] || [];
        
        var todayStr = new Date().toLocaleDateString('id-ID'); 
        var parts = todayStr.replace(/(^|\/)(0+)/g, '$1').trim().split('/');
        var currentDay = parseInt(parts[0]);
        var currentMonth = parseInt(parts[1]);
        var currentYear = parseInt(parts[2]);

        var totalTrx = 0; var totalProfit = 0;

        for (var i = 0; i < data.length; i++) {
            if (data[i] && Array.isArray(data[i]) && data[i].length > 6) {
                var rowDateStr = String(data[i][1]).replace(/(^|\/)(0+)/g, '$1').trim(); 
                if(!rowDateStr) continue;
                
                var rParts = rowDateStr.split('/');
                if(rParts.length < 3) continue;
                var rDay = parseInt(rParts[0]);
                var rMonth = parseInt(rParts[1]);
                var rYear = parseInt(rParts[2]);

                var match = false;
                if (filterVal === 'harian') { if (rDay === currentDay && rMonth === currentMonth && rYear === currentYear) match = true; } 
                else if (filterVal === 'bulanan') { if (rMonth === currentMonth && rYear === currentYear) match = true; }

                if (match) {
                    totalTrx++;
                    var profitStr = String(data[i][6]).replace(/[^0-9,-]/g, ''); 
                    var profitNum = parseInt(profitStr) || 0;
                    totalProfit += profitNum;
                }
            }
        }

        document.getElementById('dashTotalTrx').innerText = totalTrx;
        document.getElementById('dashTotalProfit').innerText = "Rp " + totalProfit.toLocaleString('id-ID');
        
        var lblPeriode = filterVal === 'harian' ? 'Hari Ini' : 'Bulan Ini';
        var elTrx = document.getElementById('dashLabelTrx');
        var elProf = document.getElementById('dashLabelProfit');
        if(elTrx) elTrx.innerText = 'Trx ' + lblPeriode;
        if(elProf) elProf.innerText = 'Profit ' + lblPeriode;
    }

    function filterTable() {
        var input = document.getElementById("searchInput");
        if(!input) return;
        var filter = input.value.toLowerCase();
        var tbody = document.getElementById("dataTableBody");
        if(!tbody) return;
        var trs = tbody.getElementsByTagName("tr");

        for (var i = 0; i < trs.length; i++) {
            if (trs[i].getElementsByTagName("td")[0] && trs[i].getElementsByTagName("td")[0].colSpan > 1) continue; 
            var tds = trs[i].getElementsByTagName("td");
            var showRow = false;
            for (var j = 0; j < tds.length; j++) {
                if (tds[j]) {
                    if (tds[j].innerText.toLowerCase().indexOf(filter) > -1) { showRow = true; break; }
                }
            }
            trs[i].style.display = showRow ? "" : "none";
        }
    }

    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
        document.getElementById('sidebar').classList.toggle('-translate-x-full');
        document.getElementById('sidebarOverlay').classList.toggle('opacity-0');
        document.getElementById('sidebarOverlay').classList.toggle('pointer-events-none');
    }

    function switchPage(key, title) {
        try {
            currentSheet = key;
            isKonterMode = (key === 'Konter');
            if (!isKonterMode) currentConfig = pageConfigs[key];
            else currentConfig = {};

            var spTitle = document.getElementById('sidebarPageTitle');
            var mpTitle = document.getElementById('mobilePageTitle');
            if(title) {
                if(spTitle) spTitle.innerText = title;
                if(mpTitle) mpTitle.innerText = title;
            }
            
            var searchInput = document.getElementById('searchInput');
            if(searchInput) searchInput.value = '';
            
            var btnPaste = document.getElementById('btnOpenPaste');
            if (btnPaste) {
                if (['Pulsa', 'Game'].includes(key)) {
                    btnPaste.classList.remove('hidden');
                } else {
                    btnPaste.classList.add('hidden');
                }
            }

            closeGenericModal();
            closeKonterModal();
            
            var tableWrapper = document.getElementById('mainTableWrapper');
            var umumSettings = document.getElementById('umumSettingsContainer');
            var dash = document.getElementById('miniDashboardKonterContainer');

            if (key === 'Umum') {
                if(tableWrapper) { tableWrapper.classList.add('hidden'); tableWrapper.classList.remove('flex'); }
                if(umumSettings) { umumSettings.classList.remove('hidden'); umumSettings.classList.add('flex'); }
                if(dash) { dash.classList.add('hidden'); dash.classList.remove('flex'); }
            } else if(isKonterMode) {
                if(tableWrapper) { tableWrapper.classList.remove('hidden'); tableWrapper.classList.add('flex'); }
                if(umumSettings) { umumSettings.classList.add('hidden'); umumSettings.classList.remove('flex'); }
                if(dash) { dash.classList.remove('hidden'); dash.classList.add('flex'); }
            } else {
                if(tableWrapper) { tableWrapper.classList.remove('hidden'); tableWrapper.classList.add('flex'); }
                if(umumSettings) { umumSettings.classList.add('hidden'); umumSettings.classList.remove('flex'); }
                if(dash) { dash.classList.add('hidden'); dash.classList.remove('flex'); }
            }
            
            loadTableData(false); 
            
            if(window.innerWidth < 768 && isSidebarOpen) toggleSidebar();
        } catch(e) { console.error(e); }
    }

    function loadTableData(forceRefresh = false) {
        try {
            var tableContainer = document.getElementById('dataTableContainer');
            var sheet = isKonterMode ? 'DB_konter' : (currentConfig ? currentConfig.sheet : null);
            
            if (currentSheet === 'Umum') {
                if (forceRefresh || !window.BGL2_CACHE[sheet] || window.BGL2_CACHE[sheet].length === 0) {
                    refreshActiveData(forceRefresh);
                } else {
                    populateUmumSettings(window.BGL2_CACHE[sheet]);
                }
                return;
            }

            if(!tableContainer) return;
            var hdrs = isKonterMode ? ['ID TRX', 'Tanggal', 'Jenis', 'Detail', 'Harga Jual', 'Aksi'] : (currentConfig ? currentConfig.headers : []);
            
            if (!hdrs || hdrs.length === 0) {
                tableContainer.innerHTML = '<table class="w-full"><tr><td class="p-8 text-center text-slate-500 italic">Silakan pilih menu.</td></tr></table>';
                return;
            }

            var html = '<table class="w-full text-left border-collapse whitespace-nowrap" id="dataTable">';
            html += '<thead class="sticky top-0 z-20 shadow-md bg-gradient-to-r from-blue-700 to-indigo-600 text-white text-sm uppercase tracking-wider">';
            html += '<tr>';
            for(var i=0; i<hdrs.length; i++) html += '<th class="py-2.5 px-4 font-bold text-center">' + hdrs[i] + '</th>';
            html += '</tr></thead><tbody class="text-sm divide-y divide-slate-100" id="dataTableBody"></tbody></table>';
            
            tableContainer.innerHTML = html;
            var tbody = document.getElementById('dataTableBody');

            if (forceRefresh || !window.BGL2_CACHE[sheet] || window.BGL2_CACHE[sheet].length === 0) {
                tbody.innerHTML = '<tr><td colspan="'+hdrs.length+'" class="p-8 text-center text-blue-500 font-medium"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i><br><span class="text-sm">Memuat Data...</span></td></tr>';
                refreshActiveData(forceRefresh);
            } else {
                if (isKonterMode) { renderKonterTable(window.BGL2_CACHE['DB_konter'] || [], hdrs.length); renderMiniDashboard(); }
                else renderGenericTable(window.BGL2_CACHE[sheet] || [], hdrs.length);
                filterTable();
            }
        } catch (e) { console.error("Tabel Error:", e); }
    }

    async function toggleForm(forceShow) {
        if (isKonterMode) {
            var m = getEl('modalKonter');
            if (forceShow === true || (m && m.classList.contains('opacity-0'))) {
                if(editIndex === -1) {
                    document.querySelectorAll('#kntTanggal').forEach(el => el.value = new Date().toLocaleDateString('id-ID'));
                    if(window.jQuery) $('select#kntJenis').val('').trigger('change.select2'); 
                }
                openKonterModal();
            } else { closeKonterModal(); }
        } 
        else {
            var mGen = getEl('modalGeneric');
            if (forceShow === true || (mGen && mGen.classList.contains('opacity-0'))) {
                
                var requireServerData = false;
                if (currentConfig && currentConfig.fields) {
                    requireServerData = currentConfig.fields.some(f => f.type === 'select_dynamic' || f.type === 'select_dynamic_add');
                }

                if (requireServerData && (!window.BGL2_DROPDOWN_CACHE || Object.keys(window.BGL2_DROPDOWN_CACHE).length === 0)) {
                    Swal.fire({ title: 'Memuat Form...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => Swal.showLoading() });
                    try {
                        var db = await gasRun('getDropdownData');
                        window.BGL2_DROPDOWN_CACHE = db;
                        localStorage.setItem('bgl2_dropdown_cache', JSON.stringify(db));
                        Swal.close();
                    } catch(e) {
                        Swal.fire('Error', 'Gagal memuat opsi form: ' + e.message, 'error');
                        return; 
                    }
                }

                buildGenHTML(window.BGL2_DROPDOWN_CACHE || {});
                if(editIndex === -1) initGenericForm();
                openGenericModal();
            } else { closeGenericModal(); }
        }
    }

    function openModal(id) { var m = getEl(id); if(m) m.classList.remove('hidden'); }
    function closeModal(id) { var m = getEl(id); if(m) m.classList.add('hidden'); }

    function openGenericModal() {
        document.querySelectorAll('#modalGeneric').forEach(m => { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); });
        document.querySelectorAll('#modalGenericContent').forEach(mc => { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); });
        document.querySelectorAll('#mainContainer').forEach(main => main.classList.add('main-active-modal'));
    }

    function closeGenericModal() {
        editIndex = -1;
        document.querySelectorAll('#dynamicForm').forEach(form => form.reset());
        document.querySelectorAll('#genFormTitle').forEach(title => title.innerText = 'Form Input');
        document.querySelectorAll('#btnSubmitGen').forEach(btn => btn.innerText = 'Simpan Data');
        
        if(window.jQuery) {
            $('#dynamicForm select').val(null).trigger('change.select2');
        }

        document.querySelectorAll('#modalGeneric').forEach(m => { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); });
        document.querySelectorAll('#modalGenericContent').forEach(mc => { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); });
        document.querySelectorAll('#mainContainer').forEach(main => main.classList.remove('main-active-modal'));
    }

    async function openSmartPasteModal() {
        var m = document.getElementById('modalSmartPaste');
        var mc = document.getElementById('modalSmartPasteContent');
        
        var lblProvider = document.getElementById('lblPasteProvider');
        if (lblProvider) {
            lblProvider.innerText = currentSheet === 'Game' ? 'Pilih Game' : 'Pilih Provider';
        }

        var btnAddPaste = document.getElementById('btnPasteAdd');
        if (btnAddPaste) {
            btnAddPaste.onclick = currentSheet === 'Game' ? openAddKategoriGameModal : openAddProviderModal;
            btnAddPaste.title = currentSheet === 'Game' ? 'Tambah Game Baru' : 'Tambah Provider Baru';
        }

        var sel = document.getElementById('pasteProvider');
        sel.innerHTML = '<option value="">Memuat...</option>';
        
        if (!window.BGL2_DROPDOWN_CACHE || !window.BGL2_DROPDOWN_CACHE.providerData) {
            Swal.fire({ title: 'Memuat Data...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => Swal.showLoading() });
            try {
                window.BGL2_DROPDOWN_CACHE = await gasRun('getDropdownData');
                localStorage.setItem('bgl2_dropdown_cache', JSON.stringify(window.BGL2_DROPDOWN_CACHE));
                Swal.close();
            } catch(e) {
                Swal.fire('Error', 'Gagal memuat data opsi', 'error');
                return;
            }
        }
        
        var provs = [];
        if (currentSheet === 'Game') {
            provs = window.BGL2_DROPDOWN_CACHE.kategoriGameData || [];
        } else {
            provs = window.BGL2_DROPDOWN_CACHE.providerData || [];
        }

        var opts = '<option value="">-- ' + (currentSheet === 'Game' ? 'Pilih Game' : 'Pilih Provider') + ' --</option>';
        provs.forEach(p => opts += `<option value="${p}">${p}</option>`);
        sel.innerHTML = opts;
        
        if(m) { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); }
        if(mc) { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); }
    }

    function closeSmartPasteModal() {
        var m = document.getElementById('modalSmartPaste');
        var mc = document.getElementById('modalSmartPasteContent');
        document.getElementById('formSmartPaste').reset();
        if(m) { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); }
        if(mc) { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); }
    }

    function populateUmumSettings(data) {
        var form = document.getElementById('formPengaturanUmum');
        if(!form) return;
        var validData = [];
        if(data && data.length > 0) {
            for (var k = data.length - 1; k >= 0; k--) {
                if(data[k] && data[k][0] !== "") { validData.push({row: data[k], originalIndex: k}); break; }
            }
        }
        
        if (validData.length > 0) {
            var row = validData[0].row;
            document.getElementById('umumEditIndex').value = validData[0].originalIndex;
            document.getElementById('umumIdPengaturan').value = row[0] || '';
            document.getElementById('umumNamaKonter').value = row[1] || '';
            document.getElementById('umumAlamatKonter').value = row[2] || '';
            document.getElementById('umumLogoBase64').value = row[3] || '';
            
            var preview = document.getElementById('umumLogoPreview');
            var icon = document.getElementById('umumLogoIcon');
            if (row[3] && row[3].trim() !== '') {
                preview.src = row[3];
                preview.classList.remove('hidden');
                icon.classList.add('hidden');
            } else {
                preview.src = '';
                preview.classList.add('hidden');
                icon.classList.remove('hidden');
            }
        } else {
            form.reset();
            document.getElementById('umumEditIndex').value = '-1';
            document.getElementById('umumIdPengaturan').value = 'PU-001';
            document.getElementById('umumLogoBase64').value = '';
            document.getElementById('umumLogoPreview').classList.add('hidden');
            document.getElementById('umumLogoIcon').classList.remove('hidden');
        }
    }

    function previewUmumLogo(input) {
        if (input.files && input.files[0]) {
            var file = input.files[0];
            if(file.size > 2000000) { Swal.fire('Oops', 'Ukuran foto terlalu besar. Maksimal 2MB', 'warning'); return; }
            
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    var maxW = 500, maxH = 500;
                    var w = img.width, h = img.height;
                    
                    if(w > h) { if(w > maxW) { h *= maxW / w; w = maxW; } } 
                    else { if(h > maxH) { w *= maxH / h; h = maxH; } }
                    
                    canvas.width = w; canvas.height = h;
                    ctx.drawImage(img, 0, 0, w, h);
                    var dataURL = canvas.toDataURL('image/jpeg', 0.8);
                    
                    document.getElementById('umumLogoBase64').value = dataURL;
                    var preview = document.getElementById('umumLogoPreview');
                    var icon = document.getElementById('umumLogoIcon');
                    preview.src = dataURL;
                    preview.classList.remove('hidden');
                    icon.classList.add('hidden');
                }
                img.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    }

    function openAddKategoriModal() {
        var m = document.getElementById('modalAddKategori');
        var mc = document.getElementById('modalAddKategoriContent');
        if(m) { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); }
        if(mc) { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); }
        setTimeout(() => document.getElementById('inputNamaKategori').focus(), 100); 
    }

    function closeAddKategoriModal() {
        var m = document.getElementById('modalAddKategori');
        var mc = document.getElementById('modalAddKategoriContent');
        document.getElementById('formAddKategori').reset();
        if(m) { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); }
        if(mc) { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); }
    }

    function openAddProviderModal() {
        var m = document.getElementById('modalAddProvider');
        var mc = document.getElementById('modalAddProviderContent');
        if(m) { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); }
        if(mc) { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); }
        setTimeout(() => document.getElementById('inputNamaProvider').focus(), 100);
    }

    function closeAddProviderModal() {
        var m = document.getElementById('modalAddProvider');
        var mc = document.getElementById('modalAddProviderContent');
        document.getElementById('formAddProvider').reset();
        if(m) { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); }
        if(mc) { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); }
    }

    function openAddKategoriGameModal() {
        var m = document.getElementById('modalAddKategoriGame');
        var mc = document.getElementById('modalAddKategoriGameContent');
        if(m) { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); }
        if(mc) { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); }
        setTimeout(() => document.getElementById('inputNamaKategoriGame').focus(), 100);
    }

    function closeAddKategoriGameModal() {
        var m = document.getElementById('modalAddKategoriGame');
        var mc = document.getElementById('modalAddKategoriGameContent');
        document.getElementById('formAddKategoriGame').reset();
        if(m) { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); }
        if(mc) { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); }
    }

    function openKonterModal() {
        document.querySelectorAll('#modalKonter').forEach(m => { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); });
        document.querySelectorAll('#modalKonterContent').forEach(mc => { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); });
        document.querySelectorAll('#mainContainer').forEach(main => main.classList.add('main-active-modal'));
    }

    function closeKonterModal() {
        editIndex = -1;
        document.querySelectorAll('#kntForm').forEach(form => form.reset());
        document.querySelectorAll('#kntFormTitle').forEach(title => title.innerText = 'Transaksi Konter');
        document.querySelectorAll('#btnSubmitKonter').forEach(btn => btn.innerText = 'Simpan Transaksi');
        
        if(window.jQuery) $('select#kntJenis').val('').trigger('change.select2');

        document.querySelectorAll('#kntDetailSection').forEach(el => el.style.display = 'block');
        document.querySelectorAll('#kntMarginSection').forEach(el => el.style.display = 'none'); 
        document.querySelectorAll('#kntMarginInput').forEach(m => m.value = ''); 

        document.querySelectorAll('#dynamicDetailContainer').forEach(container => {
            container.innerHTML = '<select id="kntDetailSelect" class="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-400 outline-none" disabled><option>-- Pilih Jenis Dulu --</option></select>';
            if(window.jQuery) $(container).find('select').select2({ width: '100%' });
        });
        
        document.querySelectorAll('#kntStokWrapper').forEach(stokWrap => stokWrap.style.display = 'none');
        
        document.querySelectorAll('#kntNominal').forEach(nom => { nom.readOnly = false; nom.value = ''; });
        document.querySelectorAll('#kntHargaBeliDB').forEach(hBeli => hBeli.value = '');
        document.querySelectorAll('#kntHargaJualDB').forEach(hJual => hJual.value = '');
        
        document.querySelectorAll('#modalKonter').forEach(m => { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); });
        document.querySelectorAll('#modalKonterContent').forEach(mc => { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); });
        document.querySelectorAll('#mainContainer').forEach(main => main.classList.remove('main-active-modal'));
    }

    function buildGenHTML(data) {
        var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">';
        for(var i=0; i<currentConfig.fields.length; i++) {
            var f = currentConfig.fields[i];
            var inputHtml = '';
            if(f.type === 'select' || f.type === 'select_dynamic' || f.type === 'select_dynamic_add' || f.type === 'select_multiple') {
                var opts = f.type !== 'select_multiple' ? '<option value="">-- Pilih --</option>' : '';
                var src = f.options || data[f.source] || [];
                for(var j=0; j<src.length; j++) opts += '<option value="'+src[j]+'">'+src[j]+'</option>';
                
                if (f.type === 'select_dynamic_add') {
                    var modalFunc = (f.id === 'provider') ? 'openAddProviderModal()' : (f.id === 'kategori_game' ? 'openAddKategoriGameModal()' : 'openAddKategoriModal()');
                    inputHtml = '<div class="flex items-center space-x-2"><select id="'+f.id+'" class="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm" '+(f.required?'required':'')+'>'+opts+'</select><button type="button" onclick="'+modalFunc+'" class="w-10 h-[42px] bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><i class="fa-solid fa-plus"></i></button></div>';
                } else if (f.type === 'select_multiple') {
                    inputHtml = '<select id="'+f.id+'" multiple="multiple" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm" '+(f.required?'required':'')+'>'+opts+'</select>';
                } else { 
                    inputHtml = '<select id="'+f.id+'" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm" '+(f.required?'required':'')+'>'+opts+'</select>'; 
                }
            } else if (f.type === 'rupiah') { 
                inputHtml = '<div class="relative"><span class="absolute left-3 top-2.5 text-sm text-slate-400 font-bold pointer-events-none">Rp</span><input type="tel" autocomplete="off" placeholder="0" id="'+f.id+'" oninput="window.formatRupiahUI(this)" class="w-full bg-white pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" '+(f.required?'required':'')+'></div>'; 
            } else if (f.type === 'textarea') { 
                inputHtml = '<textarea id="'+f.id+'" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" '+(f.required?'required':'')+' rows="3"></textarea>'; 
            } else { 
                inputHtml = '<input type="text" id="'+f.id+'" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm '+(f.disabled?'bg-slate-100 text-slate-500':'')+' outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" '+(f.required?'required':'')+' '+(f.disabled?'readonly':'')+'>'; 
            }
            
            var colSpanClass = f.type === 'select_multiple' ? 'md:col-span-2' : '';
            html += '<div class="' + colSpanClass + '"><label class="block text-xs font-semibold text-slate-700 mb-1.5">'+f.label+'</label>' + inputHtml + '</div>';
        }
        html += '</div><div class="flex justify-end pt-4 border-t border-slate-100 mt-6 space-x-3"><button type="button" onclick="closeGenericModal()" class="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg">Batal</button><button type="submit" id="btnSubmitGen" class="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm">Simpan Data</button></div>';
        
        document.querySelectorAll('#dynamicForm').forEach(form => { 
            form.innerHTML = html; 
            if(window.jQuery) {
                $(form).find('select').each(function() {
                    var isMulti = $(this).attr('multiple');
                    $(this).select2({ width: '100%', placeholder: isMulti ? '-- Pilih Layanan (Bisa lebih dari 1) --' : '' });
                });
            }
        });
    }

    function renderKonterTable(data, colCount) {
        var btnTambah = document.getElementById('btnTambahData');
        if (btnTambah) btnTambah.classList.remove('hidden');

        var tbody = document.getElementById('dataTableBody');
        if(!tbody) return;
        if(!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="'+colCount+'" class="p-8 text-center text-slate-500 italic">Belum ada data.</td></tr>'; return; }
        var reversedData = [];
        for (var k = data.length - 1; k >= 0; k--) { if(data[k] && data[k][0] !== "") reversedData.push({row: data[k], originalIndex: k}); }
        currentTableData = reversedData;
        var rowsHtml = reversedData.map(d => {
            var r = d.row; var o = d.originalIndex;
            return `<tr class="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50 transition-colors"><td class="py-1.5 px-3 font-mono font-bold text-center">${r[0]||'-'}</td><td class="py-1.5 px-3 text-center">${r[1]||'-'}</td><td class="py-1.5 px-3 font-bold text-blue-700 text-center">${r[2]||'-'}</td><td class="py-1.5 px-3 text-center">${r[3]||'-'}</td><td class="py-1.5 px-3 font-bold text-emerald-600 text-center">${r[5]||'-'}</td><td class="py-1.5 px-3 align-middle"><div class="flex space-x-1.5 justify-center"><button type="button" onclick="editKonterData(${o})" class="bg-amber-100 text-amber-700 h-7 w-7 rounded-lg flex items-center justify-center"><i class="fa-solid fa-pen-to-square text-xs"></i></button><button type="button" onclick="delKonter(${o})" class="bg-red-100 text-red-700 h-7 w-7 rounded-lg flex items-center justify-center"><i class="fa-solid fa-trash text-xs"></i></button></div></td></tr>`;
        });
        tbody.innerHTML = rowsHtml.join('');
    }

    function renderGenericTable(data, colCount) {
        var btnTambah = document.getElementById('btnTambahData');
        var tbody = document.getElementById('dataTableBody');
        
        if(!tbody || !data || data.length === 0) {
            if(btnTambah) btnTambah.classList.remove('hidden');
            if(tbody) tbody.innerHTML = '<tr><td colspan="'+colCount+'" class="p-8 text-center text-slate-500 italic">Belum ada data tersedia.</td></tr>';
            return;
        }

        var reversedData = [];
        for (var k = data.length - 1; k >= 0; k--) { if(data[k] && data[k][0] !== "") reversedData.push({row: data[k], originalIndex: k}); }
        currentTableData = reversedData;

        if (btnTambah) {
            btnTambah.classList.remove('hidden');
        }

        var rowsHtml = reversedData.map((d, i) => {
            var r = d.row; var o = d.originalIndex;
            
            var cells = '';
            for (var idx = 0; idx < currentConfig.headers.length - 1; idx++) {
                var c = r[idx] || '';
                cells += `<td class="py-1.5 px-3 text-center truncate max-w-[150px]" title="${String(c).replace(/^'/,'')}">${(currentSheet === 'Users' && idx === 1) ? '••••' : String(c).replace(/^'/,'')}</td>`;
            }

            return `<tr class="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50 transition-colors">${cells}<td class="py-1.5 px-3 align-middle"><div class="flex space-x-1.5 justify-center"><button type="button" onclick="editDataGen(${i})" class="bg-amber-100 text-amber-700 h-7 w-7 rounded-lg flex items-center justify-center"><i class="fa-solid fa-pen-to-square text-xs"></i></button><button type="button" onclick="delGen(${o}, '${currentSheet}')" class="bg-red-100 text-red-700 h-7 w-7 rounded-lg flex items-center justify-center"><i class="fa-solid fa-trash text-xs"></i></button></div></td></tr>`;
        });
        tbody.innerHTML = rowsHtml.join('');
    }

    window.formatRupiahUI = function(element) {
        var numericStr = element.value.replace(/[^0-9]/g, '');
        if(!numericStr) { 
            if(element.value !== '') element.value = ''; 
            return; 
        }
        var split = numericStr.split(','); var sisa = split[0].length % 3; var rupiah = split[0].substr(0, sisa);
        var ribuan = split[0].substr(sisa).match(/\d{3}/gi);
        if(ribuan) { var separator = sisa ? '.' : ''; rupiah += separator + ribuan.join('.'); }
        if (element.value !== rupiah) {
            element.value = rupiah;
        }
    };
