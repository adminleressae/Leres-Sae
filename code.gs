const CONFIG = {
  SPREADSHEET_ID: '1q5nXDOtpHZ588WoudqPqFSIxqUE6y9l7bdOuH0JyfeY',
  FORM_URL: 'https://forms.gle/11gDFYxD5HDBCaU9A',
  // Folder MEDIA yang dipakai bersama oleh upload dan getMedia.
  MEDIA_FOLDER_ID: '1FKMEU6a7aukoWoN90cLJQYwpCAqGMwd9',
  NEWS_FOLDER_ID: '1J2P3hpb7XoRkv_pRw8hhEf-OUtVVFeTS',

  SHEETS: {
    SERVICES: 'SERVICES',
    HISTORY: 'SERVICE_HISTORY',
    USERS: 'TEKNISI DAN ADMIN',
    STOCK_MASTER: 'STOCK_MASTER',
    STOCK_HISTORY: 'STOCK_HISTORY',
    NEWS: 'NEWS',
    MEDIA: 'MEDIA',
    LOCATIONS: 'LOCATIONS',
    SETTINGS: 'SETTINGS'
  },

  DEFAULT_STATUS: 'Barang Diterima',

  STATUS_OPTIONS: [
    'Barang Diterima',
    'Sedang Diproses',
    'Menunggu Pemeriksaan',
    'Sedang Diperiksa',
    'Menunggu Persetujuan',
    'Sedang Dikerjakan',
    'Menunggu Sparepart',
    'Selesai',
    'Siap Diambil',
    'Sudah Diambil',
    'Dibatalkan'
  ],

  ADMIN_USERNAME: 'ADMIN',
  ADMIN_PASSWORD: 'ADMIN'
};

const SERVICE_HEADERS = [
  'ID',
  'created_at',
  'customer_name',
  'phone',
  'service_type',
  'item_name',
  'merk',
  'tipe',
  'keluhan',
  'alamat',
  'estimasi_selesai',
  'status',
  'technician',
  'biaya',
  'notes',
  'admin_update',
  'timestamp_update',
  'tanggal_selesai',
  'form_row',
  'raw_form_data'
];

const HISTORY_HEADERS = [
  'history_id',
  'service_id',
  'old_status',
  'new_status',
  'technician',
  'notes',
  'updated_by',
  'timestamp'
];

const USER_HEADERS = [
  'USERNAME',
  'PASSWORD_HASH',
  'ROLE',
  'STATUS',
  'USER_ID',
  'NAMA',
  'NO_WHATSAPP',
  'SPESIALISASI',
  'CREATED_AT',
  'UPDATED_AT',
  'LAST_LOGIN'
];

const STOCK_HEADERS = [
  'id',
  'name',
  'unit',
  'stock',
  'min_stock',
  'price',
  'account_code',
  'account_name'
];

const STOCK_HISTORY_HEADERS = [
  'date',
  'id',
  'name',
  'type',
  'qty',
  'after',
  'note'
];

const NEWS_HEADERS = [
  'id',
  'title',
  'category',
  'content',
  'imageUrl',
  'status',
  'createdAt'
];

const MEDIA_HEADERS = [
  'ID_MEDIA',
  'TYPE',
  'JUDUL',
  'DESKRIPSI',
  'FILE_ID',
  'FILE_URL',
  'THUMBNAIL_URL',
  'KETERANGAN',
  'STATUS',
  'CREATED_AT',
  'UPDATED_AT',
  'FILE_NAME',
  'MIME_TYPE'
];

const LOCATION_HEADERS = [
  'id',
  'name',
  'address',
  'latitude',
  'longitude',
  'status'
];

const SETTINGS_HEADERS = ['key', 'value'];

/* ==========================================================
   WEB APP
   ========================================================== */

function doGet(e) {
  return json_({
    success: true,
    message: 'LERESSAE API aktif',
    version: 'FINAL-1.4-MEDIA-TITLE-DESCRIPTION-SYNC',
    time: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || 'healthCheck').trim();

    if (PropertiesService.getScriptProperties().getProperty('PROJECT_SHEETS_READY') !== 'true') {
      ensureProjectSheets_();
    }

    switch (action) {
      case 'healthCheck':
        return json_({
          success: true,
          message: 'Google Apps Script terhubung.',
          spreadsheetId: CONFIG.SPREADSHEET_ID
        });

      case 'login':
      case 'loginUser':
        return json_(loginUser_(body.username, body.password));

      case 'loginAdmin':
        return json_(loginAdmin_(body.username, body.password));

      case 'getServices':
        return json_(getServices_(body));

      case 'getMyServices':
        return json_(getMyServices_(body));

      case 'getTechnicians':
        requireToken_(body.token, ['admin']);
        return json_(getTechnicians_());

      case 'getServiceStatus':
        return json_(getServiceStatus_(body.phone));

      case 'getDashboard':
        return json_(getDashboard_(body));

      case 'getTechnicianDashboard':
        return json_(getTechnicianDashboard_(body));

      case 'syncFormResponses':
        requireToken_(body.token, ['admin', 'teknisi']);
        return json_(syncAllFormResponses_({ force: true }));

      case 'cleanupDuplicateServices':
        requireToken_(body.token, ['admin']);
        return json_(cleanupDuplicateServices());

      case 'updateServiceStatus':
        requireToken_(body.token, ['admin', 'teknisi']);
        return json_(updateServiceStatus_(body));

      case 'addTechnician':
        requireToken_(body.token, ['admin']);
        return json_(addTechnician_(body));

      case 'saveTechnician':
        requireToken_(body.token, ['admin']);
        return json_(saveTechnician_(body));

      case 'syncTechnicians':
        requireToken_(body.token, ['admin']);
        return json_(syncTechnicians_(body.users));

      case 'getStock':
        return json_(getStock_());

      case 'getStockHistory':
        return json_(getStockHistory_());

      case 'stockIn':
        return json_(stockIn_(body));

      case 'stockOut':
        return json_(stockOut_(body));

      case 'getNews':
        return json_(getNews_());

      case 'getMedia':
        return json_(getMedia_());

      case 'diagnoseMediaSync':
        requireToken_(body.token, ['admin']);
        return json_(diagnoseMediaSync_());

      case 'migrateExistingMediaMetadata':
        requireToken_(body.token, ['admin']);
        return json_(migrateExistingMediaMetadata_());

      case 'syncMediaMetadata':
        requireToken_(body.token, ['admin']);
        return json_(syncMediaMetadata_(body.records));

      case 'uploadFileToDrive':
        requireToken_(body.token, ['admin']);
        return json_(uploadFileToDrive_(body));

      case 'addMedia':
        requireToken_(body.token, ['admin']);
        return json_(saveMedia_(body, false));

      case 'updateMedia':
        requireToken_(body.token, ['admin']);
        return json_(saveMedia_(body, true));

      case 'deleteMedia':
        requireToken_(body.token, ['admin']);
        return json_(deleteMedia_(body));

      case 'addNews':
        requireToken_(body.token, ['admin']);
        return json_(addNews_(body));

      case 'updateNews':
        requireToken_(body.token, ['admin']);
        return json_(updateNews_(body));

      case 'deleteNews':
        requireToken_(body.token, ['admin']);
        return json_(deleteNews_(body));

      case 'getLocations':
        return json_(getLocations_());

      default:
        return jsonError_('Action tidak dikenali: ' + action);
    }
  } catch (error) {
    console.error('Apps Script error:', error);
    return jsonError_(error && error.message ? error.message : String(error));
  }
}

/* ==========================================================
   SETUP
   ========================================================== */

function setupSystem() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  ensureProjectSheets_();
  ensureDefaultAdmin_();

  try {
    const form = FormApp.openByUrl(CONFIG.FORM_URL);
    try {
      form.setDestination(FormApp.DestinationType.SPREADSHEET, CONFIG.SPREADSHEET_ID);
    } catch (destinationError) {
      console.warn('Destination Form tidak diubah: ' + destinationError.message);
    }
  } catch (formError) {
    console.warn(
      'Form tidak dapat dibuka otomatis. Pastikan akun Apps Script memiliki akses ke Google Form. ' +
      formError.message
    );
  }

  installFormSubmitTrigger_();

  const syncResult = syncAllFormResponses_({ force: true });
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'Setup LERESSAE selesai.',
    spreadsheet: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID + '/edit',
    form: CONFIG.FORM_URL,
    sync: syncResult
  };
}

function setupInitialSheets() {
  ensureProjectSheets_();
  ensureDefaultAdmin_();
  installFormSubmitTrigger_();

  return {
    success: true,
    message: 'Sheet dan akun admin berhasil disiapkan.'
  };
}

function ensureProjectSheets_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  ensureSheet_(ss, CONFIG.SHEETS.SERVICES, SERVICE_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.HISTORY, HISTORY_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.USERS, USER_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.STOCK_MASTER, STOCK_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.STOCK_HISTORY, STOCK_HISTORY_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.NEWS, NEWS_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.MEDIA, MEDIA_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.LOCATIONS, LOCATION_HEADERS);
  ensureSheet_(ss, CONFIG.SHEETS.SETTINGS, SETTINGS_HEADERS);
  PropertiesService.getScriptProperties().setProperty('PROJECT_SHEETS_READY', 'true');
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const firstRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const existing = firstRow.map(function(v) {
    return String(v || '').trim();
  });

  const hasAnyHeader = existing.some(function(v) {
    return v !== '';
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const missing = headers.filter(function(header) {
      return !existing.some(function(current) {
        return current.toLowerCase() === String(header).toLowerCase();
      });
    });

    if (missing.length > 0) {
      const startColumn = Math.max(sheet.getLastColumn(), 0) + 1;
      sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
    }
  }

  sheet.setFrozenRows(1);
  return sheet;
}

function ensureDefaultAdmin_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);

  if (!sheet) {
    throw new Error('Sheet USERS tidak ditemukan.');
  }

  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0].map(String) : USER_HEADERS;

  const usernameCol = findHeaderIndex_(headers, ['USERNAME', 'username', 'user']);
  const roleCol = findHeaderIndex_(headers, ['ROLE', 'role']);

  for (let i = 1; i < values.length; i++) {
    const username = usernameCol >= 0 ? String(values[i][usernameCol] || '').trim() : '';
    if (username.toUpperCase() === CONFIG.ADMIN_USERNAME) {
      return;
    }
  }

  const row = new Array(headers.length).fill('');
  const passCol = findHeaderIndex_(headers, ['PASSWORD_HASH', 'password', 'PASSWORD']);
  const statusCol = findHeaderIndex_(headers, ['STATUS', 'status']);

  if (usernameCol < 0 || passCol < 0 || roleCol < 0 || statusCol < 0) {
    sheet.appendRow([
      CONFIG.ADMIN_USERNAME,
      hashPassword_(CONFIG.ADMIN_PASSWORD),
      'admin',
      'AKTIF'
    ]);
    return;
  }

  row[usernameCol] = CONFIG.ADMIN_USERNAME;
  row[passCol] = hashPassword_(CONFIG.ADMIN_PASSWORD);
  row[roleCol] = 'admin';
  row[statusCol] = 'AKTIF';

  const namaCol = findHeaderIndex_(headers, ['nama', 'NAMA']);
  const waCol = findHeaderIndex_(headers, ['no_whatsapp', 'NO_WHATSAPP', 'whatsapp']);

  if (namaCol >= 0) row[namaCol] = 'Administrator';
  if (waCol >= 0) row[waCol] = '081200000001';

  const createdCol = findHeaderIndex_(headers, ['created_at', 'CREATED_AT']);
  if (createdCol >= 0) row[createdCol] = new Date().toISOString();

  sheet.appendRow(row);
}

/* ==========================================================
   FORM TRIGGER
   ========================================================== */

function installFormSubmitTrigger_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // Hapus semua trigger onFormSubmit milik project ini agar tidak ada trigger ganda.
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  return true;
}

/**
 * SATU-SATUNYA writer utama Google Form -> SERVICES.
 * Setiap response Form memiliki source key berupa nomor baris Form Responses.
 */
function onFormSubmit(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!e) throw new Error('Event Form Submit tidak tersedia.');

    const named = e.namedValues || {};
    const values = e.values || [];
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.SERVICES);

    if (!sheet) throw new Error('Sheet SERVICES tidak ditemukan.');

    const responseSheet =
      ss.getSheetByName('Form Responses 1') || findResponseSheet_(ss);

    let formRow = e.range ? e.range.getRow() : 0;

    const timestamp =
      firstValue_(named, ['Timestamp', 'timestamp']) ||
      (values.length ? values[0] : new Date());

    // Event lama/manual yang tidak punya range tetap dicari ke Form Responses.
    if (!formRow && responseSheet) {
      formRow = findResponseRowByEvent_(responseSheet, timestamp, named, values);
    }

    // Jangan pernah membuat ID acak jika source row tidak diketahui.
    // Ini penting agar sync tidak membuat record baru yang double.
    if (!formRow) {
      throw new Error(
        'Nomor baris respons Google Form tidak dapat ditentukan. ' +
        'Data tidak ditambahkan untuk mencegah duplikasi.'
      );
    }

    const stableId = createFormServiceId_(formRow);
    const existingId = findServiceIdByFormRow_(sheet, formRow);

    const record = {
      ID: existingId || stableId,
      created_at: toIsoOrText_(timestamp),
      customer_name: pickAnswer_(named, [
        'nama', 'nama lengkap', 'nama pelanggan', 'nama pemohon', 'customer'
      ]),
      phone: normalizePhone_(pickAnswer_(named, [
        'whatsapp', 'no whatsapp', 'nomor whatsapp', 'nomor wa',
        'no wa', 'telepon', 'no telepon', 'nomor telepon', 'phone'
      ])),
      service_type: pickAnswer_(named, [
        'jenis layanan', 'jenis servis', 'jenis layanan ',
        'layanan', 'service', 'service type'
      ]),
      item_name: pickAnswer_(named, [
        'nama barang', 'nama mesin', 'jenis barang', 'nama alat',
        'barang', 'mesin', 'mesin yang diservis', 'alat'
      ]),
      merk: pickAnswer_(named, ['merk', 'merek', 'brand']),
      tipe: pickAnswer_(named, ['tipe', 'type', 'model']),
      keluhan: pickAnswer_(named, [
        'keluhan', 'kerusakan yang dialami',
        'konsultasi kerusakan keluhan', 'masalah',
        'kerusakan', 'kendala', 'deskripsi masalah'
      ]),
      alamat: pickAnswer_(named, [
        'alamat', 'alamat lengkap', 'alamat di google maps',
        'lokasi', 'lokasi servis'
      ]),
      estimasi_selesai: pickAnswer_(named, [
        'estimasi selesai', 'tanggal estimasi',
        'jadwal', 'tanggal layanan'
      ]),
      status: CONFIG.DEFAULT_STATUS,
      technician: '',
      biaya: '',
      notes: 'Pengajuan baru dari Google Form.',
      admin_update: 'SYSTEM_FORM',
      timestamp_update: new Date().toISOString(),
      tanggal_selesai: '',
      form_row: formRow,
      raw_form_data: JSON.stringify(named)
    };

    // Data operasional tidak boleh tertimpa saat response Form diproses ulang.
    if (existingId) {
      const old = getServiceById_(existingId);
      record.status = old.status || record.status;
      record.technician = old.technician || '';
      record.biaya = old.biaya || '';
      record.notes = old.notes || record.notes;
      record.admin_update = old.admin_update || record.admin_update;
      record.timestamp_update = old.timestamp_update || record.timestamp_update;
      record.tanggal_selesai = old.tanggal_selesai || '';
    }

    upsertService_(record);

    if (!existingId && !e.suppressEmail) {
      const nama = pickAnswer_(named, ['nama']) || '-';
      const layanan = pickAnswer_(named, ['jenis layanan']) || '-';
      const whatsapp = pickAnswer_(named, [
        'no whatsapp', 'nomor whatsapp', 'whatsapp', 'nomor wa', 'no wa'
      ]) || '-';
      const body =
        'Terdapat permohonan layanan baru pada LERESSAE.\n\n' +
        'Nama          : ' + nama + '\n' +
        'Jenis Layanan : ' + layanan + '\n' +
        'No. WhatsApp  : ' + whatsapp + '\n\n' +
        'Silakan buka dashboard LERESSAE untuk memproses permohonan.\n' +
        'Login Admin LERESSAE: https://adminleressae.github.io/Leres-Sae/';

      MailApp.sendEmail({
        to: 'admin.leressae@gmail.com',
        subject: '🔔 LERESSAE - Permohonan Layanan Baru',
        body: body
      });
    }

    return {
      success: true,
      id: record.ID,
      formRow: formRow,
      updated: !!existingId
    };

  } catch (error) {
    console.error('onFormSubmit error: ' + error.message);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function findResponseRowByEvent_(responseSheet, timestamp, named, values) {
  if (!responseSheet || responseSheet.getLastRow() < 2) return 0;

  const data = responseSheet.getDataRange().getValues();
  const headers = data[0].map(function(v) { return String(v || '').trim(); });

  const targetTimestamp = normalizeTimestampKey_(timestamp);
  const targetPhone = normalizePhone_(pickAnswer_(named, [
    'whatsapp', 'no whatsapp', 'nomor whatsapp', 'nomor wa',
    'no wa', 'telepon', 'no telepon', 'nomor telepon', 'phone'
  ]));
  const targetName = normalizeText_(pickAnswer_(named, [
    'nama', 'nama lengkap', 'nama pelanggan', 'nama pemohon', 'customer'
  ]));

  const timestampCol = findHeaderIndex_(headers, ['Timestamp', 'timestamp']);
  const phoneCol = findHeaderIndex_(headers, [
    'whatsapp', 'no whatsapp', 'nomor whatsapp', 'nomor wa',
    'no wa', 'telepon', 'no telepon', 'nomor telepon', 'phone'
  ]);
  const nameCol = findHeaderIndex_(headers, [
    'nama', 'nama lengkap', 'nama pelanggan', 'nama pemohon', 'customer'
  ]);

  for (let r = data.length - 1; r >= 1; r--) {
    if (timestampCol < 0) break;

    const rowTimestamp = normalizeTimestampKey_(data[r][timestampCol]);

    if (rowTimestamp === targetTimestamp) {
      if (targetPhone && phoneCol >= 0) {
        if (normalizePhone_(data[r][phoneCol]) === targetPhone) {
          return r + 1;
        }
      }

      if (targetName && nameCol >= 0) {
        if (normalizeText_(data[r][nameCol]) === targetName) {
          return r + 1;
        }
      }

      return r + 1;
    }
  }

  // Fallback memakai e.values[0].
  if (values && values.length && timestampCol >= 0) {
    const valueTimestamp = normalizeTimestampKey_(values[0]);

    for (let r = data.length - 1; r >= 1; r--) {
      if (normalizeTimestampKey_(data[r][timestampCol]) === valueTimestamp) {
        return r + 1;
      }
    }
  }

  return 0;
}

function normalizeTimestampKey_(value) {
  if (value instanceof Date) return String(value.getTime());

  const text = String(value || '').trim();
  if (!text) return '';

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return String(date.getTime());
  }

  const m = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (m) {
    const timezone = Session.getScriptTimeZone() || 'Asia/Jakarta';
    const normalized =
      m[1] + '/' + m[2] + '/' + m[3] + ' ' +
      m[4] + ':' + m[5] + ':' + (m[6] || '00');

    try {
      return String(
        Utilities.parseDate(
          normalized,
          timezone,
          'd/M/yyyy H:mm:ss'
        ).getTime()
      );
    } catch (error) {}
  }

  return text.toLowerCase();
}

/**
 * Manual sync aman: memproses response Form dengan source row yang stabil.
 */
function syncFormResponsesNow() {
  return syncAllFormResponses_({ force: true });
}

function syncAllFormResponses_(options) {
  const opts = options || {};
  const force = !!opts.force;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const now = Date.now();
    const lastSync = Number(
      scriptProperties.getProperty('LAST_FORM_SYNC_TS') || '0'
    );

    if (!force && lastSync && now - lastSync < 30000) {
      return {
        success: true,
        skipped: true,
        message: 'Sinkronisasi Form dibatalkan karena cooldown aktif.',
        count: 0
      };
    }

    scriptProperties.setProperty('LAST_FORM_SYNC_TS', String(now));

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const responseSheet =
      ss.getSheetByName('Form Responses 1') || findResponseSheet_(ss);

    if (!responseSheet) {
      return {
        success: false,
        message:
          'Sheet respons Google Form belum ditemukan. ' +
          'Pastikan Google Form terhubung ke spreadsheet ini.'
      };
    }

    const data = responseSheet.getDataRange().getValues();

    if (data.length < 2) {
      return {
        success: true,
        message: 'Belum ada respons Google Form.',
        data: [],
        count: 0
      };
    }

    const headers = data[0].map(function(value) {
      return String(value || '').trim();
    });

    const services = ss.getSheetByName(CONFIG.SHEETS.SERVICES);
    if (!services) throw new Error('Sheet SERVICES tidak ditemukan.');

    let count = 0;
    let inserted = 0;
    let updated = 0;
    const results = [];

    for (let r = 1; r < data.length; r++) {
      if (data[r].every(function(v) {
        return String(v || '').trim() === '';
      })) continue;

      const formRow = r + 1;
      const named = {};

      headers.forEach(function(header, c) {
        if (header) named[header] = [data[r][c]];
      });

      const existingId = findServiceIdByFormRow_(services, formRow);

      try {
        const result = onFormSubmit({
          namedValues: named,
          values: data[r],
          suppressEmail: true,
          range: responseSheet.getRange(
            formRow, 1, 1, data[r].length
          )
        });

        count++;
        if (result.updated) updated++;
        else if (!existingId) inserted++;

        results.push(result);

      } catch (err) {
        results.push({
          success: false,
          row: formRow,
          error: err.message
        });
        console.error(
          'Gagal sinkron row ' + formRow + ': ' + err.message
        );
      }
    }

    SpreadsheetApp.flush();

    return {
      success: true,
      message: 'Sinkronisasi Form selesai tanpa membuat duplikasi.',
      count: count,
      inserted: inserted,
      updated: updated,
      results: results
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Jalankan SEKALI setelah mengganti kode untuk membersihkan
 * data SERVICES yang sudah terlanjur double.
 */
function cleanupDuplicateServices() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const services = ss.getSheetByName(CONFIG.SHEETS.SERVICES);
    const responseSheet =
      ss.getSheetByName('Form Responses 1') || findResponseSheet_(ss);

    if (!services) throw new Error('Sheet SERVICES tidak ditemukan.');
    if (!responseSheet) {
      throw new Error('Sheet Form Responses 1 tidak ditemukan.');
    }

    let data = services.getDataRange().getValues();
    if (data.length < 2) {
      return {
        success: true,
        removed: 0,
        message: 'SERVICES belum memiliki data.'
      };
    }

    const headers = data[0].map(String);
    const idCol = findHeaderIndex_(headers, ['ID', 'id', 'service_id']);
    const formRowCol = findHeaderIndex_(headers, ['form_row', 'FORM_ROW']);
    const createdCol = findHeaderIndex_(headers, ['created_at', 'CREATED_AT']);
    const phoneCol = findHeaderIndex_(headers, ['phone', 'PHONE']);
    const nameCol = findHeaderIndex_(headers, ['customer_name', 'CUSTOMER_NAME']);

    const responseData = responseSheet.getDataRange().getValues();
    const responseHeaders = responseData[0].map(String);
    const responseTimestampCol =
      findHeaderIndex_(responseHeaders, ['Timestamp', 'timestamp']);

    const responseRowsByTimestamp = {};

    for (let r = 1; r < responseData.length; r++) {
      if (responseTimestampCol < 0) continue;

      const key = normalizeTimestampKey_(
        responseData[r][responseTimestampCol]
      );

      if (key) responseRowsByTimestamp[key] = r + 1;
    }

    let mapped = 0;

    // Hubungkan data lama ke source row Form berdasarkan timestamp.
    for (let r = 1; r < data.length; r++) {
      const rowNumber = r + 1;
      const currentFormRow =
        formRowCol >= 0 ? String(data[r][formRowCol] || '').trim() : '';

      if (currentFormRow) continue;
      if (createdCol < 0 || responseTimestampCol < 0) continue;

      const key = normalizeTimestampKey_(data[r][createdCol]);
      const sourceRow = responseRowsByTimestamp[key];

      if (sourceRow) {
        if (formRowCol >= 0) {
          services.getRange(rowNumber, formRowCol + 1)
            .setValue(Number(sourceRow));
        }

        if (idCol >= 0) {
          services.getRange(rowNumber, idCol + 1)
            .setValue(createFormServiceId_(sourceRow));
        }

        mapped++;
      }
    }

    SpreadsheetApp.flush();

    // Baca ulang dan hapus duplicate berdasarkan form_row.
    data = services.getDataRange().getValues();

    const seen = {};
    const deleteRows = [];

    for (let r = 1; r < data.length; r++) {
      const rowNumber = r + 1;
      const formRow =
        formRowCol >= 0 ? String(data[r][formRowCol] || '').trim() : '';

      if (!formRow) continue;

      if (!seen[formRow]) {
        seen[formRow] = rowNumber;
      } else {
        deleteRows.push(rowNumber);
      }
    }

    deleteRows.sort(function(a, b) { return b - a; });

    deleteRows.forEach(function(rowNumber) {
      services.deleteRow(rowNumber);
    });

    SpreadsheetApp.flush();

    return {
      success: true,
      mapped: mapped,
      removed: deleteRows.length,
      message:
        deleteRows.length +
        ' data duplikat lama berhasil dibersihkan.'
    };

  } finally {
    lock.releaseLock();
  }
}

function findResponseSheet_(ss) {
  const formUrl = ss.getFormUrl();

  if (formUrl) {
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      try {
        if (sheet.getFormUrl() === formUrl) {
          return sheet;
        }
      } catch (error) {}
    }
  }

  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (/form responses|tanggapan formulir|respons/i.test(sheets[i].getName())) {
      return sheets[i];
    }
  }

  return null;
}

/* ==========================================================
   SERVICES
   ========================================================== */

function getServices_(payload) {
  // Form submissions are written by onFormSubmit. Do not rescan the entire
  // response sheet while serving a read request; that creates a second writer
  // which can race with the installable form-submit trigger.
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.SERVICES);

  if (!sheet || sheet.getLastRow() < 2) {
    return { success: true, data: [] };
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  const rows = values
    .slice(1)
    .map(function(row) {
      return objectFromRow_(headers, row);
    })
    .filter(function(item) {
      return item.ID || item.id;
    });

  return { success: true, data: rows };
}

function getMyServices_(body) {
  const session = requireToken_(body && body.token, ['admin', 'teknisi']);
  const username = String(body && body.username ? body.username : session.username || '').trim();
  const role = String(session.role || '').trim().toLowerCase();

  const records = getServices_({ skipSync: true, role: role, username: username, forceSync: false }).data || [];
  return { success: true, data: records };
}

function getServiceStatus_(phone) {
  const clean = normalizePhone_(phone);
  if (!clean) return { success: true, data: [] };

  const all = getServices_({ skipSync: true }).data || [];
  const rows = all.filter(function(item) {
    return normalizePhone_(item.phone) === clean;
  });

  return { success: true, data: rows };
}

function getDashboard_(body) {
  const session = requireToken_(body && body.token, ['admin']);
  const records = getServices_({ skipSync: true }).data || [];

  const waitingStatuses = ['Barang Diterima', 'Menunggu Pemeriksaan', 'Menunggu Persetujuan'];
  const progressStatuses = ['Sedang Diperiksa', 'Sedang Dikerjakan', 'Menunggu Sparepart'];
  const completedStatuses = ['Selesai', 'Siap Diambil', 'Sudah Diambil'];
  const cancelledStatuses = ['Dibatalkan'];

  const totalBiaya = records.reduce(function(sum, item) {
    return sum + parseMoney_(item.biaya);
  }, 0);

  return {
    success: true,
    data: {
      total: records.length,
      waiting: records.filter(function(x) { return waitingStatuses.indexOf(x.status) >= 0; }).length,
      progress: records.filter(function(x) { return progressStatuses.indexOf(x.status) >= 0; }).length,
      done: records.filter(function(x) { return completedStatuses.indexOf(x.status) >= 0; }).length,
      cancelled: records.filter(function(x) { return cancelledStatuses.indexOf(x.status) >= 0; }).length,
      totalBiaya: totalBiaya,
      records: records
    }
  };
}

function getTechnicianDashboard_(body) {
  const session = requireToken_(body && body.token, ['teknisi']);
  const username = String(session.username || '').trim();
  const records = getServices_({ skipSync: true, username: username, role: 'teknisi' }).data || [];

  return {
    success: true,
    data: {
      total: records.length,
      assigned: records.filter(function(item) {
        return String(item.technician || '').trim() !== '';
      }).length,
      unassigned: records.filter(function(item) {
        return String(item.technician || '').trim() === '';
      }).length,
      records: records
    }
  };
}

function updateServiceStatus_(body) {
    const serviceId = String(body.serviceId || body.id || '').trim();
    if (!serviceId) throw new Error('serviceId wajib diisi.');

    const token = String(body.token || '').trim();
    const session = requireToken_(token, ['admin', 'teknisi']);

    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.SERVICES);
    if (!sheet) throw new Error('Sheet SERVICES tidak ditemukan.');

    const values = sheet.getDataRange().getValues();
    if (values.length < 2) throw new Error('Data servis kosong.');

    const headers = values[0].map(String);
    const idCol = findHeaderIndex_(headers, ['ID', 'id', 'service_id']);
    if (idCol < 0) throw new Error('Kolom ID tidak ditemukan.');

    let rowNumber = -1;
    let oldRecord = null;

    for (let r = 1; r < values.length; r++) {
      const currentId = String(values[r][idCol] || '');
      if (currentId === serviceId) {
        rowNumber = r + 1;
        oldRecord = objectFromRow_(headers, values[r]);
        break;
      }
    }

    if (rowNumber < 0) throw new Error('Data servis dengan ID ' + serviceId + ' tidak ditemukan.');

    const data = body.data || body;
    const newStatus = String(data.status || '').trim();
    if (CONFIG.STATUS_OPTIONS.indexOf(newStatus) < 0) {
      throw new Error('Status tidak valid: ' + newStatus);
    }

    if (session.role !== 'admin') {
      const allowedForTech = !String(oldRecord.technician || '').trim() || normalizeText_(oldRecord.technician) === normalizeText_(session.username) || normalizeText_(oldRecord.technician) === '';
      if (!allowedForTech) {
        throw new Error('Anda tidak memiliki akses untuk mengubah servis ini.');
      }
    }

    const now = new Date().toISOString();
    const costType = String(data.biaya_tipe || data.BIAYA_TIPE || body.biaya_tipe || '').trim();
    const rawCost = data.biaya_nominal !== undefined ? data.biaya_nominal
      : (data.BIAYA_NOMINAL !== undefined ? data.BIAYA_NOMINAL : body.biaya_nominal);
    let serviceCost = String(data.biaya !== undefined ? data.biaya : oldRecord.biaya || '');
    if (costType.toLowerCase() === 'gratis') {
      serviceCost = 'Gratis';
    } else if (costType.toLowerCase() === 'custom' && rawCost !== undefined && rawCost !== null && rawCost !== '') {
      const amount = Number(String(rawCost).replace(/[^0-9.-]/g, ''));
      if (!isFinite(amount) || amount < 0) throw new Error('Nominal biaya tidak valid.');
      serviceCost = 'Rp ' + Math.round(amount).toLocaleString('id-ID');
    }
    const updated = Object.assign({}, oldRecord, {
      status: newStatus,
      technician: session.role === 'teknisi'
        ? session.username
        : String(data.technician || oldRecord.technician || ''),
      // Teknisi mengirim biaya_tipe/biaya_nominal. Simpan hasilnya ke kolom
      // biaya yang sudah digunakan panel Admin dan kompatibel dengan sheet lama.
      biaya: serviceCost,
      notes: String(data.notes !== undefined ? data.notes : oldRecord.notes || ''),
      admin_update: String(data.admin_update || data.updated_by || session.username || 'ADMIN_1'),
      timestamp_update: now,
      tanggal_selesai: (newStatus === 'Selesai' || newStatus === 'Sudah Diambil') ? (data.tanggal_selesai || now.slice(0, 10)) : (oldRecord.tanggal_selesai || '')
    });

    writeObjectToRow_(sheet, rowNumber, headers, updated);
    appendHistory_(serviceId, oldRecord.status || '', newStatus, updated.technician, updated.notes, updated.admin_update, now);

    return {
      success: true,
      message: 'Status servis berhasil diperbarui.',
      data: updated
    };
}

function upsertService_(record) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.SERVICES);
  if (!sheet) throw new Error('Sheet SERVICES tidak ditemukan.');

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = findHeaderIndex_(headers, ['ID', 'id', 'service_id']);
  const formRowCol = findHeaderIndex_(headers, ['form_row', 'FORM_ROW']);

  let existingRow = -1;
  if (idCol >= 0) {
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idCol] || '') === String(record.ID)) {
        existingRow = r + 1;
        break;
      }
    }
  }

  // Match by source form row as a second idempotency key. The caller holds
  // the script lock while processing form submissions.
  if (existingRow < 0 && formRowCol >= 0 && record.form_row !== '' && record.form_row !== null && record.form_row !== undefined) {
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][formRowCol] || '') === String(record.form_row)) {
        existingRow = r + 1;
        break;
      }
    }
  }

  if (existingRow > 0) {
    writeObjectToRow_(sheet, existingRow, headers, record);
  } else {
    ensureSheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID), CONFIG.SHEETS.SERVICES, SERVICE_HEADERS);
    const refreshed = sheet.getDataRange().getValues();
    const refreshedHeaders = refreshed[0].map(String);
    const row = refreshedHeaders.map(function(header) {
      const value = getObjectField_(record, header);
      return value === undefined ? '' : value;
    });
    sheet.appendRow(row);
  }
}

function appendHistory_(serviceId, oldStatus, newStatus, technician, notes, updatedBy, timestamp) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.HISTORY);
  if (!sheet) throw new Error('Sheet SERVICE_HISTORY tidak ditemukan.');

  sheet.appendRow([
    'HIS-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
    serviceId,
    oldStatus,
    newStatus,
    technician || '',
    notes || '',
    updatedBy || 'ADMIN_1',
    timestamp || new Date().toISOString()
  ]);
}

function addTechnician_(body) {
  const username = String(body.USERNAME || '').trim();
  const password = String(body.password || '');
  const name = String(body.NAMA || '').trim();
  const status = String(body.STATUS || 'AKTIF').trim().toUpperCase();

  if (!username || !password || !name) {
    throw new Error('Nama, username, dan password wajib diisi.');
  }

  if (!['AKTIF', 'NONAKTIF'].includes(status)) {
    throw new Error('Status teknisi tidak valid.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
    if (!sheet) throw new Error('Sheet USERS tidak ditemukan.');

    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const usernameCol = findHeaderIndex_(headers, ['USERNAME', 'username', 'user']);

    if (usernameCol < 0) {
      throw new Error('Kolom USERNAME tidak ditemukan di sheet USERS.');
    }

    for (let r = 1; r < values.length; r++) {
      const savedUsername = String(values[r][usernameCol] || '').trim();
      if (savedUsername.toLowerCase() === username.toLowerCase()) {
        throw new Error('Username sudah digunakan.');
      }
    }

    const now = new Date().toISOString();
    const user = {
      USER_ID: String(body.USER_ID || 'USR-TECH-' + Utilities.getUuid().slice(0, 8).toUpperCase()),
      USERNAME: username,
      PASSWORD_HASH: hashPassword_(password),
      ROLE: 'TEKNISI',
      STATUS: status,
      NAMA: name,
      NO_WHATSAPP: String(body.NO_WHATSAPP || ''),
      SPESIALISASI: String(body.SPESIALISASI || ''),
      CREATED_AT: now,
      UPDATED_AT: now,
      LAST_LOGIN: ''
    };

    const row = headers.map(function(header) {
      const key = String(header).trim().toUpperCase();
      return Object.prototype.hasOwnProperty.call(user, key) ? user[key] : '';
    });

    sheet.appendRow(row);

    return {
      success: true,
      message: 'Teknisi berhasil ditambahkan ke USERS.',
      data: {
        USER_ID: user.USER_ID,
        USERNAME: user.USERNAME,
        NAMA: user.NAMA,
        ROLE: user.ROLE,
        STATUS: user.STATUS
      }
    };
  } finally {
    lock.releaseLock();
  }
}

/* ==========================================================
   LOGIN ADMIN / TEKNISI
   ========================================================== */

function loginAdmin_(username, password) {
  return loginUser_(username, password, 'admin');
}

function loginUser_(username, password, forceRole) {
  const user = String(username || '').trim().toUpperCase();
  const pass = String(password || '');

  if (!user || !pass) {
    return { success: false, message: 'Username dan password wajib diisi.' };
  }

  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet) {
    return { success: false, message: 'Sheet USERS tidak ditemukan.' };
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return { success: false, message: 'Belum ada akun.' };
  }

  const headers = values[0].map(String);
  const userCol = findHeaderIndex_(headers, ['USERNAME', 'username', 'user']);
  const passCol = findHeaderIndex_(headers, ['PASSWORD_HASH', 'password', 'PASSWORD', 'password_hash']);
  const roleCol = findHeaderIndex_(headers, ['ROLE', 'role']);
  const statusCol = findHeaderIndex_(headers, ['STATUS', 'status']);
  const nameCol = findHeaderIndex_(headers, ['NAMA', 'nama', 'name']);

  for (let r = 1; r < values.length; r++) {
    const rowUser = userCol >= 0 ? String(values[r][userCol] || '').trim().toUpperCase() : '';
    const stored = passCol >= 0 ? String(values[r][passCol] || '').trim() : '';
    const role = roleCol >= 0 ? String(values[r][roleCol] || '').trim().toLowerCase() : '';
    const status = statusCol >= 0 ? String(values[r][statusCol] || '').trim().toUpperCase() : '';

    const allowedRole = forceRole ? role === forceRole.toLowerCase() : (role === 'admin' || role === 'teknisi');

    if (rowUser === user && allowedRole && status === 'AKTIF' && passwordMatches_(pass, stored)) {
      const token = Utilities.getUuid() + '.' + Utilities.getUuid();
      const payload = {
        username: user,
        role: role,
        name: nameCol >= 0 ? String(values[r][nameCol] || user) : user,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000)
      };

      PropertiesService.getScriptProperties().setProperty('TOKEN_' + token, JSON.stringify(payload));

      return {
        success: true,
        message: 'Login berhasil.',
        data: {
          username: user,
          role: role,
          name: payload.name,
          token: token
        }
      };
    }
  }

  return { success: false, message: 'Username atau password salah.' };
}

function passwordMatches_(password, stored) {
  if (!stored) return false;

  if (/^[a-f0-9]{64}$/i.test(stored)) {
    return hashPassword_(password) === stored.toLowerCase();
  }

  return password === stored;
}

function requireToken_(token, allowedRoles) {
  const value = String(token || '').trim();
  if (!value) {
    throw new Error('Token admin tidak ditemukan. Silakan login admin.');
  }

  const raw = PropertiesService.getScriptProperties().getProperty('TOKEN_' + value);
  if (!raw) {
    throw new Error('Token admin tidak valid.');
  }

  let session;
  try {
    session = JSON.parse(raw);
  } catch (error) {
    throw new Error('Token admin rusak.');
  }

  if (!session.expiresAt || Date.now() > Number(session.expiresAt)) {
    PropertiesService.getScriptProperties().deleteProperty('TOKEN_' + value);
    throw new Error('Session admin sudah berakhir. Silakan login kembali.');
  }

  if (allowedRoles && allowedRoles.length) {
    const roles = allowedRoles.map(function(r) { return String(r || '').trim().toLowerCase(); });
    const userRole = String(session.role || '').trim().toLowerCase();
    if (roles.indexOf(userRole) < 0) {
      throw new Error('Akses ditolak untuk role ini.');
    }
  }

  return session;
}

/* ==========================================================
   STOCK
   ========================================================== */

function getStock_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK_MASTER);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  const rows = values.slice(1)
    .filter(function(row) {
      return row.some(function(cell) {
        return String(cell || '').trim() !== '';
      });
    })
    .map(function(row) {
      return objectFromRow_(headers, row);
    });

  return { success: true, data: rows };
}

function getStockHistory_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK_HISTORY);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  return {
    success: true,
    data: values.slice(1)
      .filter(function(row) {
        return row.some(function(cell) {
          return String(cell || '').trim() !== '';
        });
      })
      .map(function(row) {
        return objectFromRow_(headers, row);
      })
  };
}

function stockIn_(payload) {
  const id = String(payload.id || '').trim();
  const qty = Number(payload.qty || 0);

  if (!id) return jsonError_('ID barang wajib diisi.');
  if (!Number.isFinite(qty) || qty <= 0) return jsonError_('Jumlah stok masuk harus lebih dari 0.');

  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK_MASTER);
  const result = findStockRow_(sheet, id);
  if (!result) return jsonError_('Barang stok tidak ditemukan.');

  const stockCol = findHeaderIndex_(result.headers, ['stock', 'STOCK', 'jumlah']);
  if (stockCol < 0) return jsonError_('Kolom stock tidak ditemukan.');

  const current = Number(result.row[stockCol] || 0);
  const newStock = current + qty;

  sheet.getRange(result.rowNumber, stockCol + 1).setValue(newStock);

  appendStockHistory_(
    id,
    getValueByAliases_(result.headers, result.row, ['name', 'nama']),
    'MASUK',
    qty,
    newStock,
    payload.note || 'Stok masuk'
  );

  return {
    success: true,
    message: 'Stok masuk berhasil dicatat.',
    data: { id: id, stock: newStock }
  };
}

function stockOut_(payload) {
  const id = String(payload.id || '').trim();
  const qty = Number(payload.qty || 0);

  if (!id) return jsonError_('ID barang wajib diisi.');
  if (!Number.isFinite(qty) || qty <= 0) return jsonError_('Jumlah stok keluar harus lebih dari 0.');

  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK_MASTER);
  const result = findStockRow_(sheet, id);
  if (!result) return jsonError_('Barang stok tidak ditemukan.');

  const stockCol = findHeaderIndex_(result.headers, ['stock', 'STOCK', 'jumlah']);
  if (stockCol < 0) return jsonError_('Kolom stock tidak ditemukan.');

  const current = Number(result.row[stockCol] || 0);
  if (qty > current) return jsonError_('Jumlah keluar melebihi stok saat ini.');

  const newStock = current - qty;
  sheet.getRange(result.rowNumber, stockCol + 1).setValue(newStock);

  appendStockHistory_(
    id,
    getValueByAliases_(result.headers, result.row, ['name', 'nama']),
    'KELUAR',
    qty,
    newStock,
    payload.note || 'Stok keluar'
  );

  return {
    success: true,
    message: 'Stok keluar berhasil dicatat.',
    data: { id: id, stock: newStock }
  };
}

function findStockRow_(sheet, id) {
  if (!sheet || sheet.getLastRow() < 2) return null;

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = findHeaderIndex_(headers, ['id', 'ID', 'kode']);
  if (idCol < 0) return null;

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol] || '').trim() === id) {
      return {
        rowNumber: r + 1,
        row: values[r],
        headers: headers
      };
    }
  }

  return null;
}

function appendStockHistory_(id, name, type, qty, after, note) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.STOCK_HISTORY);
  sheet.appendRow([new Date().toISOString(), id, name || '', type, qty, after, note || '']);
}

/* ==========================================================
   NEWS
   ========================================================== */

function getNews_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.NEWS);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  return {
    success: true,
    data: values.slice(1)
      .filter(function(row) {
        return row.some(function(cell) {
          return String(cell || '').trim() !== '';
        });
      })
      .map(function(row) {
        return objectFromRow_(headers, row);
      })
  };
}

function addNews_(payload) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.NEWS);
  const data = {
    id: payload.id || 'NEWS-' + Date.now(),
    title: payload.title || '',
    category: payload.category || 'Info',
    content: payload.content || '',
    imageUrl: payload.imageUrl || '',
    status: payload.status || 'DRAFT',
    createdAt: new Date().toISOString()
  };

  const headers = sheet.getDataRange().getValues()[0].map(String);
  sheet.appendRow(headers.map(function(header) {
    return getObjectField_(data, header) || '';
  }));

  return { success: true, message: 'Berita berhasil ditambah.', data: data };
}

function updateNews_(payload) {
  const id = String(payload.id || '').trim();
  if (!id) return jsonError_('ID berita wajib diisi.');

  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.NEWS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = findHeaderIndex_(headers, ['id', 'ID']);

  let rowNumber = -1;
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol] || '') === id) {
      rowNumber = r + 1;
      break;
    }
  }

  if (rowNumber < 0) return jsonError_('Berita tidak ditemukan.');

  const old = objectFromRow_(headers, values[rowNumber - 1]);
  const updated = Object.assign({}, old, {
    id: id,
    title: payload.title !== undefined ? payload.title : old.title || '',
    category: payload.category !== undefined ? payload.category : old.category || 'Info',
    content: payload.content !== undefined ? payload.content : old.content || '',
    imageUrl: payload.imageUrl !== undefined ? payload.imageUrl : old.imageUrl || '',
    status: payload.status !== undefined ? payload.status : old.status || 'DRAFT'
  });

  writeObjectToRow_(sheet, rowNumber, headers, updated);
  return { success: true, message: 'Berita berhasil diupdate.', data: updated };
}

function deleteNews_(payload) {
  const id = String(payload.id || '').trim();
  if (!id) return jsonError_('ID berita wajib diisi.');

  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.NEWS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = findHeaderIndex_(headers, ['id', 'ID']);

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol] || '') === id) {
      sheet.deleteRow(r + 1);
      return { success: true, message: 'Berita berhasil dihapus.', data: { id: id } };
    }
  }

  return jsonError_('Berita tidak ditemukan.');
}

/* ==========================================================
   GOOGLE DRIVE MEDIA
   ========================================================== */

function getMedia_() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'media_records_v1';
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      cache.remove(cacheKey);
    }
  }

  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.MEDIA);
  if (!sheet) throw new Error('Sheet MEDIA tidak ditemukan.');

  const rowsByFileId = {};
  let headers = MEDIA_HEADERS;

  if (sheet.getLastRow() >= 1) {
    const values = sheet.getDataRange().getValues();
    headers = values[0].map(String);

    // Pastikan kolom metadata baru tersedia walaupun sheet MEDIA dibuat dari versi lama.
    ensureSheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID), CONFIG.SHEETS.MEDIA, MEDIA_HEADERS);

    const refreshedValues = sheet.getDataRange().getValues();
    headers = refreshedValues[0].map(String);

    const fileIdCol = findHeaderIndex_(headers, ['FILE_ID', 'file_id']);
    refreshedValues.slice(1).forEach(function(row) {
      const item = objectFromRow_(headers, row);
      const fileId = fileIdCol >= 0 ? String(row[fileIdCol] || '').trim() : '';
      if (fileId) rowsByFileId[fileId] = item;
    });
  } else {
    ensureSheet_(SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID), CONFIG.SHEETS.MEDIA, MEDIA_HEADERS);
    headers = sheet.getDataRange().getValues()[0].map(String);
  }

  const indexedRecords = Object.keys(rowsByFileId).map(function(fileId) {
    const saved = rowsByFileId[fileId];
    const mimeType = String(saved.MIME_TYPE || saved.mime_type || '').trim();
    let type = String(saved.TYPE || saved.type || '').trim().toUpperCase();
    if (type !== 'FOTO' && type !== 'VIDEO') {
      type = mimeType.indexOf('video/') === 0 ? 'VIDEO' : (mimeType.indexOf('image/') === 0 ? 'FOTO' : '');
    }
    if (!type) return null;

    const fileName = String(saved.FILE_NAME || saved.file_name || '').trim();
    const legacyMeta = decodeLegacyMediaMetadata_(saved.KETERANGAN || saved.DESKRIPSI || '');
    const judul = String(saved.JUDUL || saved.judul || saved.TITLE || saved.title || legacyMeta.judul || fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') || fileId).trim();
    const deskripsi = String(saved.DESKRIPSI || saved.deskripsi || saved.DESCRIPTION || saved.description || legacyMeta.deskripsi || saved.KETERANGAN || '').trim();

    return {
      ID_MEDIA: saved.ID_MEDIA || saved.id_media || fileId,
      TYPE: type,
      JUDUL: judul,
      DESKRIPSI: deskripsi,
      TITLE: judul,
      DESCRIPTION: deskripsi,
      FILE_ID: fileId,
      FILE_URL: saved.FILE_URL || saved.file_url || driveDirectUrl_(fileId),
      THUMBNAIL_URL: saved.THUMBNAIL_URL || saved.thumbnail_url || 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1200',
      KETERANGAN: deskripsi,
      STATUS: String(saved.STATUS || saved.status || 'AKTIF').toUpperCase(),
      CREATED_AT: saved.CREATED_AT || saved.created_at || '',
      UPDATED_AT: saved.UPDATED_AT || saved.updated_at || '',
      FILE_NAME: fileName,
      MIME_TYPE: mimeType
    };
  }).filter(Boolean);

  if (indexedRecords.length) {
    indexedRecords.sort(function(a, b) {
      return String(b.CREATED_AT).localeCompare(String(a.CREATED_AT));
    });
    return cacheMediaResult_({ success: true, data: indexedRecords });
  }

  // Folder media harus sama dengan folder yang digunakan uploadFileToDrive_().
  const folder = DriveApp.getFolderById(CONFIG.MEDIA_FOLDER_ID);
  const files = folder.getFiles();
  const records = [];

  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed()) continue;

    const mimeType = file.getMimeType();
    const type = mimeType.indexOf('video/') === 0
      ? 'VIDEO'
      : (mimeType.indexOf('image/') === 0 ? 'FOTO' : '');
    if (!type) continue;

    const saved = rowsByFileId[file.getId()] || {};
    const fileDescription = String(file.getDescription() || '').trim();
    const legacyMeta = decodeLegacyMediaMetadata_(
      saved.KETERANGAN || saved.DESKRIPSI || fileDescription || ''
    );

    let judul = String(
      saved.JUDUL ||
      saved.judul ||
      saved.TITLE ||
      saved.title ||
      legacyMeta.judul ||
      ''
    ).trim();

    let deskripsi = String(
      saved.DESKRIPSI ||
      saved.deskripsi ||
      saved.DESCRIPTION ||
      saved.description ||
      legacyMeta.deskripsi ||
      saved.KETERANGAN ||
      fileDescription ||
      ''
    ).trim();

    // Jika sheet lama belum memiliki JUDUL, gunakan nama file sebagai
    // fallback yang stabil, bukan "Judul belum diisi".
    if (!judul) {
      judul = String(file.getName() || '')
        .replace(/\\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
    }

    const record = {
      ID_MEDIA: saved.ID_MEDIA || file.getId(),
      TYPE: saved.TYPE || type,

      // Field canonical yang dipakai frontend.
      JUDUL: judul,
      DESKRIPSI: deskripsi,

      // Alias untuk kompatibilitas frontend/backend lama.
      TITLE: judul,
      DESCRIPTION: deskripsi,

      FILE_ID: file.getId(),
      FILE_URL: driveDirectUrl_(file.getId()),
      THUMBNAIL_URL: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w1200',

      // KETERANGAN tetap menjadi deskripsi.
      KETERANGAN: deskripsi,

      STATUS: String(saved.STATUS || 'AKTIF').toUpperCase(),
      CREATED_AT: saved.CREATED_AT || file.getDateCreated().toISOString(),
      UPDATED_AT: saved.UPDATED_AT || file.getLastUpdated().toISOString(),
      FILE_NAME: file.getName(),
      MIME_TYPE: mimeType
    };

    records.push(record);

    // Register existing Drive files so Admin can edit/remove them.
    // Kolom JUDUL/DESKRIPSI tetap ada karena headers sudah dipastikan terbaru.
    if (!saved.FILE_ID && !saved.file_id) {
      sheet.appendRow(headers.map(function(header) {
        const value = getObjectField_(record, header);
        return value === undefined ? '' : value;
      }));
    }
  }

  records.sort(function(a, b) {
    return String(b.CREATED_AT).localeCompare(String(a.CREATED_AT));
  });

  return cacheMediaResult_({ success: true, data: records });
}

function cacheMediaResult_(result) {
  try {
    CacheService.getScriptCache().put('media_records_v1', JSON.stringify(result), 180);
  } catch (error) {
    console.warn('Cache media tidak dapat disimpan:', error);
  }
  return result;
}

function clearMediaCache_() {
  try {
    CacheService.getScriptCache().remove('media_records_v1');
  } catch (error) {
    console.warn('Cache media tidak dapat dibersihkan:', error);
  }
}

function decodeLegacyMediaMetadata_(value) {
  const text = String(value || '');
  const marker = '[[LERESSAE_MEDIA_V2]]';
  const index = text.indexOf(marker);
  if (index < 0) {
    return { judul: '', deskripsi: '' };
  }

  try {
    const parsed = JSON.parse(text.slice(index + marker.length));
    return {
      judul: String(parsed && parsed.judul || '').trim(),
      deskripsi: String(parsed && parsed.deskripsi || '').trim()
    };
  } catch (error) {
    return { judul: '', deskripsi: '' };
  }
}

function uploadFileToDrive_(payload) {
  const dataUrl = String(payload.dataUrl || '');
  const match = dataUrl.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!match) throw new Error('Format file upload tidak valid.');

  const mimeType = String(payload.mimeType || match[1] || 'application/octet-stream');
  const mediaType = String(payload.mediaType || '').toUpperCase();
  const purpose = String(payload.purpose || 'MEDIA').toUpperCase();
  if (purpose === 'MEDIA' && mediaType === 'FOTO' && mimeType.indexOf('image/') !== 0) {
    throw new Error('File foto harus berformat gambar.');
  }
  if (purpose === 'MEDIA' && mediaType === 'VIDEO' && mimeType.indexOf('video/') !== 0) {
    throw new Error('File video harus berformat video.');
  }

  const rootId = String(payload.rootFolderId || CONFIG.MEDIA_FOLDER_ID).trim();
  let folder;
  if (purpose === 'BERITA') {
    folder = DriveApp.getFolderById(CONFIG.NEWS_FOLDER_ID);
  } else {
    folder = DriveApp.getFolderById(rootId);
    if (purpose !== 'MEDIA') folder = getOrCreateDriveSubfolder_(folder, purpose);
  }

  const bytes = Utilities.base64Decode(match[2]);
  const fileName = String(payload.fileName || ('leressae-' + Date.now())).replace(/[\\/:*?"<>|]/g, '_');
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    file.setTrashed(true);
    throw new Error('File tersimpan, tetapi akses publik Drive tidak dapat diaktifkan. Periksa kebijakan berbagi Google Workspace: ' + sharingError.message);
  }

  if (purpose === 'MEDIA') {
    const uploadJudul = String(payload.JUDUL || payload.judul || '').trim();
    const uploadDeskripsi = String(
      payload.DESKRIPSI || payload.deskripsi || payload.keterangan || ''
    ).trim();

    if (uploadJudul || uploadDeskripsi) {
      file.setDescription(
        '[[LERESSAE_MEDIA_V2]]' +
        JSON.stringify({
          judul: uploadJudul,
          deskripsi: uploadDeskripsi
        })
      );
    }
    clearMediaCache_();
  }
  return {
    success: true,
    message: 'File berhasil diunggah ke Google Drive.',
    data: {
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: driveDirectUrl_(file.getId()),
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w1200',
      webViewUrl: file.getUrl(),
      mimeType: file.getMimeType(),
      folderId: folder.getId()
    }
  };
}

function saveMedia_(payload, isUpdate) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MEDIA);
  if (!sheet) throw new Error('Sheet MEDIA tidak ditemukan.');

  // Menjamin sheet versi lama otomatis memperoleh JUDUL + DESKRIPSI.
  ensureSheet_(ss, CONFIG.SHEETS.MEDIA, MEDIA_HEADERS);

  const mediaId = String(payload.ID_MEDIA || payload.id || '').trim();
  const fileId = String(payload.FILE_ID || payload.fileId || '').trim();

  if (!isUpdate && !fileId) throw new Error('File Drive belum dipilih.');
  if (isUpdate && !mediaId) throw new Error('ID media wajib diisi.');

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = findHeaderIndex_(headers, ['ID_MEDIA', 'id_media']);

  let rowNumber = -1;
  let existing = {};

  if (idCol >= 0) {
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idCol] || '').trim() === mediaId) {
        rowNumber = r + 1;
        existing = objectFromRow_(headers, values[r]);
        break;
      }
    }
  }

  if (isUpdate && rowNumber < 0) {
    throw new Error('Media tidak ditemukan. Muat ulang daftar media lalu coba lagi.');
  }

  const effectiveFileId = fileId || String(existing.FILE_ID || existing.file_id || '').trim();
  if (!effectiveFileId) throw new Error('ID file Google Drive tidak tersedia.');

  const file = DriveApp.getFileById(effectiveFileId);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingError) {
    throw new Error('Akses publik file Drive gagal diatur: ' + sharingError.message);
  }

  const now = new Date().toISOString();

  // Metadata baru disimpan di kolom terpisah.
  // KETERANGAN tetap diisi sebagai deskripsi untuk kompatibilitas versi lama.
  const existingLegacy = decodeLegacyMediaMetadata_(existing.KETERANGAN || existing.DESKRIPSI || file.getDescription() || '');

  const judul = String(
    payload.JUDUL !== undefined ? payload.JUDUL :
    (payload.TITLE !== undefined
      ? payload.TITLE
      : (existing.JUDUL || existing.TITLE || existingLegacy.judul || ''))
  ).trim();

  const deskripsi = String(
    payload.DESKRIPSI !== undefined ? payload.DESKRIPSI :
    (payload.DESCRIPTION !== undefined
      ? payload.DESCRIPTION
      : (existing.DESKRIPSI || existing.DESCRIPTION || existingLegacy.deskripsi || ''))
  ).trim();

  const record = {
    ID_MEDIA: mediaId || 'MEDIA-' + Utilities.getUuid().slice(0, 12).toUpperCase(),
    TYPE: String(
      payload.TYPE || payload.type || existing.TYPE ||
      (file.getMimeType().indexOf('video/') === 0 ? 'VIDEO' : 'FOTO')
    ).toUpperCase(),

    JUDUL: judul,
    DESKRIPSI: deskripsi,

    FILE_ID: effectiveFileId,
    FILE_URL: driveDirectUrl_(effectiveFileId),
    THUMBNAIL_URL: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(effectiveFileId) + '&sz=w1200',

    KETERANGAN: deskripsi,

    STATUS: String(payload.STATUS || payload.status || existing.STATUS || 'AKTIF').toUpperCase(),
    CREATED_AT: existing.CREATED_AT || now,
    UPDATED_AT: now,
    FILE_NAME: file.getName(),
    MIME_TYPE: file.getMimeType()
  };

  // Simpan metadata juga di Drive sebagai cadangan. Ini berguna bila
  // sheet pernah dibuat dari versi lama atau metadata perlu dipulihkan.
  file.setDescription(
    '[[LERESSAE_MEDIA_V2]]' +
    JSON.stringify({
      judul: judul,
      deskripsi: deskripsi
    })
  );

  const row = headers.map(function(header) {
    const value = getObjectField_(record, header);
    return value === undefined ? '' : value;
  });

  if (rowNumber > 0) {
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);

    if (fileId && existing.FILE_ID && String(existing.FILE_ID) !== fileId) {
      try {
        DriveApp.getFileById(String(existing.FILE_ID)).setTrashed(true);
      } catch (ignored) {}
    }
  } else {
    sheet.appendRow(row);
  }

  SpreadsheetApp.flush();
  clearMediaCache_();

  return {
    success: true,
    message: isUpdate ? 'Media berhasil diperbarui.' : 'Media berhasil ditambahkan.',
    data: record
  };
}


function migrateExistingMediaMetadata_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MEDIA);
  if (!sheet) throw new Error('Sheet MEDIA tidak ditemukan.');

  ensureSheet_(ss, CONFIG.SHEETS.MEDIA, MEDIA_HEADERS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const fileIdCol = findHeaderIndex_(headers, ['FILE_ID', 'file_id']);
  const titleCol = findHeaderIndex_(headers, ['JUDUL', 'judul', 'TITLE', 'title']);
  const descCol = findHeaderIndex_(headers, ['DESKRIPSI', 'deskripsi', 'DESCRIPTION', 'description']);
  const ketCol = findHeaderIndex_(headers, ['KETERANGAN', 'keterangan']);

  let updated = 0;
  for (let r = 1; r < values.length; r++) {
    const fileId = fileIdCol >= 0 ? String(values[r][fileIdCol] || '').trim() : '';
    if (!fileId) continue;

    let file;
    try { file = DriveApp.getFileById(fileId); } catch (e) { continue; }

    const rowObj = objectFromRow_(headers, values[r]);
    const meta = decodeLegacyMediaMetadata_(rowObj.KETERANGAN || rowObj.DESKRIPSI || file.getDescription() || '');
    const title = String(rowObj.JUDUL || rowObj.TITLE || meta.judul || '').trim();
    const description = String(rowObj.DESKRIPSI || rowObj.DESCRIPTION || meta.deskripsi || '').trim();

    if (titleCol >= 0) sheet.getRange(r + 1, titleCol + 1).setValue(title);
    if (descCol >= 0) sheet.getRange(r + 1, descCol + 1).setValue(description);
    if (ketCol >= 0) sheet.getRange(r + 1, ketCol + 1).setValue(description);

    try {
      file.setDescription('[[LERESSAE_MEDIA_V2]]' + JSON.stringify({ judul: title, deskripsi: description }));
    } catch (e) {}
    updated++;
  }

  SpreadsheetApp.flush();
  clearMediaCache_();
  return { success: true, updated: updated, message: updated + ' media berhasil dimigrasikan.' };
}

function diagnoseMediaSync_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MEDIA);
  if (!sheet) throw new Error('Sheet MEDIA tidak ditemukan.');

  ensureSheet_(ss, CONFIG.SHEETS.MEDIA, MEDIA_HEADERS);

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  const idCol = findHeaderIndex_(headers, ['ID_MEDIA', 'id_media']);
  const titleCol = findHeaderIndex_(headers, ['JUDUL', 'judul', 'TITLE', 'title']);
  const descCol = findHeaderIndex_(headers, ['DESKRIPSI', 'deskripsi', 'DESCRIPTION', 'description']);
  const fileIdCol = findHeaderIndex_(headers, ['FILE_ID', 'file_id']);

  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const fileId = fileIdCol >= 0 ? String(values[r][fileIdCol] || '').trim() : '';
    if (!fileId) continue;

    rows.push({
      ID_MEDIA: idCol >= 0 ? String(values[r][idCol] || '').trim() : '',
      JUDUL: titleCol >= 0 ? String(values[r][titleCol] || '').trim() : '',
      DESKRIPSI: descCol >= 0 ? String(values[r][descCol] || '').trim() : '',
      FILE_ID: fileId
    });
  }

  return {
    success: true,
    version: 'MEDIA-SYNC-TITLE-DESCRIPTION-FINAL',
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    mediaFolderId: CONFIG.MEDIA_FOLDER_ID,
    sheetName: CONFIG.SHEETS.MEDIA,
    headers: headers,
    count: rows.length,
    rows: rows
  };
}

function syncMediaMetadata_(records) {
  if (!Array.isArray(records)) {
    throw new Error('Data metadata media tidak valid.');
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MEDIA);
  if (!sheet) throw new Error('Sheet MEDIA tidak ditemukan.');

  ensureSheet_(ss, CONFIG.SHEETS.MEDIA, MEDIA_HEADERS);

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);

  const idCol = findHeaderIndex_(headers, ['ID_MEDIA', 'id_media']);
  const fileIdCol = findHeaderIndex_(headers, ['FILE_ID', 'file_id']);
  const titleCol = findHeaderIndex_(headers, ['JUDUL', 'judul', 'TITLE', 'title']);
  const descCol = findHeaderIndex_(headers, ['DESKRIPSI', 'deskripsi', 'DESCRIPTION', 'description']);
  const ketCol = findHeaderIndex_(headers, ['KETERANGAN', 'keterangan']);

  if (idCol < 0 && fileIdCol < 0) {
    throw new Error('Kolom ID_MEDIA atau FILE_ID tidak ditemukan.');
  }

  let updated = 0;

  records.forEach(function(item) {
    const id = String(item.ID_MEDIA || item.id_media || item.id || '').trim();
    const fileId = String(item.FILE_ID || item.fileId || item.file_id || '').trim();
    const judul = String(item.JUDUL || item.judul || item.TITLE || item.title || '').trim();
    const deskripsi = String(item.DESKRIPSI || item.deskripsi || item.DESCRIPTION || item.description || item.KETERANGAN || '').trim();

    if (!id && !fileId) return;

    for (let r = 1; r < values.length; r++) {
      const rowId = idCol >= 0 ? String(values[r][idCol] || '').trim() : '';
      const rowFileId = fileIdCol >= 0 ? String(values[r][fileIdCol] || '').trim() : '';

      if ((id && rowId === id) || (fileId && rowFileId === fileId)) {
        if (titleCol >= 0) sheet.getRange(r + 1, titleCol + 1).setValue(judul);
        if (descCol >= 0) sheet.getRange(r + 1, descCol + 1).setValue(deskripsi);
        if (ketCol >= 0) sheet.getRange(r + 1, ketCol + 1).setValue(deskripsi);

        if (fileId) {
          try {
            const driveFile = DriveApp.getFileById(fileId);
            driveFile.setDescription('[[LERESSAE_MEDIA_V2]]' + JSON.stringify({
              judul: judul,
              deskripsi: deskripsi
            }));
          } catch (driveError) {
            console.warn('Metadata Drive tidak dapat diperbarui untuk ' + fileId + ': ' + driveError.message);
          }
        }

        updated++;
        break;
      }
    }
  });

  SpreadsheetApp.flush();
  clearMediaCache_();

  return {
    success: true,
    message: updated + ' metadata media berhasil disinkronkan.',
    updated: updated
  };
}

function deleteMedia_(payload) {
  const mediaId = String(payload.ID_MEDIA || payload.id || '').trim();
  if (!mediaId) throw new Error('ID media wajib diisi.');
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.MEDIA);
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Media tidak ditemukan.');
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = findHeaderIndex_(headers, ['ID_MEDIA', 'id_media']);
  const fileIdCol = findHeaderIndex_(headers, ['FILE_ID', 'file_id']);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol] || '') !== mediaId) continue;
    const fileId = fileIdCol >= 0 ? String(values[r][fileIdCol] || '') : '';
    if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
    sheet.deleteRow(r + 1);
    clearMediaCache_();
    return { success: true, message: 'Media dan file Drive berhasil dihapus.', data: { ID_MEDIA: mediaId } };
  }
  throw new Error('Media tidak ditemukan.');
}

function getOrCreateDriveSubfolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function driveDirectUrl_(fileId) {
  return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(fileId);
}

/* ==========================================================
   LOCATIONS
   ========================================================== */

function getLocations_() {
  // Tabel lokasi admin bersumber langsung dari jawaban Google Form.
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Form Responses 1') || findResponseSheet_(ss);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(normalizeText_);
  const getValue = function(row, aliases) {
    for (let i = 0; i < aliases.length; i++) {
      const index = headers.indexOf(normalizeText_(aliases[i]));
      if (index >= 0) return String(row[index] || '').trim();
    }
    return '';
  };

  const data = values.slice(1)
    .filter(function(row) {
      return row.some(function(cell) { return String(cell || '').trim() !== ''; });
    })
    .map(function(row) {
      const damage = getValue(row, ['kerusakan yang dialami', 'konsultasi kerusakan', 'keluhan']);
      const serviceType = getValue(row, ['jenis layanan', 'jenis service', 'service type']);
      return {
        date: getValue(row, ['timestamp', 'tanggal']),
        phone: getValue(row, ['no whatsapp', 'nomor whatsapp', 'nomor wa', 'whatsapp', 'phone']),
        name: getValue(row, ['nama', 'name']),
        address: getValue(row, ['alamat', 'address']),
        mapsUrl: getValue(row, ['alamat di google maps', 'google maps', 'link google maps', 'maps']),
        notes: [damage, serviceType].filter(Boolean).join(' • ')
      };
    });

  return { success: true, data: data };
}

function getTechnicians_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, data: [] };
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const rows = values.slice(1).map(function(row) {
    const item = objectFromRow_(headers, row);
    return {
      USER_ID: item.USER_ID || item.user_id || '',
      USERNAME: item.USERNAME || item.username || '',
      ROLE: item.ROLE || item.role || '',
      STATUS: item.STATUS || item.status || '',
      NAMA: item.NAMA || item.nama || '',
      NO_WHATSAPP: item.NO_WHATSAPP || item.no_whatsapp || '',
      SPESIALISASI: item.SPESIALISASI || item.spesialisasi || '',
      CREATED_AT: item.CREATED_AT || item.created_at || '',
      UPDATED_AT: item.UPDATED_AT || item.updated_at || '',
      LAST_LOGIN: item.LAST_LOGIN || item.last_login || ''
    };
  }).filter(function(item) {
    const role = String(item.ROLE || '').trim().toLowerCase();
    return (role === 'teknisi' || role === 'technician') && item.USERNAME;
  });
  return { success: true, data: rows };
}

function saveTechnician_(body) {
  const username = String(body.username || body.USERNAME || '').trim();
  const previousUsername = String(body.previousUsername || username).trim();
  const name = String(body.name || body.NAMA || '').trim();
  const password = String(body.password || '');
  const status = String(body.status || body.STATUS || 'AKTIF').trim().toUpperCase();
  if (!username || !name) throw new Error('Nama dan username teknisi wajib diisi.');
  if (!['AKTIF', 'NONAKTIF'].includes(status)) throw new Error('Status teknisi tidak valid.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.USERS);
    if (!sheet) throw new Error('Sheet USERS tidak ditemukan.');
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(String);
    const usernameCol = findHeaderIndex_(headers, ['USERNAME', 'username', 'user']);
    const roleCol = findHeaderIndex_(headers, ['ROLE', 'role']);
    if (usernameCol < 0 || roleCol < 0) throw new Error('Kolom USERNAME atau ROLE tidak ditemukan.');

    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      const savedUsername = String(values[i][usernameCol] || '').trim().toLowerCase();
      const savedRole = String(values[i][roleCol] || '').trim().toLowerCase();
      if (savedUsername === username.toLowerCase() && savedUsername !== previousUsername.toLowerCase()) {
        throw new Error('Username teknisi sudah digunakan.');
      }
      if (savedUsername === previousUsername.toLowerCase()) {
        if (savedRole !== 'teknisi' && savedRole !== 'technician') throw new Error('Username sudah dipakai akun non-Teknisi.');
        rowIndex = i;
      }
    }
    if (rowIndex < 0 && !password) throw new Error('Password wajib diisi untuk akun baru.');

    const existing = rowIndex >= 0 ? objectFromRow_(headers, values[rowIndex]) : {};
    const now = new Date().toISOString();
    const user = Object.assign({}, existing, {
      USER_ID: existing.USER_ID || existing.user_id || 'USR-TECH-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
      USERNAME: username,
      ROLE: 'TEKNISI',
      STATUS: status,
      NAMA: name,
      NO_WHATSAPP: String(body.phone || body.NO_WHATSAPP || existing.NO_WHATSAPP || ''),
      SPESIALISASI: String(body.specialization || body.SPESIALISASI || existing.SPESIALISASI || ''),
      CREATED_AT: existing.CREATED_AT || now,
      UPDATED_AT: now,
      LAST_LOGIN: existing.LAST_LOGIN || ''
    });
    if (password) user.PASSWORD_HASH = /^[a-f0-9]{64}$/i.test(password) ? password.toLowerCase() : hashPassword_(password);
    if (!user.PASSWORD_HASH) throw new Error('Password teknisi belum tersedia.');

    const row = headers.map(function(header) {
      const value = getObjectField_(user, header);
      return value === undefined ? '' : value;
    });
    if (rowIndex >= 0) sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([row]);
    else sheet.appendRow(row);

    return { success: true, message: 'Akun Teknisi tersimpan di server.', data: { USERNAME: username, NAMA: name, ROLE: 'TEKNISI', STATUS: status } };
  } finally {
    lock.releaseLock();
  }
}

function syncTechnicians_(users) {
  if (!Array.isArray(users)) throw new Error('Daftar akun Teknisi tidak valid.');
  const results = users.map(function(user) {
    return saveTechnician_(user || {});
  });
  return { success: true, message: 'Akun Teknisi berhasil disinkronkan.', count: results.length, data: results.map(function(result) { return result.data; }) };
}

/* ==========================================================
   SETTINGS
   ========================================================== */

function getSettings_() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (!sheet || sheet.getLastRow() < 2) return {};

  const values = sheet.getDataRange().getValues();
  const obj = {};

  for (let r = 1; r < values.length; r++) {
    const key = String(values[r][0] || '').trim();
    if (key) obj[key] = values[r][1] ?? '';
  }

  return obj;
}

function setSetting_(key, value) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0] || '').trim() === String(key)) {
      sheet.getRange(r + 1, 2).setValue(value);
      return;
    }
  }

  sheet.appendRow([key, value]);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function parseBody_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {}
  }
  return e.parameter || {};
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(message, data) {
  return json_({ success: false, message: message || 'Request gagal.', data: data || {} });
}

function createServiceId_() {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyyMMdd-HHmmss');
  return 'SRV-' + stamp + '-' + Math.floor(100 + Math.random() * 900);
}

function createFormServiceId_(formRow) {
  return 'SRV-FORM-' + String(formRow).trim();
}

function findServiceIdByFormRow_(sheet, formRow) {
  if (!formRow || !sheet || sheet.getLastRow() < 2) return '';

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const rowCol = findHeaderIndex_(headers, ['form_row', 'FORM_ROW']);
  const idCol = findHeaderIndex_(headers, ['ID', 'id', 'service_id']);

  if (rowCol < 0 || idCol < 0) return '';

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][rowCol]) === String(formRow)) {
      return String(values[r][idCol] || '');
    }
  }

  return '';
}

function getServiceById_(serviceId) {
  const data = getServices_({ skipSync: true }).data || [];
  return data.find(function(item) {
    return String(item.ID || item.id || '') === String(serviceId);
  }) || {};
}

function objectFromRow_(headers, row) {
  const obj = {};
  headers.forEach(function(header, index) {
    obj[header] = serializeValue_(row[index]);
  });
  obj.id = obj.ID || obj.id || '';
  return obj;
}

function writeObjectToRow_(sheet, rowNumber, headers, object) {
  const row = headers.map(function(header) {
    const value = getObjectField_(object, header);
    return value === undefined ? '' : value;
  });

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

function getObjectField_(object, header) {
  if (Object.prototype.hasOwnProperty.call(object, header)) {
    return object[header];
  }

  const lower = String(header).trim().toLowerCase();
  const aliases = {
    id: ['ID', 'id', 'service_id'],
    username: ['USERNAME', 'username', 'user'],
    password_hash: ['PASSWORD_HASH', 'password_hash', 'password', 'PASSWORD'],
    role: ['ROLE', 'role'],
    status: ['STATUS', 'status'],
    name: ['name', 'nama'],
    created_at: ['created_at', 'CREATED_AT']
  };

  const candidates = aliases[lower];
  if (candidates) {
    for (let i = 0; i < candidates.length; i++) {
      if (Object.prototype.hasOwnProperty.call(object, candidates[i])) {
        return object[candidates[i]];
      }
    }
  }

  const key = Object.keys(object).find(function(k) {
    return k.toLowerCase() === lower;
  });

  return key !== undefined ? object[key] : undefined;
}

function findHeaderIndex_(headers, aliases) {
  for (let i = 0; i < headers.length; i++) {
    const current = String(headers[i] || '').trim().toLowerCase();

    for (let j = 0; j < aliases.length; j++) {
      if (current === String(aliases[j]).trim().toLowerCase()) {
        return i;
      }
    }
  }

  return -1;
}

function getValueByAliases_(headers, row, aliases) {
  const index = findHeaderIndex_(headers, aliases);
  return index >= 0 ? row[index] : '';
}

function firstValue_(namedValues, possibleKeys) {
  for (let i = 0; i < possibleKeys.length; i++) {
    const key = possibleKeys[i];
    if (namedValues && namedValues[key] !== undefined) {
      const value = namedValues[key];
      return Array.isArray(value) ? value[0] : value;
    }
  }

  const wanted = possibleKeys.map(normalizeText_);
  const keys = Object.keys(namedValues || {});
  for (let k = 0; k < keys.length; k++) {
    if (wanted.indexOf(normalizeText_(keys[k])) >= 0) {
      const value = namedValues[keys[k]];
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return '';
}

function pickAnswer_(namedValues, keywords) {
  const keys = Object.keys(namedValues || {});

  for (let i = 0; i < keywords.length; i++) {
    const wanted = normalizeText_(keywords[i]);

    for (let k = 0; k < keys.length; k++) {
      const actual = normalizeText_(keys[k]);

      if (actual === wanted || actual.indexOf(wanted) >= 0 || wanted.indexOf(actual) >= 0) {
        return firstValue_(namedValues, [keys[k]]);
      }
    }
  }

  return '';
}

function normalizeText_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizePhone_(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.indexOf('62') === 0) return phone;
  if (phone.indexOf('0') === 0) return '62' + phone.slice(1);
  return phone;
}

function parseMoney_(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  return Number(digits || 0);
}

function serializeValue_(value) {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? '' : value;
}

function toIsoOrText_(value) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value || '').trim();
  if (!text) return '';

  // Google Form timestamps commonly arrive as dd/MM/yyyy HH:mm:ss text.
  // Parse that format explicitly so 01/10 is always 1 October in Indonesia.
  const localTimestamp = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (localTimestamp) {
    const timezone = Session.getScriptTimeZone() || 'Asia/Jakarta';
    const pattern = localTimestamp[6] ? 'd/M/yyyy H:mm:ss' : 'd/M/yyyy H:mm';
    try {
      return Utilities.parseDate(text.replace(',', ''), timezone, pattern).toISOString();
    } catch (error) {
      return text;
    }
  }

  // Unambiguous ISO values are safe to parse with Date.
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return text;
}

function hashPassword_(password) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password), Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function getVisibleServicesForUser_(username, role) {
  // Antrean pengajuan pelanggan dapat dilihat oleh semua akun Teknisi.
  return getServices_({ skipSync: true }).data || [];
}