var window = window || {};
window.BGL2_CACHE = window.BGL2_CACHE || {}; 
window.BGL2_DROPDOWN_CACHE = window.BGL2_DROPDOWN_CACHE || null; 

window.currentFilterDate = new Date();

try {
    var savedDrop = localStorage.getItem('bgl2_dropdown_cache');
    if (savedDrop) window.BGL2_DROPDOWN_CACHE = JSON.parse(savedDrop);

    var savedTable = localStorage.getItem('bgl2_table_cache');
    if (savedTable) window.BGL2_CACHE = JSON.parse(savedTable);
} catch(e) {}

window.saveCacheToLocal = function() {
    try {
        localStorage.setItem('bgl2_table_cache', JSON.stringify(window.BGL2_CACHE));
    } catch(e) { console.error("Gagal simpan cache:", e); }
};

var isSidebarOpen = false;
var isKonterMode = true; 
var activeRole = '';
var currentSheet = 'Konter';
var currentTableData = [];
var currentConfig = {};
var editIndex = -1; 

var pageConfigs = {
    'Users': { sheet: 'Users', headers: ['Username', 'Password', 'Kategori', 'Updated At', 'Aksi'], fields: [{ id: 'username', label: 'Username', type: 'text', required: true }, { id: 'password', label: 'Password', type: 'password', required: true }, { id: 'kategori', label: 'Kategori', type: 'select', options: ['Admin', 'Kasir'], required: true }] },
    'Provider': { sheet: 'Provider', prefix: 'PR', headers: ['ID Provider', 'Nama Provider', 'Updated At', 'Aksi'], idType: 'provider', fields: [{ id: 'id_provider', label: 'ID Provider', type: 'text', disabled: true }, { id: 'nama_provider', label: 'Nama Provider', type: 'text', required: true }] },
    'Voucher': { sheet: 'Voucher', prefix: 'VC', headers: ['ID Voucher', 'Provider', 'Nama Voucher', 'Harga Beli', 'Harga Jual', 'Stok', 'Updated At', 'Aksi'], idType: 'voucher', fields: [{ id: 'id_voucher', label: 'ID Voucher', type: 'text', disabled: true }, { id: 'provider', label: 'Provider', type: 'select_dynamic_add', source: 'providerData', required: true }, { id: 'nama_voucher', label: 'Nama Voucher', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }, { id: 'stok', label: 'Stok Barang', type: 'number', required: true }] },
    'Perdana': { sheet: 'Perdana', prefix: 'PD', headers: ['ID Perdana', 'Provider', 'Nama Perdana', 'Harga Beli', 'Harga Jual', 'Stok', 'Updated At', 'Aksi'], idType: 'perdana', fields: [{ id: 'id_perdana', label: 'ID Perdana', type: 'text', disabled: true }, { id: 'provider', label: 'Provider', type: 'select_dynamic_add', source: 'providerData', required: true }, { id: 'nama_perdana', label: 'Nama Perdana', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }, { id: 'stok', label: 'Stok Barang', type: 'number', required: true }] },
    'PPOB': { sheet: 'PPOB', prefix: 'PP', headers: ['ID PPOB', 'Nama PPOB', 'Updated At', 'Aksi'], idType: 'ppob', fields: [{ id: 'id_ppob', label: 'ID PPOB', type: 'text', disabled: true }, { id: 'nama_ppob', label: 'Nama PPOB', type: 'text', required: true }] },
    'ACC': { sheet: 'ACC', prefix: 'AC', headers: ['ID ACC', 'Kategori', 'Nama ACC', 'Harga Beli', 'Harga Jual', 'Stok', 'Updated At', 'Aksi'], idType: 'acc', fields: [{ id: 'id_acc', label: 'ID ACC', type: 'text', disabled: true }, { id: 'kategori', label: 'Kategori', type: 'select_dynamic_add', source: 'kategoriAccData', required: true }, { id: 'nama_acc', label: 'Nama ACC', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }, { id: 'stok', label: 'Stok Barang', type: 'number', required: true }] },
    'Pulsa': { sheet: 'Pulsa', prefix: 'PL', headers: ['ID Pulsa', 'Provider', 'Nominal / Nama', 'Harga Beli', 'Harga Jual', 'Updated At', 'Aksi'], idType: 'pulsa', fields: [{ id: 'id_pulsa', label: 'ID Pulsa', type: 'text', disabled: true }, { id: 'provider', label: 'Provider', type: 'select_dynamic_add', source: 'providerData', required: true }, { id: 'nama_pulsa', label: 'Nominal / Nama', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }] },
    'Token': { sheet: 'Token', prefix: 'TK', headers: ['ID Token', 'Nominal Token', 'Harga Beli', 'Harga Jual', 'Updated At', 'Aksi'], idType: 'token', fields: [{ id: 'id_token', label: 'ID Token', type: 'text', disabled: true }, { id: 'nama_token', label: 'Nominal Token', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }] },
    'Game': { sheet: 'Game', prefix: 'GM', headers: ['ID Game', 'Nama Game', 'Item / Nominal', 'Harga Beli', 'Harga Jual', 'Updated At', 'Aksi'], idType: 'game', fields: [{ id: 'id_game', label: 'ID Game', type: 'text', disabled: true }, { id: 'kategori_game', label: 'Nama Game', type: 'select_dynamic_add', source: 'kategoriGameData', required: true }, { id: 'nama_item', label: 'Item / Nominal', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }] },
    'Umum': { sheet: 'Pengaturan_Umum', prefix: 'PU' },
    'Sumber_Dana': { 
        sheet: 'Sumber_Dana', prefix: 'SD', 
        headers: ['ID Akun', 'Nama Akun', 'Kategori', 'Saldo Terkini', 'Aksi'], 
        idType: 'sumber_dana', 
        fields: [
            { id: 'sd_id', label: 'ID Akun', type: 'text', disabled: true }, 
            { id: 'sd_nama', label: 'Nama Akun', type: 'text', required: true, placeholder: 'Misal: Laci Kasir, BCA, DANA' }, 
            { id: 'sd_kategori', label: 'Kategori', type: 'select', options: ['Uang Tunai', 'Rekening Bank', 'E-Wallet', 'Aplikasi Provider', 'Server Pulsa'], required: true }, 
            { id: 'sd_saldo', label: 'Saldo Terkini (IDR)', type: 'rupiah', required: true }
        ] 
    },
    
    // ZETTBOT FIX: Update Header Menjadi "Nominal Awal" & "Akhir / Persentase"
    'Margin': { 
        sheet: 'Pengaturan_Margin', prefix: 'PM', 
        headers: ['ID', 'Tipe Perhitungan', 'Layanan Terkait', 'Nominal Awal', 'Akhir / Persentase', 'Keuntungan', 'Aksi'], 
        fields: [
            { id: 'id_margin', label: 'ID Margin', type: 'text', disabled: true }, 
            { id: 'tipe_margin', label: 'Tipe Perhitungan', type: 'select', options: ['Range Nominal', 'Persentase'], required: true, onChange: 'window.toggleMarginFields(this)' }, 
            { id: 'layanan_margin', label: 'Layanan Terkait', type: 'select_multiple', options: ['TRANSFER', 'JASA TRANSFER', 'TARIK TUNAI', 'E-WALLET', 'PPOB', 'TOKEN PLN', 'VOUCHER', 'PERDANA', 'PULSA', 'KUOTA INTERNET', 'ACC', 'GAME'], required: true, width: 'full' }, 
            { id: 'min_nom', label: 'Nominal Awal (>=)', type: 'rupiah', required: true }, 
            { id: 'persentase_val', label: 'Besaran Persentase', type: 'text_pct', required: false, hidden: true }, 
            { id: 'max_nom', label: 'Nominal Akhir (<) (Boleh kosong)', type: 'rupiah', required: false }, 
            { id: 'val_margin', label: 'Margin / Keuntungan (IDR)', type: 'rupiah', required: true }
        ]
    },
    'Mutasi': { sheet: 'DB_mutasi', prefix: 'MT', headers: ['No Trx', 'Tanggal', 'Jenis', 'Asal / Tujuan', 'Keterangan', 'Nominal', 'Aksi'], fields: [] },
    'Service': { sheet: 'DB_service', prefix: 'SV', headers: ['No Nota', 'Tanggal', 'ID Cust', 'Seri HP', 'PIN/Pola', 'Kerusakan', 'Kelengkapan', 'Garansi', 'Ket Tambahan', 'Total Biaya', 'Ket Bayar', 'Foto', 'Status', 'Updated At', 'Aksi'], fields: [] }
};

const getEl = (id) => {
    const els = document.querySelectorAll('#' + id);
    return els.length > 0 ? els[els.length - 1] : null;
};
