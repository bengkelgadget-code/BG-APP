// ui_components.js

window.formatRupiahUI = function(el) {
    let val = el.value.replace(/[^0-9]/g, '');
    if (val !== '') {
        el.value = parseInt(val).toLocaleString('id-ID');
    } else {
        el.value = '';
    }
};

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('opacity-0', 'pointer-events-none');
            overlay.classList.add('opacity-100');
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('opacity-0', 'pointer-events-none');
            overlay.classList.remove('opacity-100');
        }
    }
}

function switchPage(sheetKey, pageTitle) {
    window.currentSheet = sheetKey;
    var titleElMobile = document.getElementById('mobilePageTitle');
    var titleElSidebar = document.getElementById('sidebarPageTitle');
    if (titleElMobile) titleElMobile.innerText = pageTitle;
    if (titleElSidebar) titleElSidebar.innerText = pageTitle;
    
    window.isKonterMode = (sheetKey === 'Konter');
    window.currentConfig = window.pageConfigs[sheetKey];
    
    var mainTable = document.getElementById('mainTableWrapper');
    var umumCont = document.getElementById('umumSettingsContainer');
    var dashCont = document.getElementById('miniDashboardKonterContainer');
    var btnPaste = document.getElementById('btnOpenPaste');

    if (mainTable) mainTable.classList.add('hidden');
    if (umumCont) umumCont.classList.add('hidden');
    if (dashCont) dashCont.classList.add('hidden');
    if (btnPaste) btnPaste.classList.add('hidden');

    if (sheetKey === 'Umum') {
        if (umumCont) {
            umumCont.classList.remove('hidden');
            umumCont.classList.add('flex');
        }
    } else {
        if (mainTable) {
            mainTable.classList.remove('hidden');
            mainTable.classList.add('flex');
        }
        if (isKonterMode && dashCont) {
            dashCont.classList.remove('hidden');
            dashCont.classList.add('flex');
        }
        if (btnPaste && currentConfig && ['Voucher', 'Perdana', 'Pulsa', 'Game'].includes(sheetKey)) {
             btnPaste.classList.remove('hidden');
        }
    }
    
    if (sheetKey !== 'Umum' && sheetKey !== 'Margin' && sheetKey !== 'Service') {
        var thead = document.querySelector('#dataTable thead');
        if (thead) {
            var headers = isKonterMode ? ['ID TRX', 'Tanggal', 'Jenis', 'Detail', 'Harga Jual', 'Aksi'] : (currentConfig.headers || []);
            var tr = '<tr>';
            headers.forEach(function(h) {
                tr += '<th class="px-4 py-3 bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">' + h + '</th>';
            });
            tr += '</tr>';
            thead.innerHTML = tr;
        }
        if (!isKonterMode && currentConfig && currentConfig.fields) {
            buildGenericForm();
        }
    } else if (sheetKey === 'Margin') {
        var thead = document.querySelector('#dataTable thead');
        if (thead && currentConfig) {
            var tr = '<tr>';
            currentConfig.headers.forEach(function(h) {
                tr += '<th class="px-4 py-3 bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">' + h + '</th>';
            });
            tr += '</tr>';
            thead.innerHTML = tr;
            if (currentConfig.fields) buildGenericForm();
        }
    }
    
    if (window.innerWidth < 768) {
        var sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) toggleSidebar();
    }
    
    if (typeof window.loadTableData === 'function') window.loadTableData(true);
}

function buildGenericForm() {
    var form = document.getElementById('dynamicForm');
    if (!form || !currentConfig.fields) return;
    
    var html = '<input type="hidden" id="genEditIndex" value="-1">';
    currentConfig.fields.forEach(function(f) {
        var hiddenCls = f.hidden ? 'style="display:none;"' : '';
        html += '<div id="container_'+f.id+'" ' + hiddenCls + '>';
        html += '<label class="block text-xs font-semibold text-slate-700 mb-1.5">' + f.label + '</label>';
        var requiredStr = f.required ? 'required' : '';
        var disabledStr = f.disabled ? 'readonly class="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-500 outline-none"' : 'class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"';
        
        if (f.type === 'text' || f.type === 'password' || f.type === 'number' || f.type === 'text_pct') {
            var typ = f.type === 'number' ? 'number' : 'text';
            if(f.type === 'password') typ = 'password';
            html += '<input type="'+typ+'" id="'+f.id+'" '+requiredStr+' '+disabledStr+'>';
        } else if (f.type === 'rupiah') {
            html += '<div class="relative"><span class="absolute left-3 top-2.5 text-sm text-slate-400 font-bold pointer-events-none">Rp</span>';
            html += '<input type="tel" id="'+f.id+'" '+requiredStr+' oninput="formatRupiahUI(this)" '+disabledStr+' class="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"></div>';
        } else if (f.type.startsWith('select')) {
            var mult = f.type === 'select_multiple' ? 'multiple="multiple"' : '';
            var onChange = f.onChange ? 'onchange="'+f.onChange+'"' : '';
            html += '<select id="'+f.id+'" '+requiredStr+' '+mult+' '+disabledStr+' '+onChange+'>';
            if (!mult) html += '<option value="">-- Pilih '+f.label+' --</option>';
            if (f.options) {
                f.options.forEach(function(opt) {
                    html += '<option value="'+opt+'">'+opt+'</option>';
                });
            } else if (f.source && window.BGL2_DROPDOWN_CACHE) {
                var srcData = window.BGL2_DROPDOWN_CACHE[f.source] || [];
                srcData.forEach(function(opt) { html += '<option value="'+opt+'">'+opt+'</option>'; });
            }
            html += '</select>';
            
            if (f.type === 'select_dynamic_add') {
                var func = '';
                if(f.source === 'providerData') func = 'openAddProviderModal()';
                if(f.source === 'kategoriAccData') func = 'openAddKategoriModal()';
                if(f.source === 'kategoriGameData') func = 'openAddKategoriGameModal()';
                if (func) {
                     html += '<button type="button" onclick="'+func+'" class="mt-1 text-[10px] text-blue-500 font-bold hover:text-blue-700">+ Tambah Baru</button>';
                }
            }
        }
        html += '</div>';
    });
    
    html += '<div class="flex justify-end space-x-3 mt-4 w-full pt-4 border-t border-slate-100">';
    html += '<button type="button" onclick="closeGenericModal()" class="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shadow-sm">Batal</button>';
    html += '<button type="submit" id="btnSubmitGen" class="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors">Simpan Data</button>';
    html += '</div>';
    form.innerHTML = html;
    
    if(window.jQuery) {
        currentConfig.fields.forEach(function(f) {
            if (f.type.startsWith('select')) {
                $('#' + f.id).select2({ width: '100%', placeholder: '-- Pilih ' + f.label + ' --', allowClear: true });
            }
        });
    }
}

window.toggleMarginFields = function(el) {
    var isPct = el.value === 'Persentase';
    var maxNomCont = document.getElementById('container_max_nom');
    var pctCont = document.getElementById('container_persentase_val');
    
    if (isPct) {
        if(maxNomCont) maxNomCont.style.display = 'none';
        if(pctCont) pctCont.style.display = 'block';
    } else {
        if(maxNomCont) maxNomCont.style.display = 'block';
        if(pctCont) pctCont.style.display = 'none';
    }
};

function loadTableData(showIconLoader = false) {
    if(typeof refreshActiveData === 'function') {
        refreshActiveData(showIconLoader);
    }
}

function renderKonterTable(data, colCount) {
    var tbody = document.getElementById('dataTableBody');
    var html = '';
    window.currentTableData = [];
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="'+colCount+'" class="py-6 text-slate-400 font-medium text-center text-xs">Belum ada data.</td></tr>';
        return;
    }
    
    data.forEach(function(row, idx) {
        window.currentTableData.push({ originalIndex: idx, row: row });
    });
    
    window.currentTableData.sort(function(a, b) {
        var idA = String(a.row[0] || '');
        var idB = String(b.row[0] || '');
        if (idA > idB) return -1;
        if (idA < idB) return 1;
        return 0;
    });
    
    window.currentTableData.forEach(function(item, displayIndex) {
        var row = item.row;
        html += '<tr class="hover:bg-slate-50 transition-colors">';
        html += '<td class="px-4 py-3 font-semibold text-slate-700 text-center">' + (row[0] || '-') + '</td>';
        html += '<td class="px-4 py-3 text-slate-500 text-center">' + (row[1] || '-') + '</td>';
        html += '<td class="px-4 py-3 text-center"><span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md font-bold text-[10px] whitespace-normal">' + (row[2] || '-') + '</span></td>';
        html += '<td class="px-4 py-3 text-slate-600 font-medium max-w-[150px] truncate text-center" title="'+(row[3] || '-')+'">' + (row[3] || '-') + '</td>';
        html += '<td class="px-4 py-3 font-bold text-slate-800 text-center">' + (row[5] || '-') + '</td>';
        html += '<td class="px-4 py-3 text-center">';
        html += '<button onclick="editKonterData('+item.originalIndex+')" class="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors mr-1" title="Edit"><i class="fa-solid fa-pen-to-square text-[10px]"></i></button>';
        html += '<button onclick="delKonter('+item.originalIndex+')" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Hapus"><i class="fa-solid fa-trash text-[10px]"></i></button>';
        html += '</td>';
        html += '</tr>';
    });
    tbody.innerHTML = html;
}

function renderGenericTable(data, colCount) {
    var tbody = document.getElementById('dataTableBody');
    var html = '';
    window.currentTableData = [];
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="'+colCount+'" class="py-6 text-slate-400 font-medium text-center text-xs">Belum ada data.</td></tr>';
        return;
    }
    
    data.forEach(function(row, idx) {
        window.currentTableData.push({ originalIndex: idx, row: row });
    });
    
    window.currentTableData.sort(function(a, b) {
        var idA = String(a.row[0] || '');
        var idB = String(b.row[0] || '');
        if (idA > idB) return -1;
        if (idA < idB) return 1;
        return 0;
    });

    window.currentTableData.forEach(function(item, displayIndex) {
        var row = item.row;
        html += '<tr class="hover:bg-slate-50 transition-colors">';
        for (var i=0; i<colCount-1; i++) {
            var val = row[i] || '-';
            if (i===0) html += '<td class="px-4 py-3 font-semibold text-slate-700 text-center">' + val + '</td>';
            else html += '<td class="px-4 py-3 text-slate-600 max-w-[200px] truncate text-center" title="'+val+'">' + val + '</td>';
        }
        html += '<td class="px-4 py-3 text-center">';
        html += '<button onclick="editDataGen('+displayIndex+')" class="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors mr-1" title="Edit"><i class="fa-solid fa-pen-to-square text-[10px]"></i></button>';
        html += '<button onclick="delGen('+item.originalIndex+', \''+currentSheet+'\')" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Hapus"><i class="fa-solid fa-trash text-[10px]"></i></button>';
        html += '</td>';
        html += '</tr>';
    });
    tbody.innerHTML = html;
}

function filterTable() {
    var input = document.getElementById("searchInput");
    if(!input) return;
    var filter = input.value.toUpperCase();
    var table = document.getElementById("dataTable");
    if(!table) return;
    var tr = table.getElementsByTagName("tr");
    
    for (var i = 1; i < tr.length; i++) {
        var show = false;
        var tds = tr[i].getElementsByTagName("td");
        for (var j = 0; j < tds.length; j++) {
            if (tds[j]) {
                var txtValue = tds[j].textContent || tds[j].innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    show = true;
                    break;
                }
            }
        }
        tr[i].style.display = show ? "" : "none";
    }
}

function renderMiniDashboard() {
    var filterEl = document.getElementById('dashFilterPeriode');
    var filter = filterEl ? filterEl.value : 'harian'; 
    var data = window.BGL2_CACHE['DB_konter'] || [];
    var totalTrx = 0;
    var totalProfit = 0;
    
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    
    data.forEach(function(row) {
        if(!row || !row[1]) return;
        var dateStr = row[1];
        var match = false;
        
        if (filter === 'harian') {
            if (dateStr === (yyyy + '-' + mm + '-' + dd)) match = true;
            else if (dateStr === (dd + '/' + mm + '/' + yyyy)) match = true;
        } else {
            if (dateStr.includes(yyyy + '-' + mm)) match = true;
            else if (dateStr.includes('/' + mm + '/' + yyyy)) match = true;
        }
        
        if(match) {
            totalTrx++;
            var marginStr = String(row[6] || '0').replace(/[^0-9-]/g, '');
            var profit = parseInt(marginStr);
            if(!isNaN(profit)) totalProfit += profit;
        }
    });
    
    var elTrx = document.getElementById('dashTotalTrx');
    var elProf = document.getElementById('dashTotalProfit');
    var elLblTrx = document.getElementById('dashLabelTrx');
    var elLblProf = document.getElementById('dashLabelProfit');
    
    if(elTrx) elTrx.innerText = totalTrx;
    if(elProf) elProf.innerText = 'Rp ' + totalProfit.toLocaleString('id-ID');
    if(elLblTrx) elLblTrx.innerText = filter === 'harian' ? 'Trx Hari Ini' : 'Trx Bulan Ini';
    if(elLblProf) elLblProf.innerText = filter === 'harian' ? 'Profit Hari Ini' : 'Profit Bulan Ini';
}

function openModal(id) {
    var modal = document.getElementById(id);
    if(modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100');
        var content = modal.children[0];
        if (content) {
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    }
}

function closeModal(id) {
    var modal = document.getElementById(id);
    if(modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100');
        var content = modal.children[0];
        if (content) {
            content.classList.add('scale-95');
            content.classList.remove('scale-100');
        }
    }
}

function openGenericModal() { openModal('modalGeneric'); }
function closeGenericModal() { closeModal('modalGeneric'); }
function openKonterModal() { openModal('modalKonter'); }
function closeKonterModal() { closeModal('modalKonter'); }
function openAddKategoriModal() { openModal('modalAddKategori'); }
function closeAddKategoriModal() { closeModal('modalAddKategori'); }
function openAddProviderModal() { openModal('modalAddProvider'); }
function closeAddProviderModal() { closeModal('modalAddProvider'); }
function openAddKategoriGameModal() { openModal('modalAddKategoriGame'); }
function closeAddKategoriGameModal() { closeModal('modalAddKategoriGame'); }
function openSmartPasteModal() { openModal('modalSmartPaste'); }
function closeSmartPasteModal() { closeModal('modalSmartPaste'); }

function toggleForm(isEdit = false) {
    if (isKonterMode) {
        if(!isEdit) {
            window.editIndex = -1;
            var kntForm = document.getElementById('kntForm');
            if(kntForm) kntForm.reset();
            var today = new Date();
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0');
            var yyyy = today.getFullYear();
            var kntTgl = document.getElementById('kntTanggal');
            if(kntTgl) kntTgl.value = dd + '/' + mm + '/' + yyyy;
            var formTitle = document.getElementById('kntFormTitle');
            if(formTitle) formTitle.innerText = 'Transaksi Konter Baru';
            var btnSub = document.getElementById('btnSubmitKonter');
            if(btnSub) btnSub.innerText = 'Simpan Transaksi';
            if(typeof window.kntJenisChange === 'function') window.kntJenisChange(); 
        }
        openKonterModal();
    } else {
        if(!isEdit) {
            window.editIndex = -1;
            var genForm = document.getElementById('dynamicForm');
            if(genForm) genForm.reset();
            if(typeof window.initGenericForm === 'function') window.initGenericForm();
            if(window.jQuery) {
                 $('#dynamicForm select').val(null).trigger('change');
            }
            var genTitle = document.getElementById('genFormTitle');
            if(genTitle) genTitle.innerText = 'Tambah Data ' + currentConfig.sheet;
            var btnGenSub = document.getElementById('btnSubmitGen');
            if(btnGenSub) btnGenSub.innerText = 'Simpan Data';
        }
        openGenericModal();
    }
}

function previewUmumLogo(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = document.getElementById('umumLogoPreview');
            var icon = document.getElementById('umumLogoIcon');
            if(img) {
                img.src = e.target.result;
                img.classList.remove('hidden');
            }
            var base64Inp = document.getElementById('umumLogoBase64');
            if(base64Inp) base64Inp.value = e.target.result;
            if(icon) icon.classList.add('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function populateUmumSettings(data) {
    var form = document.getElementById('formPengaturanUmum');
    if(!form) return;
    form.reset();
    var editInp = document.getElementById('umumEditIndex');
    if(editInp) editInp.value = -1;
    if (data && data.length > 0) {
        var row = data[0]; 
        if(editInp) editInp.value = 0; 
        var idInp = document.getElementById('umumIdPengaturan');
        if(idInp) idInp.value = row[0] || '';
        var namaInp = document.getElementById('umumNamaKonter');
        if(namaInp) namaInp.value = row[1] || '';
        var alamatInp = document.getElementById('umumAlamatKonter');
        if(alamatInp) alamatInp.value = row[2] || '';
        var logoBase64 = row[3] || '';
        var baseInp = document.getElementById('umumLogoBase64');
        if(baseInp) baseInp.value = logoBase64;
        
        var img = document.getElementById('umumLogoPreview');
        var icon = document.getElementById('umumLogoIcon');
        if (logoBase64) {
            if(img) { img.src = logoBase64; img.classList.remove('hidden'); }
            if(icon) icon.classList.add('hidden');
        } else {
            if(img) img.classList.add('hidden');
            if(icon) icon.classList.remove('hidden');
        }
    }
}

// Global Exports required by app_logic.js
window.toggleSidebar = toggleSidebar;
window.switchPage = switchPage;
window.toggleForm = toggleForm;
window.openModal = openModal;
window.closeModal = closeModal;
window.openGenericModal = openGenericModal;
window.closeGenericModal = closeGenericModal;
window.openKonterModal = openKonterModal;
window.closeKonterModal = closeKonterModal;
window.openAddKategoriModal = openAddKategoriModal;
window.closeAddKategoriModal = closeAddKategoriModal;
window.openAddProviderModal = openAddProviderModal;
window.closeAddProviderModal = closeAddProviderModal;
window.openAddKategoriGameModal = openAddKategoriGameModal;
window.closeAddKategoriGameModal = closeAddKategoriGameModal;
window.openSmartPasteModal = openSmartPasteModal;
window.closeSmartPasteModal = closeSmartPasteModal;
window.loadTableData = loadTableData;
window.renderMiniDashboard = renderMiniDashboard;
window.filterTable = filterTable;
window.previewUmumLogo = previewUmumLogo;
window.populateUmumSettings = populateUmumSettings;
window.renderKonterTable = renderKonterTable;
window.renderGenericTable = renderGenericTable;

// Initialize accordions
document.addEventListener('DOMContentLoaded', function() {
    var menuContainers = document.querySelectorAll('.menu-container > button');
    menuContainers.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var ul = this.nextElementSibling;
            if (ul) {
                ul.classList.toggle('hidden');
                var icon = this.querySelector('.chevron-icon');
                if (icon) {
                    icon.classList.toggle('rotate-180');
                }
            }
        });
    });
});
