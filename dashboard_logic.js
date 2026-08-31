window.dashFilterDate = window.dashFilterDate || new Date();
window.dashTop10Filter = window.dashTop10Filter || 'all';

window.renderDashboardPage = async function() {
    var container = document.getElementById('dashboardPageContainer');
    if(!container) return;

    container.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center pt-20"><i class="fa-solid fa-spinner fa-spin text-4xl text-pink-500 mb-4"></i><p class="text-slate-500 font-medium">Menganalisa & Mengumpulkan Data...</p></div>';

    try {
        if (!window.BGL2_CACHE['DB_konter']) {
            window.BGL2_CACHE['DB_konter'] = await window.getFromFirebase('DB_konter') || [];
        }

    const loadStock = async (sheet) => {
        if (!window.BGL2_CACHE[sheet]) {
            window.BGL2_CACHE[sheet] = await window.getFromFirebase(sheet) || [];
        }
        return window.BGL2_CACHE[sheet];
    };

    var [vouchers, perdanas, accs] = await Promise.all([
        loadStock('Voucher'), loadStock('Perdana'), loadStock('ACC')
    ]);

    var allKonter = window.BGL2_CACHE['DB_konter'] || [];

    // Robust date parsing helper
    var parseDateComponents = function(dateStr) {
        if (!dateStr) return null;
        var cleanStr = String(dateStr).replace(/-/g, '/').replace(/\s+/g, '').trim();
        var parts = cleanStr.split('/');
        if (parts.length < 3) return null;
        var d = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var y = parseInt(parts[2], 10);
        if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
        return { day: d, month: m, year: y };
    };

    var targetDay = window.dashFilterDate.getDate();
    var targetMonth = window.dashFilterDate.getMonth() + 1;
    var targetYear = window.dashFilterDate.getFullYear();

    var displayDateStr = window.dashFilterDate.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
    var yyyy = targetYear;
    var mm = String(targetMonth).padStart(2, '0');
    var dd = String(targetDay).padStart(2, '0');
    var dateInputVal = `${yyyy}-${mm}-${dd}`;

    var todayTrx = 0;
    var todayIncome = 0;
    var monthTrx = 0;
    var monthIncome = 0;

    var itemCounts = {};

    allKonter.forEach(row => {
        let rowDateStr = row[1]; // DD/MM/YYYY
        let rowMargin = parseInt(String(row[6]).replace(/[^0-9-]/g, '')) || 0;
        let rowDetail = row[3] || row[2];

        var p = parseDateComponents(rowDateStr);
        if (p) {
            if (p.day === targetDay && p.month === targetMonth && p.year === targetYear) {
                todayTrx++;
                todayIncome += rowMargin;
            }

            if (p.month === targetMonth && p.year === targetYear) {
                monthTrx++;
                monthIncome += rowMargin;
            }
        }

        // Top 10
        if (rowDetail) {
            var includeItem = true;
            if (window.dashTop10Filter === 'month') {
                if (!p || p.month !== targetMonth || p.year !== targetYear) {
                    includeItem = false;
                }
            }
            if (includeItem) {
                if (!itemCounts[rowDetail]) itemCounts[rowDetail] = { count: 0, income: 0 };
                itemCounts[rowDetail].count++;
                itemCounts[rowDetail].income += rowMargin;
            }
        }
    });

    var top10 = Object.keys(itemCounts).map(k => ({ name: k, ...itemCounts[k] }))
        .sort((a,b) => b.count - a.count).slice(0, 10);

    var lowStock = [];
    const checkLow = (arr, jenis) => {
        if(!Array.isArray(arr)) return;
        arr.forEach(r => {
            let st = parseInt(r[5]) || 0;
            if(st < 1) lowStock.push({ name: r[2], type: jenis });
        });
    };
    checkLow(vouchers, 'Voucher');
    checkLow(perdanas, 'Perdana');
    checkLow(accs, 'ACC');

    var fRupiah = (num) => "Rp " + parseInt(num).toLocaleString('id-ID').replace(/,/g, '.');

    var html = `
        <div class="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-white shrink-0 shadow-sm sticky top-0 z-10">
            <div>
                <h2 class="text-xl font-bold text-slate-800 flex items-center"><i class="fa-solid fa-chart-pie text-pink-500 mr-3"></i>Dashboard Analitik</h2>
                <p class="text-xs text-slate-500 mt-1">Ringkasan transaksi dan performa konter Anda</p>
            </div>
            <div class="mt-4 sm:mt-0 flex items-center bg-slate-100 rounded-lg p-1 shadow-inner border border-slate-200">
                <button onclick="changeDashDate(-1)" class="w-8 h-8 rounded text-slate-600 hover:bg-white hover:text-pink-600 hover:shadow transition-all"><i class="fa-solid fa-chevron-left text-xs"></i></button>
                <div class="relative flex items-center justify-center cursor-pointer px-4 py-1 hover:bg-white transition-colors rounded" title="Pilih Tanggal" onclick="try{document.getElementById('dashDatePicker').showPicker();}catch(e){}">
                    <input type="date" id="dashDatePicker" value="${dateInputVal}" onchange="setDashDate(this.value)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
                    <div class="text-sm font-bold text-slate-700 w-32 text-center select-none z-10" id="dashDateDisplay">${displayDateStr}</div>
                </div>
                <button onclick="changeDashDate(1)" class="w-8 h-8 rounded text-slate-600 hover:bg-white hover:text-pink-600 hover:shadow transition-all"><i class="fa-solid fa-chevron-right text-xs"></i></button>
            </div>
        </div>

        <div class="p-4 sm:p-6 flex-1 flex flex-col min-h-0 gap-4 sm:gap-6">
            <!-- SUMMARY CARDS -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">TRX Hari Ini</p>
                        <h3 class="text-2xl font-black text-slate-800">${todayTrx} <span class="text-xs font-medium text-slate-400">trx</span></h3>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl shadow-inner"><i class="fa-solid fa-receipt"></i></div>
                </div>
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Profit Hari Ini</p>
                        <h3 class="text-2xl font-black text-emerald-600">${fRupiah(todayIncome)}</h3>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl shadow-inner"><i class="fa-solid fa-wallet"></i></div>
                </div>
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">TRX Bulan Ini</p>
                        <h3 class="text-2xl font-black text-slate-800">${monthTrx} <span class="text-xs font-medium text-slate-400">trx</span></h3>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center text-xl shadow-inner"><i class="fa-solid fa-calendar-check"></i></div>
                </div>
                <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Profit Bulan Ini</p>
                        <h3 class="text-2xl font-black text-teal-600">${fRupiah(monthIncome)}</h3>
                    </div>
                    <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center text-xl shadow-inner"><i class="fa-solid fa-sack-dollar"></i></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0">
                
                <!-- TOP 10 ITEMS -->
                <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[320px] lg:h-full lg:min-h-0">
                    <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-2 shrink-0">
                        <h3 class="text-sm font-bold text-slate-800 flex items-center"><i class="fa-solid fa-trophy text-orange-500 mr-2"></i>Top 10 Layanan Terlaris</h3>
                        <select onchange="setDashTop10Filter(this.value)" class="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] sm:text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer font-bold">
                            <option value="all" ${window.dashTop10Filter === 'all' ? 'selected' : ''}>Semua Waktu</option>
                            <option value="month" ${window.dashTop10Filter === 'month' ? 'selected' : ''}>Bulan Ini</option>
                        </select>
                    </div>
                    <div class="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 sticky top-0">
                                    <th class="p-3 w-10 text-center">No</th>
                                    <th class="p-3">Nama Item / Layanan</th>
                                    <th class="p-3 text-center">Trx</th>
                                    <th class="p-3 text-right">Profit</th>
                                </tr>
                            </thead>
                            <tbody class="text-xs text-slate-700 divide-y divide-slate-100">
                                ${top10.length === 0 ? '<tr><td colspan="4" class="p-6 text-center text-xs text-slate-400">Belum ada data transaksi.</td></tr>' : 
                                  top10.map((t, idx) => `
                                    <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="p-3 text-center font-bold text-slate-400">${idx+1}</td>
                                        <td class="p-3 font-semibold text-slate-800">${t.name}</td>
                                        <td class="p-3 text-center"><span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">${t.count}x</span></td>
                                        <td class="p-3 text-right font-bold text-emerald-600">${fRupiah(t.income)}</td>
                                    </tr>
                                  `).join('')
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- OUT OF STOCK -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[320px] lg:h-full lg:min-h-0">
                    <h3 class="text-sm font-bold text-red-600 mb-4 flex items-center border-b border-slate-100 pb-2 shrink-0"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Stok Habis / Kritis</h3>
                    <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 min-h-0">
                        ${lowStock.length === 0 ? '<div class="text-center text-xs text-slate-400 mt-10">Semua stok aman.</div>' : 
                          lowStock.map(ls => `
                            <div class="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
                                <div class="flex flex-col">
                                    <span class="text-xs font-bold text-slate-800 line-clamp-1">${ls.name}</span>
                                    <span class="text-[10px] text-slate-500">${ls.type}</span>
                                </div>
                                <span class="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded">0</span>
                            </div>
                          `).join('')
                        }
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    } catch(err) {
        console.error("Dashboard render error:", err);
        container.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center pt-20"><i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i><p class="text-slate-600 font-medium">Gagal memuat Dashboard</p><p class="text-xs text-red-400 mt-2">' + err.message + '</p></div>';
    }
};

window.changeDashDate = function(dir) {
    window.dashFilterDate.setDate(window.dashFilterDate.getDate() + dir);
    window.renderDashboardPage();
};

window.setDashDate = function(val) {
    if(!val) return;
    var parts = val.split('-');
    if(parts.length === 3) {
        window.dashFilterDate = new Date(parts[0], parts[1] - 1, parts[2]);
        window.renderDashboardPage();
    }
};

window.setDashTop10Filter = function(val) {
    window.dashTop10Filter = val;
    window.renderDashboardPage();
};
