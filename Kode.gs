/**
 * ==============================================================================
 * 🤖 ZettBOT - Google Apps Script Backend (Code.gs)
 * ==============================================================================
 */
function doPost(e) {
  try {
    let req = JSON.parse(e.postData.contents);
    let action = req.action;
    let args = req.args || [];

    let result;
    // Mencocokkan perintah dari GitHub ke fungsi di Google Script
    switch(action) {
      case 'getAllData': result = getAllData(); break;
      case 'getNotaService': result = getNotaService(); break;
      case 'saveServiceTransaction': result = saveServiceTransaction(args[0]); break;
      case 'editServiceTransaction': result = editServiceTransaction(args[0], args[1]); break;
      case 'updateServiceStatus': result = updateServiceStatus(args[0], args[1]); break;
      case 'saveKonterTransaction': result = saveKonterTransaction(args[0]); break;
      case 'editKonterTransaction': result = editKonterTransaction(args[0], args[1]); break;
      case 'getDailyKonterStats': result = getDailyKonterStats(args[0]); break;
      case 'getData': result = getData(args[0]); break;
      case 'saveData': result = saveData(args[0], args[1]); break;
      case 'updateData': result = updateData(args[0], args[1], args[2]); break;
      case 'deleteData': result = deleteData(args[0], args[1]); break;
      case 'getDropdownData': result = getDropdownData(); break;
      case 'verifyLogin': result = verifyLogin(args[0], args[1]); break;
      default: throw new Error("Perintah tidak dikenali server.");
    }

    return ContentService.createTextOutput(JSON.stringify({status: 'success', data: result}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("🚨 PROYEK SALAH TEMPAT! Buka dari dalam Spreadsheet.");
  return ss;
}

function doGet() {
  try {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('BENGKEL GADGET L2 - System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    return HtmlService.createHtmlOutput('<h1 style="color:red; text-align:center; padding:50px;">ERROR HTML.</h1>');
  }
}

// ZETTBOT FIX: Pencetak Struktur Database
function setupDatabase() {
  const ss = getDatabase();
  const sheets = {
    'Users': ['Username', 'Password', 'Kategori', 'Updated_At'],
    'BrandHP': ['ID_Brand', 'Brand_HP', 'Updated_At'],
    'SeriHP': ['ID_Seri', 'Brand_HP', 'Seri_HP', 'Updated_At'],
    'Kerusakan': ['Jenis_Kerusakan', 'Updated_At'],
    'Bank': ['ID_Bank', 'Nama_Bank', 'Updated_At'],
    'Provider': ['ID_Provider', 'Nama_Provider', 'Updated_At'],
    'Voucher': ['ID_Voucher', 'Provider', 'Nama_Voucher', 'Harga_Beli', 'Harga_Jual', 'Stok', 'Updated_At'],
    'Perdana': ['ID_Perdana', 'Provider', 'Nama_Perdana', 'Harga_Beli', 'Harga_Jual', 'Stok', 'Updated_At'],
    'E_Wallet': ['ID_Ewallet', 'Nama_Ewallet', 'Updated_At'],
    'PPOB': ['ID_PPOB', 'Nama_PPOB', 'Updated_At'],
    'ACC': ['ID_ACC', 'Kategori', 'Nama_ACC', 'Harga_Beli', 'Harga_Jual', 'Stok', 'Updated_At'],
    'DB_customer': ['ID_Cust', 'No_HP', 'Nama_Customer', 'Total_Service', 'Terakhir_Service'],
    'DB_service': ['No_Nota', 'Tanggal', 'ID_Cust', 'Seri_HP', 'PIN_Pola', 'Kerusakan', 'Kelengkapan', 'Garansi', 'Ket_Tambahan', 'Total_Biaya', 'Ket_Bayar', 'Foto_Base64', 'Status', 'Updated_At'],
    'DB_konter': ['ID_Transaksi', 'Tanggal', 'Jenis_Transaksi', 'Detail_Transaksi', 'Harga_Beli', 'Harga_Jual', 'Profit', 'Updated_At']
  };

  for (let name in sheets) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      sheet.getRange(1, 1, 1, sheets[name].length).setFontWeight("bold").setBackground("#f3f4f6");
    } else {
      let firstCell = sheet.getRange(1, 1).getValue();
      if (String(firstCell).trim() !== sheets[name][0]) {
        sheet.insertRowBefore(1);
        sheet.getRange(1, 1, 1, sheets[name].length).setValues([sheets[name]]);
        sheet.getRange(1, 1, 1, sheets[name].length).setFontWeight("bold").setBackground("#f3f4f6");
      }
    }
  }
  SpreadsheetApp.flush();
}

function normalizeHp(hp) {
  if (!hp) return "";
  return String(hp).replace(/^'/, '').replace(/^0+/, '').replace(/\D/g, '').trim();
}

function getAllData() {
  try {
    setupDatabase();
    const ss = getDatabase();
    const sheets = ['Users', 'BrandHP', 'SeriHP', 'Kerusakan', 'Bank', 'Provider', 'Voucher', 'Perdana', 'E_Wallet', 'PPOB', 'ACC', 'DB_konter', 'DB_service', 'DB_customer'];
    let result = {};
    sheets.forEach(name => {
      let sheet = ss.getSheetByName(name);
      if (sheet) {
        let lastRow = sheet.getLastRow();
        let lastCol = sheet.getLastColumn();
        if (lastRow > 1 && lastCol > 0) {
          result[name] = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
        } else {
          result[name] = [];
        }
      } else {
        result[name] = [];
      }
    });
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

function getNotaService() {
  setupDatabase(); 
  const ss = getDatabase();
  let sheet = ss.getSheetByName('DB_service');
  
  const date = new Date();
  const month = Utilities.formatDate(date, 'Asia/Jakarta', 'MM');
  const year = Utilities.formatDate(date, 'Asia/Jakarta', 'yy');
  const prefix = `BG/${month}/${year}/`;
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return prefix + "001";
  
  const lastNota = sheet.getRange(lastRow, 1).getValue();
  if (!lastNota || !String(lastNota).includes(prefix)) return prefix + "001"; 
  
  const parts = String(lastNota).split('/');
  let num = parseInt(parts[parts.length - 1]);
  if(isNaN(num)) return prefix + "001";
  
  return prefix + (num + 1).toString().padStart(3, '0');
}

function generateCustID(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return "CUST-001";
  const lastId = sheet.getRange(lastRow, 1).getValue();
  if (!lastId || !String(lastId).startsWith('CUST-')) return "CUST-001";
  let num = parseInt(lastId.split('-')[1]);
  if (isNaN(num)) return "CUST-001";
  return "CUST-" + (num + 1).toString().padStart(3, '0');
}

function saveServiceTransaction(payload) {
  try {
    setupDatabase();
    const ss = getDatabase();
    let dbService = ss.getSheetByName('DB_service');
    let dbCustomer = ss.getSheetByName('DB_customer');
    
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
    const tglOnly = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
    
    let safeHp = String(payload.noHp).trim();
    if (!safeHp.startsWith("'")) { safeHp = "'" + safeHp; }

    const custData = dbCustomer.getRange(1, 1, Math.max(dbCustomer.getLastRow(), 1), 5).getDisplayValues();
    let idCust = "";
    let isCustomerExist = false;
    let compareHp = normalizeHp(safeHp);
    
    for(let i = 1; i < custData.length; i++) {
      if(normalizeHp(custData[i][1]) === compareHp) {
        isCustomerExist = true;
        idCust = custData[i][0];
        let totalService = parseInt(custData[i][3]) || 0;
        
        dbCustomer.getRange(i + 1, 2).setValue(safeHp); 
        dbCustomer.getRange(i + 1, 3).setValue(payload.nama); 
        dbCustomer.getRange(i + 1, 4).setValue(totalService + 1); 
        dbCustomer.getRange(i + 1, 5).setValue(tglOnly); 
        break;
      }
    }
    
    if(!isCustomerExist) {
      idCust = generateCustID(dbCustomer);
      dbCustomer.appendRow([idCust, safeHp, payload.nama, 1, tglOnly]);
    }
    
    const serviceRow = [
      payload.noNota, payload.tanggal, idCust, payload.seriHp, payload.pinPola, 
      payload.kerusakan, payload.kelengkapan, payload.garansi, payload.ketTambahan, payload.totalBiaya, 
      payload.ketBayar, payload.foto, 'Proses', timestamp
    ];
    dbService.appendRow(serviceRow);
    
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Transaksi berhasil disimpan!' };
  } catch(e) { return { status: 'error', message: e.message }; }
}

function editServiceTransaction(rowIndex, payload) {
  try {
    setupDatabase();
    const ss = getDatabase();
    let dbService = ss.getSheetByName('DB_service');
    let dbCustomer = ss.getSheetByName('DB_customer');
    
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
    const tglOnly = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
    
    let safeHp = String(payload.noHp).trim();
    if (!safeHp.startsWith("'")) { safeHp = "'" + safeHp; }

    const custData = dbCustomer.getRange(1, 1, Math.max(dbCustomer.getLastRow(), 1), 5).getDisplayValues();
    let idCust = "";
    let isCustomerUpdated = false;
    let newHpNorm = normalizeHp(safeHp);
    
    for(let i = 1; i < custData.length; i++) {
      if(normalizeHp(custData[i][1]) === newHpNorm) {
        isCustomerUpdated = true;
        idCust = custData[i][0];
        dbCustomer.getRange(i + 1, 2).setValue(safeHp); 
        dbCustomer.getRange(i + 1, 3).setValue(payload.nama); 
        dbCustomer.getRange(i + 1, 5).setValue(tglOnly); 
        break;
      }
    }
    
    if(!isCustomerUpdated) {
      idCust = generateCustID(dbCustomer);
      dbCustomer.appendRow([idCust, safeHp, payload.nama, 1, tglOnly]);
    }

    const serviceRow = [
      payload.noNota, payload.tanggal, idCust, payload.seriHp, payload.pinPola, 
      payload.kerusakan, payload.kelengkapan, payload.garansi, payload.ketTambahan, payload.totalBiaya, 
      payload.ketBayar, payload.foto, payload.status, timestamp
    ];
    dbService.getRange(rowIndex + 2, 1, 1, serviceRow.length).setValues([serviceRow]);
    
    SpreadsheetApp.flush();
    return { status: 'success', message: 'DATA BERHASIL DI RUBAH' };
  } catch(e) { return { status: 'error', message: e.message }; }
}

function updateServiceStatus(rowIndex, status) {
  try {
    const ss = getDatabase();
    const sheet = ss.getSheetByName('DB_service');
    sheet.getRange(rowIndex + 2, 13).setValue(status); 
    sheet.getRange(rowIndex + 2, 14).setValue(Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'));
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Status berhasil diperbarui!' };
  } catch(e) { return { status: 'error', message: e.message }; }
}

function saveKonterTransaction(payload) {
  try {
    setupDatabase();
    const ss = getDatabase();
    let dbKonter = ss.getSheetByName('DB_konter');

    let hargaBeli = 0;
    let hargaJual = 0;

    const autoCalcTypes = ['TRANSFER', 'TARIK TUNAI', 'E-WALLET', 'PPOB', 'TOKEN PLN', 'PULSA'];
    let nomVal = String(payload.nominal).replace(/[^0-9]/g, '');
    let nominal = parseInt(nomVal) || 0;

    if (autoCalcTypes.includes(payload.jenis)) {
       hargaBeli = nominal;
       let n = nominal;
       if (n < 100000) hargaJual = n + 3000;
       else if (n < 1000000) hargaJual = n + 5000;
       else if (n < 2000000) hargaJual = n + 7000;
       else if (n < 3000000) hargaJual = n + 10000;
       else if (n < 4000000) hargaJual = n + 15000;
       else if (n < 5000000) hargaJual = n + 20000;
       else hargaJual = n + (n * 0.004);
    } else {
       hargaBeli = parseInt(String(payload.hargaBeliDB).replace(/[^0-9]/g, '')) || 0;
       hargaJual = parseInt(String(payload.hargaJualDB).replace(/[^0-9]/g, '')) || 0;
    }

    let profit = hargaJual - hargaBeli;
    const fRupiah = (angka) => "Rp " + angka.toLocaleString('id-ID').replace(/,/g, '.');

    const date = new Date();
    const prefix = 'KNT-' + Utilities.formatDate(date, 'Asia/Jakarta', 'yyMMdd') + '-';
    const lastRow = dbKonter.getLastRow();
    let newId = prefix + "001";
    if(lastRow > 1) {
        let lastId = dbKonter.getRange(lastRow, 1).getValue();
        if(String(lastId).startsWith(prefix)) {
            let num = parseInt(String(lastId).split('-')[2]);
            if(!isNaN(num)) newId = prefix + (num+1).toString().padStart(3, '0');
        }
    }
    
    const row = [
        newId,
        payload.tanggal,
        payload.jenis,
        payload.detail,
        fRupiah(hargaBeli),
        fRupiah(hargaJual),
        fRupiah(profit),
        Utilities.formatDate(date, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss')
    ];

    dbKonter.appendRow(row);
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Transaksi Konter Disimpan!' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function editKonterTransaction(rowIndex, payload) {
  try {
    setupDatabase();
    const ss = getDatabase();
    let dbKonter = ss.getSheetByName('DB_konter');

    let hargaBeli = 0;
    let hargaJual = 0;

    const autoCalcTypes = ['TRANSFER', 'TARIK TUNAI', 'E-WALLET', 'PPOB', 'TOKEN PLN', 'PULSA'];
    let nomVal = String(payload.nominal).replace(/[^0-9]/g, '');
    let nominal = parseInt(nomVal) || 0;

    if (autoCalcTypes.includes(payload.jenis)) {
       hargaBeli = nominal;
       let n = nominal;
       if (n < 100000) hargaJual = n + 3000;
       else if (n < 1000000) hargaJual = n + 5000;
       else if (n < 2000000) hargaJual = n + 7000;
       else if (n < 3000000) hargaJual = n + 10000;
       else if (n < 4000000) hargaJual = n + 15000;
       else if (n < 5000000) hargaJual = n + 20000;
       else hargaJual = n + (n * 0.004);
    } else {
       hargaBeli = parseInt(String(payload.hargaBeliDB).replace(/[^0-9]/g, '')) || 0;
       hargaJual = parseInt(String(payload.hargaJualDB).replace(/[^0-9]/g, '')) || 0;
    }

    let profit = hargaJual - hargaBeli;
    const fRupiah = (angka) => "Rp " + angka.toLocaleString('id-ID').replace(/,/g, '.');

    const oldId = dbKonter.getRange(rowIndex + 2, 1).getValue();

    const row = [
        oldId,
        payload.tanggal,
        payload.jenis,
        payload.detail,
        fRupiah(hargaBeli),
        fRupiah(hargaJual),
        fRupiah(profit),
        Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss')
    ];

    dbKonter.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]);
    SpreadsheetApp.flush();
    return { status: 'success', message: 'DATA BERHASIL DI RUBAH' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

// ZETTBOT: Fungsi Penarik Statistik Profit Hari Ini secara Real-Time (Aman)
function getDailyKonterStats(clientDate) {
  try {
    setupDatabase();
    const ss = getDatabase();
    const sheet = ss.getSheetByName('DB_konter');
    if (!sheet) return { totalTransaksi: 0, totalProfit: 0 };

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return { totalTransaksi: 0, totalProfit: 0 };

    const todayServer = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy');
    const cleanDate = (d) => String(d).replace(/(^|\/)(0+)/g, '$1').trim();
    
    const targetDate1 = cleanDate(clientDate || todayServer);
    const targetDate2 = cleanDate(todayServer);

    let totalTrx = 0;
    let totalProfit = 0;

    for (let i = 1; i < data.length; i++) {
      let rowDate = cleanDate(data[i][1]);
      // Mencocokkan tanggal UI Frontend atau tanggal Server
      if (rowDate === targetDate1 || rowDate === targetDate2) {
        totalTrx++;
        // Hitung akumulasi kolom Profit (Index 6 / Kolom G)
        let profitStr = String(data[i][6]).replace(/[^0-9,-]/g, '');
        let profitNum = parseInt(profitStr) || 0;
        totalProfit += profitNum;
      }
    }
    
    SpreadsheetApp.flush(); // Eksekusi mutlak database!
    return { totalTransaksi: totalTrx, totalProfit: totalProfit };
  } catch(e) {
    return { error: e.message };
  }
}

function getData(sheetName) {
  try {
    setupDatabase(); 
    const ss = getDatabase();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol < 1) return []; 
    
    return sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
  } catch (e) { 
    throw new Error("Gagal mengambil data: " + e.message); 
  }
}

function saveData(sheetName, dataArray) {
  try {
    setupDatabase();
    const ss = getDatabase();
    let sheet = ss.getSheetByName(sheetName);

    if (dataArray[0] === "" || dataArray[0] == null) {
       const prefixes = {
         'BrandHP': 'BR', 'SeriHP': 'SR', 'Bank': 'BK',
         'Provider': 'PR', 'Voucher': 'VC', 'Perdana': 'PD',
         'E_Wallet': 'EW', 'PPOB': 'PP', 'ACC': 'AC'
       };
       let prefix = prefixes[sheetName];
       if(prefix) {
         const lastRow = sheet.getLastRow();
         let newId = prefix + "-001";
         if(lastRow > 1) {
           let lastId = sheet.getRange(lastRow, 1).getValue();
           if(lastId && String(lastId).startsWith(prefix)) {
             let num = parseInt(String(lastId).split('-')[1]);
             if(!isNaN(num)) newId = prefix + "-" + (num + 1).toString().padStart(3, '0');
           }
         }
         dataArray[0] = newId;
       }
    }

    dataArray.push(Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'));
    sheet.appendRow(dataArray);
    SpreadsheetApp.flush(); 
    return { status: 'success', message: 'Data berhasil ditambahkan!' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function updateData(sheetName, rowIndex, dataArray) {
  try {
    setupDatabase();
    const ss = getDatabase();
    let sheet = ss.getSheetByName(sheetName);
    dataArray.push(Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'));
    sheet.getRange(rowIndex + 2, 1, 1, dataArray.length).setValues([dataArray]);
    SpreadsheetApp.flush(); 
    return { status: 'success', message: 'DATA BERHASIL DI RUBAH' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function deleteData(sheetName, rowIndex) {
  try {
    const ss = getDatabase();
    ss.getSheetByName(sheetName).deleteRow(rowIndex + 2); 
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Data dihapus!' };
  } catch (e) { return { status: 'error', message: e.message }; }
}

function getDropdownData() {
  const vRaw = getData('Voucher');
  const pRaw = getData('Perdana');
  const aRaw = getData('ACC');
  
  return { 
    brandData: getData('BrandHP').map(r => r[1]), 
    providerData: getData('Provider').map(r => r[1]),
    bankData: getData('Bank').map(r => r[1]),
    ewalletData: getData('E_Wallet').map(r => r[1]),
    ppobData: getData('PPOB').map(r => r[1]),
    voucherData: vRaw.map(r => ({ provider: r[1], nama: r[2], beli: String(r[3]||'').replace(/[^0-9]/g, ''), jual: String(r[4]||'').replace(/[^0-9]/g, ''), stok: r[5] })),
    perdanaData: pRaw.map(r => ({ provider: r[1], nama: r[2], beli: String(r[3]||'').replace(/[^0-9]/g, ''), jual: String(r[4]||'').replace(/[^0-9]/g, ''), stok: r[5] })),
    accData: aRaw.map(r => ({ kategori: r[1], nama: r[2], beli: String(r[3]||'').replace(/[^0-9]/g, ''), jual: String(r[4]||'').replace(/[^0-9]/g, ''), stok: r[5] }))
  };
}

function verifyLogin(username, password) {
  try {
    setupDatabase();
    const ss = getDatabase();
    const sheet = ss.getSheetByName('Users');
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues();
    const inputUser = String(username).trim();
    const inputPass = String(password).trim();
    const matchedUser = data.find(row => String(row[0]).trim() === inputUser && String(row[1]).trim() === inputPass);
    if (matchedUser) return { status: 'success', role: matchedUser[2] };
    return { status: 'error', message: 'Username atau Password salah!' };
  } catch (e) { return { status: 'error', message: 'Error Server: ' + e.message }; }
}