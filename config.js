
    var window = window || {};
    window.BGL2_CACHE = window.BGL2_CACHE || {}; 
    window.BGL2_DROPDOWN_CACHE = window.BGL2_DROPDOWN_CACHE || null; 
    
    // ZETTBOT FIX: State Global untuk Paginasi Tanggal
    window.currentFilterDate = new Date();
    
    try {
        var savedDrop = localStorage.getItem('bgl2_dropdown_cache');
        if (savedDrop) window.BGL2_DROPDOWN_CACHE = JSON.parse(savedDrop);
    } catch(e) {}
    
    var isSidebarOpen = false;
    var isKonterMode = true; 
    var activeRole = '';
    var currentSheet = 'Konter';
    var currentTableData = [];
    var currentConfig = {};
    var editIndex = -1; 
    
    var pageConfigs = {
        'Users': { sheet: 'Users', headers: ['Username', 'Password', 'Kategori', 'Updated At', 'Aksi'], fields: [{ id: 'username', label: 'Username', type: 'text', required: true }, { id: 'password', label: 'Password', type: 'password', required: true }, { id: 'kategori', label: 'Kategori', type: 'select', options: ['Admin', 'Kasir'], required: true }] },
        'Bank': { sheet: 'Bank', prefix: 'BK', headers: ['ID Bank', 'Nama Bank', 'Updated At', 'Aksi'], idType: 'bank', fields: [{ id: 'id_bank', label: 'ID Bank', type: 'text', disabled: true }, { id: 'nama_bank', label: 'Nama Bank', type: 'text', required: true }] },
        'Provider': { sheet: 'Provider', prefix: 'PR', headers: ['ID Provider', 'Nama Provider', 'Updated At', 'Aksi'], idType: 'provider', fields: [{ id: 'id_provider', label: 'ID Provider', type: 'text', disabled: true }, { id: 'nama_provider', label: 'Nama Provider', type: 'text', required: true }] },
        'Voucher': { sheet: 'Voucher', prefix: 'VC', headers: ['ID Voucher', 'Provider', 'Nama Voucher', 'Harga Beli', 'Harga Jual', 'Stok', 'Updated At', 'Aksi'], idType: 'voucher', fields: [{ id: 'id_voucher', label: 'ID Voucher', type: 'text', disabled: true }, { id: 'provider', label: 'Provider', type: 'select_dynamic_add', source: 'providerData', required: true }, { id: 'nama_voucher', label: 'Nama Voucher', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }, { id: 'stok', label: 'Stok Barang', type: 'number', required: true }] },
        'Perdana': { sheet: 'Perdana', prefix: 'PD', headers: ['ID Perdana', 'Provider', 'Nama Perdana', 'Harga Beli', 'Harga Jual', 'Stok', 'Updated At', 'Aksi'], idType: 'perdana', fields: [{ id: 'id_perdana', label: 'ID Perdana', type: 'text', disabled: true }, { id: 'provider', label: 'Provider', type: 'select_dynamic_add', source: 'providerData', required: true }, { id: 'nama_perdana', label: 'Nama Perdana', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }, { id: 'stok', label: 'Stok Barang', type: 'number', required: true }] },
        'E_Wallet': { sheet: 'E_Wallet', prefix: 'EW', headers: ['ID E-Wallet', 'Nama E-Wallet', 'Updated At', 'Aksi'], idType: 'ewallet', fields: [{ id: 'id_ewallet', label: 'ID E-Wallet', type: 'text', disabled: true }, { id: 'nama_ewallet', label: 'Nama E-Wallet', type: 'text', required: true }] },
        'PPOB': { sheet: 'PPOB', prefix: 'PP', headers: ['ID PPOB', 'Nama PPOB', 'Updated At', 'Aksi'], idType: 'ppob', fields: [{ id: 'id_ppob', label: 'ID PPOB', type: 'text', disabled: true }, { id: 'nama_ppob', label: 'Nama PPOB', type: 'text', required: true }] },
        'ACC': { sheet: 'ACC', prefix: 'AC', headers: ['ID ACC', 'Kategori', 'Nama ACC', 'Harga Beli', 'Harga Jual', 'Stok', 'Updated At', 'Aksi'], idType: 'acc', fields: [{ id: 'id_acc', label: 'ID ACC', type: 'text', disabled: true }, { id: 'kategori', label: 'Kategori', type: 'select_dynamic_add', source: 'kategoriAccData', required: true }, { id: 'nama_acc', label: 'Nama ACC', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }, { id: 'stok', label: 'Stok Barang', type: 'number', required: true }] },
        'Pulsa': { sheet: 'Pulsa', prefix: 'PL', headers: ['ID Pulsa', 'Provider', 'Nominal / Nama', 'Harga Beli', 'Harga Jual', 'Updated At', 'Aksi'], idType: 'pulsa', fields: [{ id: 'id_pulsa', label: 'ID Pulsa', type: 'text', disabled: true }, { id: 'provider', label: 'Provider', type: 'select_dynamic_add', source: 'providerData', required: true }, { id: 'nama_pulsa', label: 'Nominal / Nama', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }] },
        'Game': { sheet: 'Game', prefix: 'GM', headers: ['ID Game', 'Nama Game', 'Item / Nominal', 'Harga Beli', 'Harga Jual', 'Updated At', 'Aksi'], idType: 'game', fields: [{ id: 'id_game', label: 'ID Game', type: 'text', disabled: true }, { id: 'kategori_game', label: 'Nama Game', type: 'select_dynamic_add', source: 'kategoriGameData', required: true }, { id: 'nama_item', label: 'Item / Nominal', type: 'text', required: true }, { id: 'harga_beli', label: 'Harga Beli (IDR)', type: 'rupiah', required: true }, { id: 'harga_jual', label: 'Harga Jual (IDR)', type: 'rupiah', required: true }] },
        'Umum': { sheet: 'Pengaturan_Umum', prefix: 'PU' },
        'Margin': { sheet: 'Pengaturan_Margin', prefix: 'PM', headers: ['ID', 'Layanan Terkait', 'Nominal Awal', 'Nominal Akhir', 'Margin', 'Aksi'], fields: [{ id: 'id_margin', label: 'ID Margin', type: 'text', disabled: true }, { id: 'layanan_margin', label: 'Layanan Terkait', type: 'select_multiple', options: ['TRANSFER', 'JASA TRANSFER', 'TARIK TUNAI', 'E-WALLET', 'PPOB', 'TOKEN PLN', 'VOUCHER', 'PERDANA', 'PULSA', 'KUOTA INTERNET', 'ACC', 'GAME'], required: true }, { id: 'min_nom', label: 'Nominal Awal (>=)', type: 'rupiah', required: true }, { id: 'max_nom', label: 'Nominal Akhir (<) (Boleh kosong)', type: 'rupiah', required: false }, { id: 'val_margin', label: 'Margin / Keuntungan (IDR)', type: 'rupiah', required: true }] },
        'Service': { sheet: 'DB_service', prefix: 'SV', headers: ['No Nota', 'Tanggal', 'ID Cust', 'Seri HP', 'PIN/Pola', 'Kerusakan', 'Kelengkapan', 'Garansi', 'Ket Tambahan', 'Total Biaya', 'Ket Bayar', 'Foto', 'Status', 'Updated At', 'Aksi'], fields: [] }
    };

    const getEl = (id) => {
        const els = document.querySelectorAll('#' + id);
        return els.length > 0 ? els[els.length - 1] : null;
    };
