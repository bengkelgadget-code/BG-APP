window.dashFilterDate = new Date();

window.renderDashboardPage = async function() {
    var container = document.getElementById('dashboardPageContainer');
    if(!container) return;

    container.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center pt-20"><i class="fa-solid fa-spinner fa-spin text-4xl text-pink-500 mb-4"></i><p class="text-slate-500 font-medium">Menganalisa & Mengumpulkan Data...</p></div>';

    try {
        if (!window.BGL2_CACHE['DB_konter']) {
            if(typeof gasRun !== 'undefined') window.BGL2_CACHE['DB_konter'] = await gasRun('getData', 'DB_konter');
            else window.BGL2_CACHE['DB_konter'] = [];
        }

    const loadStock = async (sheet) => {
        if (!window.BGL2_CACHE[sheet]) {
            if(typeof gasRun !== 'undefined') window.BGL2_CACHE[sheet] = await gasRun('getData', sheet);
            else window.BGL2_CACHE[sheet] = [];
        }
        return window.BGL2_CACHE[sheet];
    };

    var [vouchers, perdanas, accs] = await Promise.all([
        loadStock('Voucher'), loadStock('Perdana'), loadStock('ACC')
    ]);

    var allKonter = window.BGL2_CACHE['DB_konter'] || [];

    var dStr = window.dashFilterDate.toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric'});
    var mStr = window.dashFilterDate.toLocaleDateString('id-ID', {month:'2-digit', year:'numeric'});

    var todayTrx = 0;
    var todayIncome = 0;
    var monthTrx = 0;
    var monthIncome = 0;

    var itemCounts = {};

    // For chart: last 3 months
    var chartLabels = [];
    var chartDataArr = [];
    for(let i=2; i>=0; i--) {
        let d = new Date(window.dashFilterDate.getFullYear(), window.dashFilterDate.getMonth() - i, 1);
        chartLabels.push(d.toLocaleDateString('id-ID', {month:'short', year:'numeric'}));
        chartDataArr.push(0);
    }

    allKonter.forEach(row => {
        let rowDateStr = row[1]; // DD/MM/YYYY
        let rowMargin = parseInt(String(row[6]).replace(/[^0-9-]/g, '')) || 0;
        let rowDetail = row[3] || row[2];

        if (rowDateStr === dStr) {
            todayTrx++;
            todayIncome += rowMargin;
        }

        let rowMStr = rowDateStr.substring(3); // MM/YYYY
        if (rowMStr === mStr) {
            monthTrx++;
            monthIncome += rowMargin;
        }

        // Top 10
        if (!itemCounts[rowDetail]) itemCounts[rowDetail] = { count: 0, income: 0 };
        itemCounts[rowDetail].count++;
        itemCounts[rowDetail].income += rowMargin;

        // Chart 3 months
        let parts = rowDateStr.split('/'); // [DD, MM, YYYY]
        if(parts.length === 3) {
            let rd = new Date(parts[2], parts[1]-1, parts[0]);
            for(let i=2; i>=0; i--) {
                let dTarget = new Date(window.dashFilterDate.getFullYear(), window.dashFilterDate.getMonth() - i, 1);
                if (rd.getMonth() === dTarget.getMonth() && rd.getFullYear() === dTarget.getFullYear()) {
                    chartDataArr[2-i] += rowMargin;
                }
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
                <div class="px-4 py-1 text-sm font-bold text-slate-700 w-32 text-center" id="dashDateDisplay">${dStr}</div>
                <button onclick="changeDashDate(1)" class="w-8 h-8 rounded text-slate-600 hover:bg-white hover:text-pink-600 hover:shadow transition-all"><i class="fa-solid fa-chevron-right text-xs"></i></button>
            </div>
        </div>

        <div class="p-6 space-y-6">
            <!-- SUMMARY CARDS -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- CHART -->
                <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
                    <h3 class="text-sm font-bold text-slate-800 mb-4 flex items-center"><i class="fa-solid fa-chart-line text-blue-500 mr-2"></i>Tren Profit (3 Bulan Terakhir)</h3>
                    <div class="flex-1 w-full relative min-h-[250px]">
                        <canvas id="dashChart"></canvas>
                    </div>
                </div>

                <!-- OUT OF STOCK -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col h-[320px]">
                    <h3 class="text-sm font-bold text-red-600 mb-4 flex items-center"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Stok Habis / Kritis</h3>
                    <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
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

            <!-- TOP 10 ITEMS -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-5 border-b border-slate-100">
                    <h3 class="text-sm font-bold text-slate-800 flex items-center"><i class="fa-solid fa-trophy text-orange-500 mr-2"></i>Top 10 Layanan & Produk Terlaris (All Time)</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                                <th class="p-4 w-12 text-center">No</th>
                                <th class="p-4">Nama Item / Layanan</th>
                                <th class="p-4 text-center">Total Transaksi</th>
                                <th class="p-4 text-right">Total Profit</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm text-slate-700 divide-y divide-slate-100">
                            ${top10.length === 0 ? '<tr><td colspan="4" class="p-6 text-center text-xs text-slate-400">Belum ada data transaksi.</td></tr>' : 
                              top10.map((t, idx) => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="p-4 text-center font-bold text-slate-400">${idx+1}</td>
                                    <td class="p-4 font-semibold text-slate-800">${t.name}</td>
                                    <td class="p-4 text-center"><span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">${t.count}x</span></td>
                                    <td class="p-4 text-right font-bold text-emerald-600">${fRupiah(t.income)}</td>
                                </tr>
                              `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Render Chart
    var ctx = document.getElementById('dashChart');
    if (ctx && window.Chart) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Total Profit',
                    data: chartDataArr,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [5,5] } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
    } catch(err) {
        console.error("Dashboard render error:", err);
        container.innerHTML = '<div class="w-full h-full flex flex-col items-center justify-center pt-20"><i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i><p class="text-slate-600 font-medium">Gagal memuat Dashboard</p><p class="text-xs text-red-400 mt-2">' + err.message + '</p></div>';
    }
};

window.changeDashDate = function(dir) {
    window.dashFilterDate.setDate(window.dashFilterDate.getDate() + dir);
    window.renderDashboardPage();
};
