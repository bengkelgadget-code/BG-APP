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
    
    var targetDate = window.currentFilterDate || new Date();
    var currentDay = targetDate.getDate();
    var currentMonth = targetDate.getMonth() + 1;
    var currentYear = targetDate.getFullYear();

    var totalTrx = 0; var totalProfit = 0;

    for (var i = 0; i < data.length; i++) {
        if (data[i] && Array.isArray(data[i]) && data[i].length > 6) {
            var rowDateStr = String(data[i][1]).replace(/(^|\/)(0+)/g, '$1').trim(); 
            if(!rowDateStr) continue;
            
            var rParts = rowDateStr.split('/');
            if(rParts.length < 3) continue;
            var rDay = parseInt(rParts[0], 10);
            var rMonth = parseInt(rParts[1], 10);
            var rYear = parseInt(rParts[2], 10);

            var match = false;
            if (filterVal === 'harian') { 
                if (rDay === currentDay && rMonth === currentMonth && rYear === currentYear) match = true; 
            } 
            else if (filterVal === 'bulanan') { 
                if (rMonth === currentMonth && rYear === currentYear) match = true; 
            }

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
    
    var isToday = new Date().toLocaleDateString('id-ID') === targetDate.toLocaleDateString('id-ID');
    var lblPeriode = filterVal === 'harian' ? (isToday ? 'Hari Ini' : 'Tgl Terpilih') : 'Bulan Ini';
    
    var elTrx = document.getElementById('dashLabelTrx');
    var elProf = document.getElementById('dashLabelProfit');
    if(elTrx) elTrx.innerText = 'Trx ' + lblPeriode;
    if(elProf) elProf.innerText = 'Profit ' + lblPeriode;
}

window.searchTimeout = null;
window.currentPageGen = 1;
window.itemsPerPageGen = 50;

function filterTable() {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(function() {
        if (!isKonterMode) {
            window.currentPageGen = 1;
            loadTableData(false); 
        } else {
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
    }, 300);
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
        var dashboardPage = document.getElementById('dashboardPageContainer');

        if (key === 'Umum') {
            if(tableWrapper) { tableWrapper.classList.add('hidden'); tableWrapper.classList.remove('flex'); }
            if(umumSettings) { umumSettings.classList.remove('hidden'); umumSettings.classList.add('flex'); }
            if(dash) { dash.classList.add('hidden'); dash.classList.remove('flex'); }
            if(dashboardPage) { dashboardPage.classList.add('hidden'); dashboardPage.classList.remove('flex'); }
        } else if (key === 'Dashboard') {
            if(tableWrapper) { tableWrapper.classList.add('hidden'); tableWrapper.classList.remove('flex'); }
            if(umumSettings) { umumSettings.classList.add('hidden'); umumSettings.classList.remove('flex'); }
            if(dash) { dash.classList.add('hidden'); dash.classList.remove('flex'); }
            if(dashboardPage) { dashboardPage.classList.remove('hidden'); dashboardPage.classList.add('flex'); }
            if(typeof window.renderDashboardPage === 'function') window.renderDashboardPage();
        } else if(isKonterMode) {
            if(tableWrapper) { tableWrapper.classList.remove('hidden'); tableWrapper.classList.add('flex'); }
            if(umumSettings) { umumSettings.classList.add('hidden'); umumSettings.classList.remove('flex'); }
            if(dash) { dash.classList.remove('hidden'); dash.classList.add('flex'); }
            if(dashboardPage) { dashboardPage.classList.add('hidden'); dashboardPage.classList.remove('flex'); }
        } else {
            if(tableWrapper) { tableWrapper.classList.remove('hidden'); tableWrapper.classList.add('flex'); }
            if(umumSettings) { umumSettings.classList.add('hidden'); umumSettings.classList.remove('flex'); }
            if(dash) { dash.classList.add('hidden'); dash.classList.remove('flex'); }
            if(dashboardPage) { dashboardPage.classList.add('hidden'); dashboardPage.classList.remove('flex'); }
        }
        if (key !== 'Dashboard') {
            loadTableData(false); 
        }

        var activeSheet = isKonterMode ? 'DB_konter' : (currentConfig ? currentConfig.sheet : null);
        if (activeSheet && typeof window.listenToCollection === 'function') {
            window.listenToCollection(activeSheet, function(d) {
                if (window.bgl2ListenerTimer) clearTimeout(window.bgl2ListenerTimer);
                window.bgl2ListenerTimer = setTimeout(() => {
                    var cleanCache = (window.BGL2_CACHE[activeSheet] || []).map(r => { var n = [...r]; delete n._docId; delete n._timestamp; return n; });
                    var cleanNew = d.map(r => { var n = [...r]; delete n._docId; delete n._timestamp; return n; });

                    if(JSON.stringify(cleanCache) !== JSON.stringify(cleanNew)) {
                        window.BGL2_CACHE[activeSheet] = d; 
                        if(window.saveCacheToLocal) window.saveCacheToLocal();
                        
                        var currentRenderedSheet = isKonterMode ? 'DB_konter' : (currentConfig ? currentConfig.sheet : null);
                        if(currentRenderedSheet === activeSheet && key !== 'Dashboard') {
                            loadTableData(false);
                        } else if (key === 'Dashboard') {
                            if(typeof window.renderDashboardPage === 'function') window.renderDashboardPage();
                        }
                    }
                }, 400); // 400ms debounce to stabilize rapid Firebase snapshot bursts
            });
        }
        
        if(window.innerWidth < 768 && isSidebarOpen) toggleSidebar();
    } catch(e) { console.error(e); }
}

function loadTableData(forceRefresh = false) {
    try {
        var tableContainer = document.getElementById('dataTableContainer');
        var sheet = isKonterMode ? 'DB_konter' : (currentConfig ? currentConfig.sheet : null);
        
        if (!isKonterMode) {
            var existingPag = document.getElementById('datePaginationWrap');
            if (existingPag) existingPag.remove();
        }

        if (currentSheet === 'Umum') {
            if (forceRefresh || !window.BGL2_CACHE[sheet] || window.BGL2_CACHE[sheet].length === 0) {
                refreshActiveData(forceRefresh);
            } else {
                populateUmumSettings(window.BGL2_CACHE[sheet]);
            }
            return;
        }

        if(!tableContainer) return;
        var hdrs = isKonterMode ? ['ID TRX', 'Tanggal', 'Jenis/Keterangan', 'Sumber/Bayar', 'Harga Jual', 'Aksi'] : (currentConfig ? currentConfig.headers : []);
        
        if (!hdrs || hdrs.length === 0) {
            tableContainer.innerHTML = '<table class="w-full"><tr><td class="p-8 text-center text-slate-500 italic">Silakan pilih menu.</td></tr></table>';
            return;
        }

        var needRebuild = false;
        if (window.lastRenderedSheet !== sheet || window.forceRebuildHeader) {
            needRebuild = true;
            window.lastRenderedSheet = sheet;
            window.forceRebuildHeader = false;
        }

        if (needRebuild || !document.getElementById('dataTableBody')) {
            var html = '<table class="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal" id="dataTable">';
            html += '<thead class="hidden md:table-header-group sticky top-0 z-30 shadow-md bg-gradient-to-r from-blue-700 to-indigo-600 text-white text-[10px] sm:text-sm uppercase tracking-wider">';
            html += '<tr>';
            for(var i=0; i<hdrs.length; i++) {
                var thClass = "py-2.5 px-0.5 sm:px-4 font-bold text-center";
                if (isKonterMode && hdrs[i] === 'ID TRX') thClass += " hidden md:table-cell";
                if (hdrs[i] === 'Aksi') thClass += " hidden md:table-cell";
                
                if (hdrs[i] !== 'Aksi') {
                    thClass += " cursor-pointer hover:bg-white/10 select-none group transition-colors";
                    var sortIcon = '<i class="fa-solid fa-sort opacity-30 group-hover:opacity-100 ml-1.5 text-[10px]"></i>';
                    
                    var sortStr = localStorage.getItem('sortState_' + sheet);
                    if(sortStr) {
                        var sortObj = JSON.parse(sortStr);
                        if(sortObj.col === i) {
                            sortIcon = sortObj.asc ? '<i class="fa-solid fa-sort-up ml-1.5 text-[12px] opacity-100 text-yellow-300"></i>' : '<i class="fa-solid fa-sort-down ml-1.5 text-[12px] opacity-100 text-yellow-300"></i>';
                        }
                    }
                    html += '<th class="' + thClass + '" onclick="sortTable(' + i + ')"><div class="flex items-center justify-center">' + hdrs[i] + sortIcon + '</div></th>';
                } else {
                    html += '<th class="' + thClass + '">' + hdrs[i] + '</th>';
                }
            }
            html += '</tr></thead><tbody class="text-[11px] sm:text-sm divide-y divide-slate-100" id="dataTableBody"></tbody></table>';
            tableContainer.innerHTML = html;
        }
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
    var mKnt = document.getElementById('modalKonter');
    var mMut = document.getElementById('modalMutasi');
    var isOpeningKonter = isKonterMode && (forceShow === true || (mKnt && mKnt.classList.contains('opacity-0')));
    var isOpeningMutasi = (currentSheet === 'Mutasi') && (forceShow === true || (mMut && mMut.classList.contains('opacity-0')));
    
    if (isOpeningKonter || isOpeningMutasi) {
        if (!window.BGL2_CACHE['Sumber_Dana'] || !window.BGL2_CACHE['Voucher']) {
            if (typeof Swal !== 'undefined') Swal.fire({ title: 'Menyiapkan Form...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => Swal.showLoading() });
            try {
                if (!window.BGL2_CACHE['Sumber_Dana']) window.BGL2_CACHE['Sumber_Dana'] = await getFromFirebase('Sumber_Dana') || [];
                if (!window.BGL2_CACHE['Voucher']) window.BGL2_CACHE['Voucher'] = await getFromFirebase('Voucher') || [];
                if (!window.BGL2_CACHE['Perdana']) window.BGL2_CACHE['Perdana'] = await getFromFirebase('Perdana') || [];
                if (!window.BGL2_CACHE['ACC']) window.BGL2_CACHE['ACC'] = await getFromFirebase('ACC') || [];
            } catch(e) { console.error("Gagal memuat cache dependensi form", e); }
            if (typeof Swal !== 'undefined') Swal.close();
        }
    }

    if (isOpeningMutasi && forceShow) {
        if (window.pushOverlayState) window.pushOverlayState('modalMutasi');
    }

    if (isKonterMode) {
        var m = mKnt || getEl('modalKonter');
        if (forceShow === true || (m && m.classList.contains('opacity-0'))) {
            if(editIndex === -1) {
                document.querySelectorAll('#kntTanggal').forEach(el => el.value = new Date().toLocaleDateString('id-ID'));
                if(window.jQuery) $('select#kntJenis').val('').trigger('change.select2'); 
            }
            openKonterModal();
        } else { closeKonterModal(); }
    } else if (currentSheet === 'Mutasi') {
        var mMut = getEl('modalMutasi');
        if (forceShow === true || (mMut && mMut.classList.contains('opacity-0'))) {
            if(editIndex === -1) {
                document.getElementById('mutasiTanggal').value = new Date().toLocaleDateString('id-ID');
                if(window.jQuery) {
                    $('select#mutasiJenis').val('').trigger('change.select2');
                    $('select#mutasiAsal').val('').trigger('change.select2');
                    $('select#mutasiTujuan').val('').trigger('change.select2');
                    $('select#mutasiVoucher').val('').trigger('change.select2');
                }
            }
            // Populasi dropdown Sumber Dana
            var sdData = window.BGL2_CACHE['Sumber_Dana'] || [];
            var sdOptions = '<option value="">-- Pilih Akun --</option>' + sdData.map(v => `<option value="${v[0]}">${v[1]}</option>`).join('');
            document.getElementById('mutasiAsal').innerHTML = sdOptions;
            document.getElementById('mutasiTujuan').innerHTML = sdOptions;

            // Populasi dropdown Voucher
            var vcData = window.BGL2_CACHE['Voucher'] || [];
            var vcOptions = '<option value="">-- Pilih Voucher --</option>' + vcData.map(v => `<option value="${v[2]}" data-beli="${String(v[3] || '').replace(/[^0-9]/g, '')}">${v[1]} - ${v[2]} (Stok: ${v[5]})</option>`).join('');
            document.getElementById('mutasiVoucher').innerHTML = vcOptions;

            if(window.jQuery) {
                $('#mutasiJenis').select2({ width: '100%' });
                $('#mutasiAsal').select2({ width: '100%' });
                $('#mutasiTujuan').select2({ width: '100%' });
                $('#mutasiVoucher').select2({ width: '100%' });
            }

            openMutasiModal();
        } else { closeMutasiModal(); }
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

window.openMutasiModal = function() {
    document.querySelectorAll('#modalMutasi').forEach(m => { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); });
    document.querySelectorAll('#modalMutasiContent').forEach(mc => { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); });
    document.querySelectorAll('#mainContainer').forEach(main => main.classList.add('main-active-modal'));
    setTimeout(() => { if(window.jQuery) $('#mutasiJenis').select2('open'); }, 300);
}

window.closeMutasiModal = function() {
    editIndex = -1;
    document.getElementById('mutasiForm').reset();
    document.getElementById('mutasiFormTitle').innerText = 'Form Mutasi Saldo';
    document.getElementById('btnSubmitMutasi').innerText = 'Proses Mutasi';
    if(window.jQuery) {
        $('#mutasiForm select').val(null).trigger('change.select2');
    }
    mutasiJenisChange(); // reset layout
    document.querySelectorAll('#modalMutasi').forEach(m => { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); });
    document.querySelectorAll('#modalMutasiContent').forEach(mc => { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); });
    document.querySelectorAll('#mainContainer').forEach(main => main.classList.remove('main-active-modal'));
}

function openGenericModal() {
    document.querySelectorAll('#modalGeneric').forEach(m => { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); });
    document.querySelectorAll('#modalGenericContent').forEach(mc => { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); });
    document.querySelectorAll('#mainContainer').forEach(main => main.classList.add('main-active-modal'));

    setTimeout(() => {
        var form = document.getElementById('dynamicForm');
        if(form) {
            var firstInput = form.querySelector('input:not([type="hidden"]):not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
            if(firstInput) {
                if(firstInput.tagName === 'SELECT' && window.jQuery) {
                    $(firstInput).select2('open'); 
                } else {
                    firstInput.focus(); 
                }
            }
        }
    }, 300);
}

function closeGenericModal() {
    if (window.popOverlayState) window.popOverlayState('modalGeneric');
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
    if (window.pushOverlayState) window.pushOverlayState('modalSmartPaste');
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

    setTimeout(() => { if(window.jQuery) { $('#pasteProvider').select2('open'); } }, 300);
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
    if (window.pushOverlayState) window.pushOverlayState('modalAddKategori');
    var m = document.getElementById('modalAddKategori');
    var mc = document.getElementById('modalAddKategoriContent');
    if(m) { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); }
    if(mc) { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); }
    setTimeout(() => document.getElementById('inputNamaKategori').focus(), 100); 
}

function closeAddKategoriModal() {
    if (window.popOverlayState) window.popOverlayState('modalAddKategori');
    var m = document.getElementById('modalAddKategori');
    var mc = document.getElementById('modalAddKategoriContent');
    document.getElementById('formAddKategori').reset();
    if(m) { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); }
    if(mc) { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); }
}

function openAddProviderModal() {
    if (window.pushOverlayState) window.pushOverlayState('modalAddProvider');
    var m = document.getElementById('modalAddProvider');
    var mc = document.getElementById('modalAddProviderContent');
    if(m) { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); }
    if(mc) { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); }
    setTimeout(() => document.getElementById('inputNamaProvider').focus(), 100);
}

function closeAddProviderModal() {
    if (window.popOverlayState) window.popOverlayState('modalAddProvider');
    var m = document.getElementById('modalAddProvider');
    var mc = document.getElementById('modalAddProviderContent');
    document.getElementById('formAddProvider').reset();
    if(m) { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); }
    if(mc) { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); }
}

function openAddKategoriGameModal() {
    if (window.pushOverlayState) window.pushOverlayState('modalAddKategoriGame');
    var m = document.getElementById('modalAddKategoriGame');
    var mc = document.getElementById('modalAddKategoriGameContent');
    if(m) { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); }
    if(mc) { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); }
    setTimeout(() => document.getElementById('inputNamaKategoriGame').focus(), 100);
}

function closeAddKategoriGameModal() {
    if (window.popOverlayState) window.popOverlayState('modalAddKategoriGame');
    var m = document.getElementById('modalAddKategoriGame');
    var mc = document.getElementById('modalAddKategoriGameContent');
    document.getElementById('formAddKategoriGame').reset();
    if(m) { m.classList.remove('opacity-100', 'pointer-events-auto'); m.classList.add('opacity-0', 'pointer-events-none'); }
    if(mc) { mc.classList.remove('scale-100'); mc.classList.add('scale-95'); }
}

function openKonterModal() {
    if (window.pushOverlayState) window.pushOverlayState('modalKonter');
    document.querySelectorAll('#modalKonter').forEach(m => { m.classList.remove('opacity-0', 'pointer-events-none'); m.classList.add('opacity-100', 'pointer-events-auto'); });
    document.querySelectorAll('#modalKonterContent').forEach(mc => { mc.classList.remove('scale-95'); mc.classList.add('scale-100'); });
    document.querySelectorAll('#mainContainer').forEach(main => main.classList.add('main-active-modal'));

    // Populate Sumber Dana dropdowns
    var sdData = window.BGL2_CACHE['Sumber_Dana'] || [];
    var categories = {};
    for (var i = 0; i < sdData.length; i++) {
        var row = sdData[i];
        if(!row || !row[1]) continue;
        var kat = row[2] || 'Lainnya';
        if (!categories[kat]) categories[kat] = [];
        categories[kat].push({ id: row[0], name: row[1] });
    }
    
    var htmlOpts = '<option value="">-- Pilih --</option>';
    for (var kat in categories) {
        htmlOpts += '<optgroup label="' + kat + '">';
        for(var j=0; j < categories[kat].length; j++) {
            htmlOpts += '<option value="' + categories[kat][j].id + '">' + categories[kat][j].name + '</option>';
        }
        htmlOpts += '</optgroup>';
    }

    var sdSelect = document.getElementById('kntSumberDana');
    if (sdSelect) { sdSelect.innerHTML = htmlOpts; }
    
    var tdSelect = document.getElementById('kntTerimaDi');
    if (tdSelect) { tdSelect.innerHTML = htmlOpts; }

    setTimeout(() => {
        if(window.jQuery) {
            var $kntJenis = $('#kntJenis');
            if($kntJenis.length) $kntJenis.select2('open');
            $('#kntSumberDana').select2({ width: '100%', dropdownParent: $('#modalKonter') });
            $('#kntTerimaDi').select2({ width: '100%', dropdownParent: $('#modalKonter') });
        } else {
            var jenis = document.getElementById('kntJenis');
            if(jenis) jenis.focus();
        }
    }, 300);
}

function closeKonterModal() {
    if (window.popOverlayState) window.popOverlayState('modalKonter');
    editIndex = -1;
    document.querySelectorAll('#kntForm').forEach(form => form.reset());
    document.querySelectorAll('#kntFormTitle').forEach(title => title.innerText = 'Transaksi Konter');
    document.querySelectorAll('#btnSubmitKonter').forEach(btn => btn.innerText = 'Simpan Transaksi');
    
    if(window.jQuery) {
        $('select#kntJenis').val('').trigger('change.select2');
        $('select#kntSumberDana').val('').trigger('change.select2');
        $('select#kntTerimaDi').val('').trigger('change.select2');
    } else {
        var sdSelect = document.getElementById('kntSumberDana'); if(sdSelect) sdSelect.value = '';
        var tdSelect = document.getElementById('kntTerimaDi'); if(tdSelect) tdSelect.value = '';
    }

    var cb = document.getElementById('kntMetodeBayar');
    if (cb && cb.checked) {
        cb.checked = false;
        if(typeof toggleMetodeBayar === 'function') toggleMetodeBayar();
    }

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
        } else if (f.type === 'text_pct') {
            inputHtml = '<div class="relative"><input type="text" autocomplete="off" placeholder="Cth: 0.04" id="'+f.id+'" class="w-full bg-white pr-8 pl-3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" '+(f.required?'required':'')+'><span class="absolute right-3 top-2.5 text-sm text-slate-400 font-bold pointer-events-none">%</span></div>';
        } else { 
            inputHtml = '<input type="text" id="'+f.id+'" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm '+(f.disabled?'bg-slate-100 text-slate-500':'')+' outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" '+(f.required?'required':'')+' '+(f.disabled?'readonly':'')+'>'; 
        }
        
        var colSpanClass = (f.type === 'select_multiple' || f.width === 'full') ? 'md:col-span-2' : '';
        var hiddenClass = f.hidden ? 'display: none;' : '';
        
        if (f.onChange && inputHtml.includes('<select')) {
            inputHtml = inputHtml.replace('<select', `<select onchange="${f.onChange}" `);
        }
        
        html += `<div class="${colSpanClass}" id="container_${f.id}" style="${hiddenClass}"><label class="block text-xs font-semibold text-slate-700 mb-1.5">${f.label}</label>${inputHtml}</div>`;
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

    var targetDate = window.currentFilterDate || new Date();
    var targetD = targetDate.getDate();
    var targetM = targetDate.getMonth() + 1;
    var targetY = targetDate.getFullYear();

    var filteredData = [];
    for (var k = data.length - 1; k >= 0; k--) { 
        if(data[k] && data[k][0] !== "") {
            var rowDateStr = String(data[k][1]).replace(/(^|\/)(0+)/g, '$1').trim();
            if(!rowDateStr) continue;
            var rParts = rowDateStr.split('/');
            if(rParts.length >= 3) {
                var rDay = parseInt(rParts[0], 10);
                var rMonth = parseInt(rParts[1], 10);
                var rYear = parseInt(rParts[2], 10);
                if (rDay === targetD && rMonth === targetM && rYear === targetY) {
                    filteredData.push({row: data[k], originalIndex: k});
                }
            }
        } 
    }

    var sheet = isKonterMode ? 'DB_konter' : (currentConfig ? currentConfig.sheet : null);
    var sortStr = localStorage.getItem('sortState_' + sheet);
    if (sortStr) {
        var sortObj = JSON.parse(sortStr);
        filteredData.sort(function(a, b) {
            // Map table column index to data row index
            var dataCol = sortObj.col;
            if (sortObj.col === 2) dataCol = 2; // Jenis/Keterangan -> sort by Jenis (2)
            else if (sortObj.col === 3) dataCol = 8; // Sumber/Bayar -> sort by SumberDana (8)
            else if (sortObj.col === 4) dataCol = 5; // Harga Jual -> sort by Harga Jual DB (5)

            var valA = String(a.row[dataCol] || '').toLowerCase();
            var valB = String(b.row[dataCol] || '').toLowerCase();
            
            var numA = parseInt(valA.replace(/[^0-9]/g, ''));
            var numB = parseInt(valB.replace(/[^0-9]/g, ''));
            
            if(!isNaN(numA) && !isNaN(numB) && valA.includes('rp')) {
                return sortObj.asc ? numA - numB : numB - numA;
            } else if (!isNaN(parseInt(valA)) && !isNaN(parseInt(valB)) && /^\d+$/.test(valA) && /^\d+$/.test(valB)) {
                return sortObj.asc ? parseInt(valA) - parseInt(valB) : parseInt(valB) - parseInt(valA);
            }
            
            return sortObj.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
    }

    currentTableData = filteredData;

    if(!filteredData || filteredData.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="'+colCount+'" class="p-8 text-center text-slate-500 italic font-medium">Tidak ada transaksi pada tanggal ini.</td></tr>'; 
    } else {
        var rowsHtml = filteredData.map(d => {
            var r = d.row; var o = d.originalIndex;
            
            var sumberId = r[8] || '-';
            var bayarId = r[9] || '-';
            var sumberName = sumberId;
            var bayarName = bayarId;
            
            var sdData = window.BGL2_CACHE['Sumber_Dana'] || [];
            for(var x=0; x<sdData.length; x++) {
                if(sdData[x][0] === sumberId) sumberName = sdData[x][1];
                if(sdData[x][0] === bayarId) bayarName = sdData[x][1];
            }
            if(bayarId === 'Laci Kasir') bayarName = 'Tunai';

            var jenis = r[2] || '-';
            
            if (jenis === 'TARIK TUNAI') {
                var temp = sumberName;
                sumberName = bayarName;
                bayarName = temp;
            }

            var sumberBayarHtml = `<div class="text-[9px]"><span class="font-bold text-slate-500">S:</span> ${sumberName}<br><span class="font-bold text-slate-500">B:</span> ${bayarName}</div>`;

            var detail = r[3] || '-';
            var jenisDetailHtml = (detail !== '-' && detail !== '') ? 
                `<div class="font-bold text-blue-700">${jenis}</div><div class="text-[9px] text-slate-500 mt-0.5">${detail}</div>` : 
                `<div class="font-bold text-blue-700">${jenis}</div>`;

            return `<tr class="border-b border-slate-100 text-[10px] sm:text-xs text-slate-700 hover:bg-slate-50 transition-transform duration-200 swipeable-row bg-white relative z-20" data-index="${o}" data-type="konter">
                <td class="py-2.5 px-1 sm:px-3 font-mono font-bold text-center hidden md:table-cell">${r[0]||'-'}</td>
                <td class="py-2.5 pl-0.5 pr-1 sm:px-3 text-center whitespace-normal break-words">${r[1]||'-'}</td>
                <td class="py-2.5 px-1 sm:px-3 text-center whitespace-normal break-words">${jenisDetailHtml}</td>
                <td class="py-2.5 px-1 sm:px-3 text-center whitespace-normal break-words">${sumberBayarHtml}</td>
                <td class="py-2.5 pr-0.5 pl-1 sm:px-3 font-bold text-emerald-600 text-center whitespace-normal break-words">${r[5]||'-'}</td>
                <td class="py-2.5 px-1 sm:px-3 align-middle hidden md:table-cell"><div class="flex space-x-1 sm:space-x-1.5 justify-center"><button type="button" onclick="editKonterData(${o})" class="bg-amber-100 text-amber-700 h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center active:scale-95"><i class="fa-solid fa-pen-to-square text-[10px] sm:text-xs"></i></button><button type="button" onclick="delKonter(${o})" class="bg-red-100 text-red-700 h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center active:scale-95"><i class="fa-solid fa-trash text-[10px] sm:text-xs"></i></button></div></td>
            </tr>`;
        });
        
        // ZETTBOT FIX: Memperbesar Spacer Kosong dan memaksa tinggi menggunakan inline style agar browser tidak men-collapse tabel
        rowsHtml.push(`<tr class="md:hidden"><td colspan="${colCount}" style="height: 140px; border: none;"></td></tr>`);
        
        tbody.innerHTML = rowsHtml.join('');
    }

    var wrapper = document.getElementById('mainTableWrapper');
    var existingPag = document.getElementById('datePaginationWrap');
    if (existingPag) existingPag.remove();

    var yyyy = targetDate.getFullYear();
    var mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    var dd = String(targetDate.getDate()).padStart(2, '0');
    var dateInputVal = `${yyyy}-${mm}-${dd}`;

    var options = { day: 'numeric', month: 'short', year: 'numeric' };
    var displayStr = targetDate.toLocaleDateString('id-ID', options);

    // ZETTBOT FIX: Memberikan sedikit extra padding-bottom pada kontainer navigasinya sendiri agar sedikit lebih lega
    var pagHtml = `
    <div id="datePaginationWrap" class="fixed bottom-0 left-0 right-0 md:static md:bottom-auto w-full flex justify-center items-center p-2 sm:p-3 gap-2 sm:gap-4 border-t border-slate-200 bg-white shrink-0 z-[60] shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] md:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:rounded-b-xl" style="padding-bottom: max(1rem, env(safe-area-inset-bottom));">
        <button type="button" onclick="changeFilterDate(-1)" class="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors font-bold text-xs flex items-center shadow-sm active:scale-95">
            <i class="fa-solid fa-chevron-left sm:mr-1.5"></i> <span class="hidden sm:inline">Prev</span>
        </button>
        <div class="relative flex items-center cursor-pointer bg-blue-50 border border-blue-200 rounded-lg px-4 py-1.5 hover:bg-blue-100 transition-colors shadow-sm active:scale-95" title="Pilih Tanggal" onclick="try{document.getElementById('konterDatePicker').showPicker();}catch(e){}">
            <input type="date" id="konterDatePicker" value="${dateInputVal}" onchange="setFilterDate(this.value)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
            <div class="flex items-center gap-2 font-bold text-blue-700 pointer-events-none text-xs">
                <i class="fa-solid fa-calendar-days"></i>
                <span id="dateDisplayLabel">${displayStr}</span>
            </div>
        </div>
        <button type="button" onclick="changeFilterDate(1)" class="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors font-bold text-xs flex items-center shadow-sm active:scale-95">
            <span class="hidden sm:inline">Next</span> <i class="fa-solid fa-chevron-right sm:ml-1.5"></i>
        </button>
    </div>`;

    if(wrapper) wrapper.insertAdjacentHTML('beforeend', pagHtml);
}

function renderGenericTable(data, colCount) {
    var btnTambah = document.getElementById('btnTambahData');
    var tbody = document.getElementById('dataTableBody');
    var wrapper = document.getElementById('mainTableWrapper');
    
    var existingPag = document.getElementById('genPaginationWrap');
    if (existingPag) existingPag.remove();

    if(!tbody || !data || data.length === 0) {
        if(btnTambah) btnTambah.classList.remove('hidden');
        if(tbody) tbody.innerHTML = '<tr><td colspan="'+colCount+'" class="p-8 text-center text-slate-500 italic">Belum ada data tersedia.</td></tr>';
        return;
    }

    var reversedData = [];
    for (var k = data.length - 1; k >= 0; k--) { if(data[k] && data[k][0] !== "") reversedData.push({row: data[k], originalIndex: k}); }

    var sheet = isKonterMode ? 'DB_konter' : (currentConfig ? currentConfig.sheet : null);
    var sortStr = localStorage.getItem('sortState_' + sheet);
    var isMobile = window.innerWidth < 768;
    if (sortStr && !isMobile) {
        var sortObj = JSON.parse(sortStr);
        reversedData.sort(function(a, b) {
            var valA = String(a.row[sortObj.col] || '').toLowerCase();
            var valB = String(b.row[sortObj.col] || '').toLowerCase();
            
            var numA = parseInt(valA.replace(/[^0-9]/g, ''));
            var numB = parseInt(valB.replace(/[^0-9]/g, ''));
            
            if(!isNaN(numA) && !isNaN(numB) && valA.includes('rp')) {
                return sortObj.asc ? numA - numB : numB - numA;
            } else if (!isNaN(parseInt(valA)) && !isNaN(parseInt(valB)) && /^\d+$/.test(valA) && /^\d+$/.test(valB)) {
                return sortObj.asc ? parseInt(valA) - parseInt(valB) : parseInt(valB) - parseInt(valA);
            }
            
            return sortObj.asc ? valA.localeCompare(valB, undefined, {numeric: true, sensitivity: 'base'}) : valB.localeCompare(valA, undefined, {numeric: true, sensitivity: 'base'});
        });
    } else {
        if (currentConfig && currentConfig.headers && sheet !== 'Users') {
            var idxProv = -1, idxName = -1;
            for(var h=0; h<currentConfig.headers.length; h++) {
                var lowerH = (currentConfig.headers[h] || '').toLowerCase();
                if(lowerH.includes('provider')) idxProv = h;
                if((lowerH.includes('nama') || lowerH.includes('nominal')) && idxName === -1) idxName = h;
            }
            if (idxName !== -1 && sheet !== 'Sumber_Dana') {
                reversedData.sort(function(a, b) {
                    var provA = idxProv !== -1 ? String(a.row[idxProv] || '').toLowerCase() : '';
                    var provB = idxProv !== -1 ? String(b.row[idxProv] || '').toLowerCase() : '';
                    if (provA < provB) return -1;
                    if (provA > provB) return 1;

                    var nameA = String(a.row[idxName] || '').toLowerCase();
                    var nameB = String(b.row[idxName] || '').toLowerCase();

                    if (idxProv === -1) {
                        var prefixA = nameA.replace(/[0-9].*$/, '').trim();
                        var prefixB = nameB.replace(/[0-9].*$/, '').trim();
                        if (prefixA < prefixB) return -1;
                        if (prefixA > prefixB) return 1;
                    }

                    var parseQ = function(str) {
                        var q = 0, h = 0;
                        var m = str.match(/(\d+(?:\.\d+)?)\s*(?:gb|mb|k|m|hari|hr|rb)?\s*\/\s*(\d+(?:\.\d+)?)/i);
                        if (m) { 
                            q = parseFloat(m[1]); 
                            h = parseFloat(m[2]); 
                        } else {
                            var m2 = str.match(/(?:\s|^)(\d+(?:\.\d+)?)/g);
                            if (m2 && m2.length > 0) {
                                q = parseFloat(m2[0]);
                                if (m2.length > 1) h = parseFloat(m2[1]);
                            } else {
                                var m3 = str.match(/\d+(?:\.\d+)?/g);
                                if (m3) q = parseFloat(m3[m3.length > 1 ? 1 : 0]);
                            }
                        }
                        return {q: q || 0, h: h || 0};
                    };

                    var pA = parseQ(nameA);
                    var pB = parseQ(nameB);

                    if (pA.q !== pB.q) return pA.q - pB.q;
                    if (pA.h !== pB.h) return pA.h - pB.h;

                    return nameA.localeCompare(nameB, undefined, {numeric: true, sensitivity: 'base'});
                });
            }
        }
    }

    var input = document.getElementById("searchInput");
    var filterText = (input ? input.value.toLowerCase() : "");
    if(filterText !== "") {
        reversedData = reversedData.filter(function(item) {
            return item.row.some(function(cell) {
                return String(cell).toLowerCase().indexOf(filterText) > -1;
            });
        });
    }

    if (btnTambah) {
        btnTambah.classList.remove('hidden');
    }

    var totalPages = Math.ceil(reversedData.length / window.itemsPerPageGen) || 1;
    if (window.currentPageGen > totalPages) window.currentPageGen = totalPages;
    if (window.currentPageGen < 1) window.currentPageGen = 1;
    
    var startIndex = (window.currentPageGen - 1) * window.itemsPerPageGen;
    var paginatedData = reversedData.slice(startIndex, startIndex + window.itemsPerPageGen);
    
    currentTableData = paginatedData; 

    if (paginatedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="p-8 text-center text-slate-500 italic">Data tidak ditemukan.</td></tr>`;
        return;
    }

    var rowsHtml = paginatedData.map((d, i) => {
        var r = d.row; var o = d.originalIndex;
        var cells = '';

        var isMargin = (currentSheet === 'Margin' || (currentConfig && currentConfig.sheet === 'Pengaturan_Margin'));

        if (isMargin) {
            var fMap = {};
            if (currentConfig && currentConfig.fields) {
                for (var fi = 0; fi < currentConfig.fields.length; fi++) {
                    fMap[currentConfig.fields[fi].id] = r[fi] || '';
                }
            }
            
            var idVal = r[0] || '';
            var tipeVal = fMap['tipe_margin'] || r[1] || '';
            var layananVal = fMap['layanan_margin'] || r[2] || '';
            var minVal = fMap['min_nom'] || r[3] || '';
            var akhirVal = fMap['max_nom'] || r[4] || '';
            var pctVal = fMap['persentase_val'] || r[5] || '';
            var marginVal = fMap['val_margin'] || r[6] || '';

            var displayAkhirPct = tipeVal === 'Persentase' ? pctVal : akhirVal;
            var displayKeuntungan = tipeVal === 'Persentase' ? '-' : marginVal;

            if (r.length < 7 && tipeVal !== 'Persentase') {
                displayAkhirPct = r[4] || '';
                displayKeuntungan = r[5] || '';
            }

            cells += `<td class="py-1.5 px-3 text-center truncate max-w-[150px] hidden md:table-cell">${idVal}</td>`;
            cells += `<td class="py-1.5 px-3 text-center truncate max-w-[150px] hidden md:table-cell">${tipeVal}</td>`;
            cells += `<td class="py-1.5 px-3 text-center truncate max-w-[150px] hidden md:table-cell" title="${layananVal}">${layananVal}</td>`;
            cells += `<td class="py-1.5 px-3 text-center truncate max-w-[150px] hidden md:table-cell">${minVal}</td>`;
            cells += `<td class="py-1.5 px-3 text-center truncate max-w-[150px] hidden md:table-cell">${displayAkhirPct}</td>`;
            cells += `<td class="py-1.5 px-3 text-center font-bold text-emerald-600 truncate max-w-[150px] hidden md:table-cell">${displayKeuntungan}</td>`;

            cells += `<td colspan="7" class="md:hidden p-1.5 sm:p-2 border-0" onclick="if(window.isSwipingMode)return; showDetailGen(${o})">
                <div class="p-3 w-full flex justify-between items-center bg-white border border-slate-200 shadow-sm rounded-xl">
                    <div class="flex-1 pr-2">
                        <div class="font-bold text-xs text-slate-800 break-words whitespace-normal leading-tight">${tipeVal} - ${layananVal}</div>
                        <div class="text-[10px] text-slate-500 mt-1">Range: <span class="font-bold text-slate-700">${minVal} s/d ${displayAkhirPct}</span></div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-xs font-bold text-emerald-600">${displayKeuntungan}</div>
                    </div>
                </div>
            </td>`;

        } else {
            for (var idx = 0; idx < currentConfig.headers.length - 1; idx++) {
                var c = r[idx] || '';
                cells += `<td class="py-1.5 px-0.5 sm:px-3 text-center truncate max-w-[150px] hidden md:table-cell" title="${String(c).replace(/^'/,'')}">${(currentSheet === 'Users' && idx === 1) ? '••••' : String(c).replace(/^'/,'')}</td>`;
            }

            var idxName = -1, idxBeli = -1, idxJual = -1, idxStok = -1;
            for (var h = 0; h < currentConfig.headers.length - 1; h++) {
                var lowerH = currentConfig.headers[h].toLowerCase();
                if (lowerH.includes('nama') || lowerH.includes('nominal') || lowerH.includes('provider')) idxName = h;
                if (lowerH.includes('beli')) idxBeli = h;
                if (lowerH.includes('jual')) idxJual = h;
                if (lowerH.includes('stok')) idxStok = h;
                if (lowerH.includes('saldo') && idxStok === -1) idxStok = h; 
            }

            var nameVal = idxName !== -1 ? r[idxName] : (r[1] || r[2] || '-');
            if (currentConfig.headers[idxName] && currentConfig.headers[idxName].toLowerCase() === 'provider' && r[idxName+1]) {
                nameVal = r[idxName] + ' ' + r[idxName+1]; 
            }

            var beliVal = idxBeli !== -1 ? r[idxBeli] : '';
            var jualVal = idxJual !== -1 ? r[idxJual] : '';
            var stokVal = idxStok !== -1 ? r[idxStok] : '';

            var cardHtml = `
            <td colspan="${currentConfig.headers.length}" class="md:hidden p-1.5 sm:p-2 border-0" onclick="if(window.isSwipingMode)return; showDetailGen(${o})">
                <div class="p-3 w-full flex justify-between items-center bg-white border border-slate-200 shadow-sm rounded-xl">
                    <div class="flex-1 pr-2">
                        <div class="font-bold text-xs text-slate-800 break-words whitespace-normal leading-tight">${String(nameVal).replace(/^'/,'')}</div>
                        ${stokVal ? `<div class="text-[10px] text-slate-500 mt-1">${idxStok !== -1 && currentConfig.headers[idxStok].toLowerCase().includes('saldo') ? 'Saldo:' : 'Stok:'} <span class="font-bold text-blue-600">${stokVal}</span></div>` : ''}
                    </div>
                    ${(jualVal || beliVal) ? `
                    <div class="text-right shrink-0">
                        ${jualVal ? `<div class="text-xs font-bold text-emerald-600">${jualVal}</div>` : ''}
                        ${beliVal ? `<div class="text-[9px] text-slate-400 line-through mt-0.5">${beliVal}</div>` : ''}
                    </div>` : ''}
                </div>
            </td>`;
            cells += cardHtml;
        }

        return `<tr class="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50 transition-transform duration-200 swipeable-row bg-white relative z-20 cursor-pointer md:cursor-default" data-index="${o}" data-array-index="${i}" data-type="gen">${cells}<td class="py-1.5 px-3 align-middle hidden md:table-cell"><div class="flex space-x-1.5 justify-center"><button type="button" onclick="editDataGen(${i})" class="bg-amber-100 text-amber-700 h-7 w-7 rounded-lg flex items-center justify-center active:scale-95"><i class="fa-solid fa-pen-to-square text-xs"></i></button><button type="button" onclick="delGen(${o}, '${currentSheet}')" class="bg-red-100 text-red-700 h-7 w-7 rounded-lg flex items-center justify-center active:scale-95"><i class="fa-solid fa-trash text-xs"></i></button></div></td></tr>`;
    });
    
    rowsHtml.push(`<tr class="md:hidden"><td colspan="${colCount}" style="height: 140px; border: none;"></td></tr>`);
    tbody.innerHTML = rowsHtml.join('');

    if (totalPages > 1) {
        var pagHtml = `
        <div id="genPaginationWrap" class="fixed bottom-0 left-0 right-0 md:static md:bottom-auto w-full flex justify-between items-center p-2 sm:p-3 bg-white border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] md:shadow-sm z-[60] md:rounded-b-xl" style="padding-bottom: max(1rem, env(safe-area-inset-bottom));">
            <button type="button" onclick="window.currentPageGen--; loadTableData(false);" ${window.currentPageGen === 1 ? 'disabled' : ''} class="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-700 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><i class="fa-solid fa-chevron-left mr-1"></i> <span class="hidden sm:inline">Prev</span></button>
            <span class="text-xs font-bold text-slate-500">Hal ${window.currentPageGen} / ${totalPages}</span>
            <button type="button" onclick="window.currentPageGen++; loadTableData(false);" ${window.currentPageGen === totalPages ? 'disabled' : ''} class="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 text-slate-700 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><span class="hidden sm:inline">Next</span> <i class="fa-solid fa-chevron-right ml-1"></i></button>
        </div>`;
        if(wrapper) wrapper.insertAdjacentHTML('beforeend', pagHtml);
    }
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

window.changeFilterDate = function(offset) {
    var d = window.currentFilterDate || new Date();
    d.setDate(d.getDate() + offset);
    window.currentFilterDate = new Date(d); 
    loadTableData(false); 
};

window.setFilterDate = function(val) {
    if(!val) return;
    var parts = val.split('-');
    if(parts.length === 3) {
        window.currentFilterDate = new Date(parts[0], parts[1] - 1, parts[2]);
        loadTableData(false); 
    }
};

// ZETTBOT: Logika Swipe-to-Reveal untuk tabel
(function() {
    var startX = 0, startY = 0;
    var activeRow = null;
    var swipeMenu = null;
    window.isSwipingMode = false;

    function initSwipeMenu() {
        if (!document.getElementById('mobileSwipeMenu')) {
            swipeMenu = document.createElement('div');
            swipeMenu.id = 'mobileSwipeMenu';
            swipeMenu.className = 'absolute right-0 flex items-center justify-end pr-3 sm:pr-4 space-x-3 z-10 transition-opacity duration-200 opacity-0 pointer-events-none bg-slate-100/80 backdrop-blur-sm border-l border-slate-200';
            swipeMenu.innerHTML = `
                <button id="swipeBtnEdit" type="button" class="bg-amber-100 text-amber-700 h-[40px] w-[40px] rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"><i class="fa-solid fa-pen-to-square text-base"></i></button>
                <button id="swipeBtnDelete" type="button" class="bg-red-100 text-red-700 h-[40px] w-[40px] rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-transform"><i class="fa-solid fa-trash text-base"></i></button>
            `;
            
            var tc = document.getElementById('dataTableContainer');
            if(tc) {
                tc.style.position = 'relative';
                tc.style.overflowX = 'hidden'; // Ensure no horizontal scrolling overall
                tc.appendChild(swipeMenu);
            }
        } else {
            swipeMenu = document.getElementById('mobileSwipeMenu');
        }
    }

    window.resetSwipe = function() {
        if (activeRow) {
            activeRow.style.transform = 'translateX(0)';
            activeRow = null;
        }
        if (swipeMenu) {
            swipeMenu.classList.remove('opacity-100', 'pointer-events-auto');
            swipeMenu.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => { if(!activeRow && swipeMenu) swipeMenu.style.display = 'none'; }, 200);
        }
        if (window.popOverlayState) window.popOverlayState('swipeMenu');
    };

    // Dengarkan klik di luar untuk menutup swipe
    document.addEventListener('click', function(e) {
        if (activeRow && !e.target.closest('.swipeable-row') && !e.target.closest('#mobileSwipeMenu')) {
            resetSwipe();
        }
    });

    document.addEventListener('touchstart', function(e) {
        // Jangan aktifkan swipe jika di layar besar (md / >768px)
        if (window.innerWidth >= 768) return;
        
        var tr = e.target.closest('.swipeable-row');
        if (!tr) return;
        
        if (activeRow && activeRow !== tr) {
            resetSwipe();
        }
        
        activeRow = tr;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        window.isSwipingMode = false;
        
        initSwipeMenu();
        if (swipeMenu) swipeMenu.style.display = 'none';
    }, {passive: false});

    document.addEventListener('touchmove', function(e) {
        if (!activeRow || window.innerWidth >= 768) return;
        var diffX = startX - e.touches[0].clientX;
        var diffY = Math.abs(startY - e.touches[0].clientY);
        
        // Cek apakah dominan geser horizontal
        if (diffX > 15 && diffX > diffY) {
            window.isSwipingMode = true;
            if (e.cancelable) e.preventDefault(); // Mencegah scroll saat swipe
            
            var translateX = Math.min(diffX, 125); 
            activeRow.style.transform = `translateX(-${translateX}px)`;
            
            if (swipeMenu && swipeMenu.style.display === 'none') {
                if (window.pushOverlayState) window.pushOverlayState('swipeMenu');
                var tc = document.getElementById('dataTableContainer');
                var trRect = activeRow.getBoundingClientRect();
                var tcRect = tc.getBoundingClientRect();
                
                swipeMenu.style.display = 'flex';
                swipeMenu.style.top = (trRect.top - tcRect.top + tc.scrollTop) + 'px';
                swipeMenu.style.height = trRect.height + 'px';
                swipeMenu.style.width = '140px';
                
                var idx = activeRow.getAttribute('data-index');
                var type = activeRow.getAttribute('data-type');
                
                document.getElementById('swipeBtnEdit').onclick = function() {
                    resetSwipe();
                    if(type === 'konter') editKonterData(idx);
                    else editDataGen(activeRow.getAttribute('data-array-index'));
                };
                document.getElementById('swipeBtnDelete').onclick = function() {
                    resetSwipe();
                    if(type === 'konter') delKonter(idx);
                    else delGen(idx, window.currentSheet);
                };
            }
        } else if (diffX < -10 && window.isSwipingMode) {
            activeRow.style.transform = 'translateX(0)';
            if(swipeMenu) swipeMenu.style.display = 'none';
        }
    }, {passive: false});

    document.addEventListener('touchend', function(e) {
        if (!activeRow || !window.isSwipingMode) return;
        var diffX = startX - e.changedTouches[0].clientX;
        
        if (diffX > 45) {
            // Biarkan terbuka
            activeRow.style.transform = 'translateX(-125px)';
            if(swipeMenu) {
                swipeMenu.classList.remove('opacity-0', 'pointer-events-none');
                swipeMenu.classList.add('opacity-100', 'pointer-events-auto');
                swipeMenu.style.display = 'flex';
            }
        } else {
            // Tutup kembali jika geseran kurang kuat
            resetSwipe();
        }
        isSwiping = false;
    });

})();

// Global History Manager for hardware back button
window.pushOverlayState = function(id) {
    if (!window.history.state || window.history.state.overlay !== id) {
        window.history.pushState({ overlay: id }, "");
    }
};

window.popOverlayState = function(id) {
    if (window.history.state && window.history.state.overlay === id) {
        window.__isManualPop = true;
        window.history.back();
    }
};

window.addEventListener('popstate', function(e) {
    if (window.__isManualPop) {
        window.__isManualPop = false;
        return;
    }
    // Hardware back button pressed
    if(typeof closeKonterModal === 'function') closeKonterModal();
    if(typeof closeGenericModal === 'function') closeGenericModal();
    if(typeof closeAddKategoriModal === 'function') closeAddKategoriModal();
    if(typeof closeAddProviderModal === 'function') closeAddProviderModal();
    if(typeof closeAddKategoriGameModal === 'function') closeAddKategoriGameModal();
    if(typeof closeSmartPasteModal === 'function') closeSmartPasteModal();
    if(typeof window.resetSwipe === 'function') window.resetSwipe();
    
    var mMut = document.getElementById('modalMutasi');
    if (mMut && !mMut.classList.contains('opacity-0')) {
        mMut.classList.add('opacity-0', 'pointer-events-none');
        mMut.classList.remove('opacity-100', 'pointer-events-auto');
    }
    
    if(typeof Swal !== 'undefined' && Swal.isVisible()) Swal.close();
});

window.toggleMarginFields = function(el) {
    var val = el ? el.value : (document.getElementById('tipe_margin') ? document.getElementById('tipe_margin').value : 'Range Nominal');
    
    var cMin = document.getElementById('container_min_nom');
    var cMax = document.getElementById('container_max_nom');
    var cPct = document.getElementById('container_persentase_val');
    var cMarg = document.getElementById('container_val_margin');

    var iMin = document.getElementById('min_nom');
    var iPct = document.getElementById('persentase_val');
    var iMarg = document.getElementById('val_margin');

    if(val === 'Persentase') {
        if(cMin) cMin.style.display = 'block'; 
        if(cMax) cMax.style.display = 'none';
        if(cPct) cPct.style.display = 'block';
        if(cMarg) cMarg.style.display = 'none'; 

        if(iMin) iMin.required = true;
        if(iPct) iPct.required = true;
        if(iMarg) iMarg.required = false; 

    } else {
        if(cMin) cMin.style.display = 'block';
        if(cMax) cMax.style.display = 'block';
        if(cPct) cPct.style.display = 'none';
        if(cMarg) cMarg.style.display = 'block'; 

        if(iMin) iMin.required = true;
        if(iPct) iPct.required = false;
        if(iMarg) iMarg.required = true;
    }
};

console.log("ui_components berhasil dimuat 100% tanpa terpotong!");

window.sortTable = function(colIndex) {
    var sheet = isKonterMode ? 'DB_konter' : (currentConfig ? currentConfig.sheet : null);
    if(!sheet) return;
    var sortStr = localStorage.getItem('sortState_' + sheet);
    var sortObj = sortStr ? JSON.parse(sortStr) : { col: -1, asc: true };
    if (sortObj.col === colIndex) {
        sortObj.asc = !sortObj.asc;
    } else {
        sortObj.col = colIndex;
        sortObj.asc = true;
    }
    localStorage.setItem('sortState_' + sheet, JSON.stringify(sortObj));
    window.forceRebuildHeader = true;
    loadTableData(false);
};
