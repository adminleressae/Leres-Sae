// Externalized from Untitled-1.html; original script order preserved.
const CONFIG = {
            API_URL:'https://script.google.com/macros/s/AKfycbwb2b0JdHcdW4xLshDMY4wtAZ8qpICl3vb9UmFSQffBgmwqHKQ2GRy20xkvQW6T8cnpTA/exec',
            DEV_MODE: false,
            FORM_URL: 'https://forms.gle/11gDFYxD5HDBCaU9A',
            SERVICE_SPREADSHEET_ID: '1q5nXDOtpHZ588WoudqPqFSIxqUE6y9l7bdOuH0JyfeY',
            SERVICE_SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1q5nXDOtpHZ588WoudqPqFSIxqUE6y9l7bdOuH0JyfeY/edit?resourcekey=&gid=728576356#gid=728576356',
            SERVICE_SPREADSHEET_GID: '728576356',
            TIMEZONE: 'Asia/Jakarta',
            GOOGLE_DRIVE_ROOT_FOLDER_ID: '1FKMEU6a7aukoWoN90cLJQYwpCAqGMwd9',

            statusOptions: [
                'Sedang Diproses',
                'Selesai'
            ]
        };
        const APP_CONFIG = CONFIG;
        const API_STATUS = { UNCONFIGURED: 'unconfigured', CONNECTING: 'connecting', CONNECTED: 'connected', DISCONNECTED: 'disconnected', PARTIAL: 'partial', DEVELOPMENT: 'development' };
        window.__API_CONNECTION_STATUS__ = { status: CONFIG.API_URL ? API_STATUS.CONNECTING : API_STATUS.UNCONFIGURED, message: CONFIG.API_URL ? 'Memeriksa API…' : 'API belum dikonfigurasi.' };
        const API_ACTIONS = new Set([
            'healthCheck','loginAdmin','loginUser','saveTechnician','syncTechnicians','getTechnicians','getServices','getServiceStatus','getDashboard',
            'syncFormResponses','updateServiceStatus','getStock','getStockAdditional','getStockHistory',
            'stockIn','stockOut','getNews','addNews','updateNews','deleteNews','getLocations',
            'getMedia','uploadFileToDrive','uploadMedia','addMedia','updateMedia','deleteMedia', 'syncMediaMetadata', 'migrateExistingMediaMetadata'
        ]); // Expanded only after a successful action response.


        function isApiConfigured() { return Boolean(CONFIG.API_URL && CONFIG.API_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL'); }


        function isApiActionAvailable(action) { return isApiConfigured() && API_ACTIONS.has(action); }


        function handleApiError(action, error) {
            console.warn('API ' + action + ' gagal:', error);
            window.__API_CONNECTION_STATUS__ = { status: API_STATUS.DISCONNECTED, message: 'Backend tidak dapat dihubungi.' };
            return 'Backend tidak dapat dihubungi.';
        }
        const STORAGE_KEYS = {
            services: 'leressae_service_records',
            adminSession: 'leressae_admin_session',
            clientSession: 'leressae_client_session',
            technicianSession: 'leressae_technician_session',
            adminToken: 'leressae_admin_token',
            clientToken: 'leressae_client_token',
            technicianUsers: 'leressae_technician_users',
            technicianBackendUsers: 'leressae_technician_backend_users',
            serviceHistory: 'leressae_service_history',
            stock: 'leressae_stock_records',
            stockHistory: 'leressae_stock_history',
            media: 'leressae_media_records',
            adminLastPage: 'leressae_admin_last_page',
            technicianLastPage: 'leressae_technician_last_page'
        };
        const layananToggle = document.getElementById('layananToggle');
        const layananMenu = document.getElementById('layananMenu');
        const loginToggle = document.getElementById('loginToggle');
        const loginMenu = document.getElementById('loginMenu');
        let currentLoginRole = 'admin';
        (function clearLegacyDummyData(){
            try {
                localStorage.removeItem('leressae_technician_demo_records');
                localStorage.removeItem('leressae_technician_proofs');
                const mediaRaw = localStorage.getItem(STORAGE_KEYS.media);
                if (mediaRaw) {
                    const media = JSON.parse(mediaRaw);
                    if (Array.isArray(media)) {
                        const cleaned = media.filter(item => {
                            const id = String(item?.ID_MEDIA || item?.id_media || item?.id || '');
                            const url = String(item?.FILE_URL || item?.fileUrl || item?.url || '');
                            return !/^MEDIA-(IMG|VID)-\d+$/i.test(id) && !/^media-(?:vidio-)?\d+\.(?:jpg|jpeg|png|webp|mp4)$/i.test(url);
                        });
                        localStorage.setItem(STORAGE_KEYS.media, JSON.stringify(cleaned));
                    }
                }
                const devUsersRaw = localStorage.getItem(STORAGE_KEYS.technicianUsers);
                if (devUsersRaw) {
                    const users = JSON.parse(devUsersRaw);
                    if (Array.isArray(users)) {
                        const cleanedUsers = users.filter(user => {
                            const username = String(user?.USERNAME || user?.username || '').toLowerCase();
                            return !['teknisi','teknisi_andi','teknisi_doni','admin_1'].includes(username);
                        });
                        if (cleanedUsers.length) localStorage.setItem(STORAGE_KEYS.technicianUsers, JSON.stringify(cleanedUsers));
                        else localStorage.removeItem(STORAGE_KEYS.technicianUsers);
                    }
                }
            } catch (error) {
                console.warn('Pembersihan data dummy lama gagal:', error);
            }
        })();

        window.setTimeout(function() {
            try { syncRoleNavbar(); } catch (error) { console.warn('Sinkronisasi navbar gagal:', error); }
        }, 0);


        function normalizePhone(value) {
            return String(value || '').replace(/\D+/g, '');
        }


        function formatDate(value) {
            if (!value) return '-';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return value;
            }
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }


        function escapeHtml(value) {
            return String(value || '').replace(/[&<>"']/g, (char) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[char]));
        }


        function normalizeServiceStatus(status) {
            const raw = String(status || '').trim().toLowerCase();
            if (raw === 'selesai' || raw === 'siap diambil' || raw === 'sudah diambil') return 'Selesai';
            return 'Sedang Diproses';
        }


        function getStatusClass(status) {
            return normalizeServiceStatus(status) === 'Selesai' ? 'done' : 'progress';
        }


        function getServiceDisplayStatus(status) {
            return normalizeServiceStatus(status);
        }


        function formatDateTimeValue(value) {
            if (!value) return '-';
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return String(value);
            return d.toLocaleString('id-ID', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
        }


        function formatRupiah(value) {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 0) return 'Rp 0';
            return 'Rp ' + Math.round(n).toLocaleString('id-ID');
        }


        function normalizeServiceCost(item) {
            const tipe = String(item?.biaya_tipe || item?.BIAYA_TIPE || '').trim();
            const n = Number(item?.biaya_nominal ?? item?.BIAYA_NOMINAL);
            if (tipe.toLowerCase() === 'gratis') return {tipe:'Gratis',nominal:0,label:'Gratis'};
            if (tipe.toLowerCase() === 'custom' && Number.isFinite(n)) return {tipe:'Custom',nominal:Math.max(0,Math.round(n)),label:formatRupiah(n)};
            return {tipe:'',nominal:null,label:'Belum ditentukan'};
        }


        function getServiceProofUrl(item) {
            const value = String(item?.bukti_foto ?? item?.BUKTI_FOTO ?? item?.proof_photo ?? '').trim();
            if (/^https?:\/\//i.test(value) || /^data:image\/(png|jpe?g|webp);/i.test(value)) return value;
            return '';
        }


        function safeExternalUrl(value) {
            const v=String(value||'').trim();
            return /^https?:\/\//i.test(v) ? v : '';
        }


        function getAdminCompletedMap() {
            try {
                const raw = JSON.parse(localStorage.getItem('leressae_admin_completed_services') || '{}');
                return raw && typeof raw === 'object' ? raw : {};
            } catch (error) {
                return {};
            }
        }


        function setAdminCompleted(id, value = true) {
            const map = getAdminCompletedMap();
            if (value) map[String(id)] = new Date().toISOString();
            else delete map[String(id)];
            localStorage.setItem('leressae_admin_completed_services', JSON.stringify(map));
        }


        function isAdminCompleted(item) {
            return Boolean(
                item && (
                    item.admin_completed === true ||
                    String(item.admin_completed).toLowerCase() === 'true' ||
                    item.admin_confirmed === true ||
                    getAdminCompletedMap()[String(item.id || '')]
                )
            );
        }


        function getRawFormData(item) {
            if (!item || !item.raw_form_data) return {};
            try {
                return typeof item.raw_form_data === 'string'
                    ? JSON.parse(item.raw_form_data)
                    : (item.raw_form_data || {});
            } catch (error) {
                return {};
            }
        }


        function getServiceFormField(item, keys, fallback = '-') {
            const raw = getRawFormData(item);
            const candidates = Array.isArray(keys) ? keys : [keys];
            for (const key of candidates) {
                const direct = item && item[key];
                if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
                    return Array.isArray(direct) ? direct.join(', ') : direct;
                }
                const formValue = raw[key];
                if (formValue !== undefined && formValue !== null && String(formValue).trim() !== '') {
                    return Array.isArray(formValue) ? formValue.join(', ') : formValue;
                }
            }
            return fallback;
        }


        function getServiceGoogleMaps(item) {
            const sheetMap = getCustomerSpreadsheetGoogleMap(item);
            const suppliedMap = sheetMap || getServiceFormField(item, [
                'Alamat di Google Maps', 'Alamat Google Maps', 'Google Maps',
                'Google Maps Location', 'Lokasi Google Maps', 'Link Google Maps',
                'Google Maps URL', 'Maps', 'maps', 'google_maps'
            ], '');
            const value = String(suppliedMap || '').trim();
            if (!value || value === '-') return '';
            if (/^https?:\/\//i.test(value)) return safeExternalUrl(value);
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
        }


        function normalizeCustomerPhone(value) {
            const digits = normalizePhone(value);
            if (digits.startsWith('62')) return digits.slice(2).replace(/^0+/, '');
            return digits.replace(/^0+/, '');
        }


        function parseCustomerSheetTimestamp(value) {
            const text = String(value || '').trim();
            const localDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
            if (localDate) {
                return new Date(
                    Number(localDate[3]), Number(localDate[2]) - 1, Number(localDate[1]),
                    Number(localDate[4] || 0), Number(localDate[5] || 0), Number(localDate[6] || 0)
                ).getTime();
            }
            const timestamp = Date.parse(text);
            return Number.isNaN(timestamp) ? 0 : timestamp;
        }


        function getCustomerSpreadsheetGoogleMap(item) {
            const rows = window.__CUSTOMER_SPREADSHEET_MAPS__ || [];
            if (!rows.length || !item) return '';
            const fields = getServiceFormFieldsWithoutMaps(item);
            const phone = normalizeCustomerPhone(fields.whatsapp || item.phone || '');
            const name = String(fields.nama || item.customer_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
            if (!phone) return '';
            const phoneMatches = rows.filter(row => row.phone === phone && row.maps);
            if (!phoneMatches.length) return '';
            const exactMatches = name ? phoneMatches.filter(row => row.name === name) : [];
            const candidates = exactMatches.length ? exactMatches : phoneMatches;
            if (candidates.length === 1) return candidates[0].maps;
            const serviceTimestamp = parseCustomerSheetTimestamp(
                item.created_at || item.tanggal_masuk || fields.tanggal || item.timestamp
            );
            if (!serviceTimestamp) return candidates[candidates.length - 1].maps;
            return candidates.reduce((closest, row) =>
                Math.abs(row.timestamp - serviceTimestamp) < Math.abs(closest.timestamp - serviceTimestamp)
                    ? row
                    : closest
            ).maps;
        }


        function getServiceFormFieldsWithoutMaps(item) {
            return {
                nama: getServiceFormField(item, ['Nama','Nama Lengkap','Nama Pelanggan','nama','customer_name','NAMA'], '-'),
                whatsapp: getServiceFormField(item, ['No. WhatsApp','No WhatsApp','No Whatsapp','Nomor WhatsApp','WhatsApp','NO_WHATSAPP','phone','No. HP'], '-'),
                tanggal: getServiceFormField(item, ['Timestamp','timestamp','created_at','tanggal_masuk','Tanggal','TANGGAL'], '-')
            };
        }


        function getCustomerMediaValues(item) {
            const raw = getRawFormData(item);
            const keys = ['MEDIA CUSTOMER','Media Customer','media_customer','mediaCustomer','customer_media','customerMedia','Media','Upload Foto dan Video','Upload Foto/Video','Foto dan Video','Foto/Video','Upload File','File Upload','Unggah File','Foto Barang','Foto Kerusakan','Bukti Barang'];
            let value = '';
            for (const key of keys) {
                if (item && item[key] != null && String(item[key]).trim()) { value = item[key]; break; }
                if (raw && raw[key] != null && String(raw[key]).trim()) { value = raw[key]; break; }
            }
            if (!value && raw && typeof raw === 'object') {
                const entry = Object.entries(raw).find(([key, val]) => /upload|media|foto|video|file/i.test(key) && !/bukti.*service|service.*bukti|teknisi/i.test(key) && val != null && String(val).trim());
                if (entry) value = entry[1];
            }
            const normalize = v => {
                if (Array.isArray(v)) return v.flatMap(normalize);
                if (v && typeof v === 'object') {
                    const url = v.url || v.URL || v.fileUrl || v.FILE_URL || v.link || v.href || v.webViewLink;
                    return url ? [{url:String(url),name:String(v.name||v.fileName||v.FILE_NAME||'Media customer'),mime:String(v.mimeType||v.MIME_TYPE||'')}] : [];
                }
                const valueString = String(v || '').trim();
                if (!valueString || valueString === '-') return [];
                try { const parsed = JSON.parse(valueString); if (parsed !== v) return normalize(parsed); } catch (_) {}
                return valueString.split(/[\n,;]+/).map(url => url.trim()).filter(url => /^(https?:\/\/|data:)/i.test(url)).map(url => ({url,name:'Media customer',mime:''}));
            };
            return normalize(value);
        }


        function getServiceFormFields(item) {
            return {
                tanggal: getServiceFormField(item, ['Timestamp','timestamp','created_at','tanggal_masuk','Tanggal','TANGGAL'], '-'),
                nama: getServiceFormField(item, ['Nama','Nama Lengkap','Nama Pelanggan','nama','customer_name','NAMA'], '-'),
                whatsapp: getServiceFormField(item, ['No. WhatsApp','No WhatsApp','No Whatsapp','Nomor WhatsApp','WhatsApp','NO_WHATSAPP','phone','No. HP'], '-'),
                alamat: getServiceFormField(item, ['Alamat','alamat'], '-'),
                google_maps: getServiceGoogleMaps(item) || '-',
                media_customer: getCustomerMediaValues(item),
                barang: getServiceFormField(item, ['Mesin yang diservis','Nama Mesin','Nama Barang','Jenis Barang','Barang','item_name'], '-'),
                merk: getServiceFormField(item, ['Merk','Merek','Merk Mesin','merk'], '-'),
                tipe: getServiceFormField(item, ['Tipe','Type','Tipe Mesin','tipe'], '-'),
                keluhan: getServiceFormField(item, ['Keluhan','Keluhan Kerusakan','Masalah','keluhan'], '-'),
                teknisi: getServiceFormField(item, ['Teknisi','Nama Teknisi','technician'], 'Belum ada')
            };
        }


        function setServiceCache(records) {
            const normalized = (Array.isArray(records) ? records : []).map(record => {
                const item = { ...record };
                if (item.raw_form_data) {
                    try {
                        const raw = typeof item.raw_form_data === 'string'
                            ? JSON.parse(item.raw_form_data)
                            : item.raw_form_data;
                        const formItem = raw && (
                            raw['Mesin yang diservis'] ||
                            raw['Nama Mesin'] ||
                            raw['Nama Barang'] ||
                            raw['Jenis Barang']
                        );
                        const value = Array.isArray(formItem) ? formItem[0] : formItem;
                        if (String(value || '').trim()) item.item_name = value;
                    } catch (error) {
                        console.warn('raw_form_data tidak dapat dibaca:', error);
                    }
                }
                const formFields = getServiceFormFields(item);
                item.form_tanggal = formFields.tanggal;
                item.form_nama = formFields.nama;
                item.form_whatsapp = formFields.whatsapp;
                item.form_barang = formFields.barang;
                item.form_merk = formFields.merk;
                item.form_tipe = formFields.tipe;
                item.form_keluhan = formFields.keluhan;
                item.form_alamat = formFields.alamat;
                item.form_google_maps = formFields.google_maps;
                item.form_teknisi = formFields.teknisi;
                if (!item.customer_name && formFields.nama !== '-') item.customer_name = formFields.nama;
                if (!item.phone && formFields.whatsapp !== '-') item.phone = formFields.whatsapp;
                if (!item.item_name && formFields.barang !== '-') item.item_name = formFields.barang;
                if (!item.merk && formFields.merk !== '-') item.merk = formFields.merk;
                if (!item.tipe && formFields.tipe !== '-') item.tipe = formFields.tipe;
                if (!item.keluhan && formFields.keluhan !== '-') item.keluhan = formFields.keluhan;
                if (!item.technician && formFields.teknisi !== 'Belum ada') item.technician = formFields.teknisi;
                item.admin_completed = isAdminCompleted(item);
                return item;
            });
            window.__SERVICE_CACHE__ = normalized;
            return normalized;
        }


        function loadServiceRecords() {
            return Array.isArray(window.__SERVICE_CACHE__) ? window.__SERVICE_CACHE__ : [];
        }


        async function refreshServiceCacheFromApi() {
            if (window.__SERVICE_CACHE_REQUEST__) return window.__SERVICE_CACHE_REQUEST__;
            const apiReady = !!(CONFIG.API_URL && CONFIG.API_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL');
            if (!apiReady) {
                window.__SERVICE_CACHE_ERROR__ = '';
                setServiceCache([]);
                return [];
            }
            const request = (async () => {
                try {
                    const data = await apiRequest('getServices', {});
                    const records = Array.isArray(data && data.data) ? data.data : [];
                    setServiceCache(records);
                    window.__SERVICE_CACHE_ERROR__ = '';
                    return records;
                } catch (error) {
                    console.warn('Unable to load service records from API:', error);
                    window.__SERVICE_CACHE_ERROR__ = error?.message || 'Data servis gagal dimuat.';
                    return loadServiceRecords();
                }
            })();
            window.__SERVICE_CACHE_REQUEST__ = request;
            try {
                return await request;
            } finally {
                if (window.__SERVICE_CACHE_REQUEST__ === request) {
                    window.__SERVICE_CACHE_REQUEST__ = null;
                }
            }
        }


        function createServiceId() {
            const now = new Date();
            return 'SRV-' + now.toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 900 + 100));
        }


        async function submitServiceRequest(payload) {
            if (!CONFIG.API_URL || CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
                throw new Error('API belum dikonfigurasi.');
            }
            const response = await apiRequest('syncFormResponses', payload || {});
            if (response && response.data) {
                const entries = Array.isArray(response.data) ? response.data : [response.data];
                if (entries[0]) {
                    setServiceCache(entries);
                }
            }
            return response && response.data ? response.data : {};
        }


        async function getServiceStatus(phoneNumber) {
            if (!phoneNumber) return [];
            const cleanPhone = normalizePhone(phoneNumber);
            if (!cleanPhone) return [];
            const apiReady = !!(CONFIG.API_URL && CONFIG.API_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL');
            if (!apiReady) {
                return [];
            }
            try {
                const data = await apiRequest('getServiceStatus', { phone: cleanPhone });
                const rows = Array.isArray(data && data.data) ? data.data : [];
                if (rows.length) {
                    setServiceCache(rows);
                }
                return rows;
            } catch (error) {
                console.warn('Service status fetch failed:', error);
                const cached = loadServiceRecords();
                return cached.filter(item => normalizePhone(item.phone) === cleanPhone);
            }
        }


        function renderStatusResults(records) {
            window.__LERESSAE_STATUS_RESULTS_CACHE__ = Array.isArray(records) ? records : [];
            const resultWrap = document.getElementById('statusResult');
            if (!resultWrap) return;
            if (!records || !records.length) {
                resultWrap.innerHTML = `
                    <div class="status-empty">
                        <strong>Tidak ada riwayat servis ditemukan.</strong>
                        <p style="margin-top:8px; margin-bottom:0;">Pastikan nomor WhatsApp sudah benar, atau ajukan layanan baru melalui formulir Google Form.</p>
                    </div>
                `;
                return;
            }
            const statusFlow = ['Sedang Diproses', 'Selesai'];
            resultWrap.innerHTML = `
                <div class="status-list">
                    ${records.map(item => {
                        const currentStatus = getServiceDisplayStatus(item.status);
                        const activeIndex = Math.max(0, statusFlow.indexOf(currentStatus));
                        const progressSteps = statusFlow.map((step, index) => {
                            const isCurrent = index === activeIndex;
                            const currentClass = isCurrent
                                ? (currentStatus === 'Selesai' ? 'current-done' : 'current-progress')
                                : '';
                            return `<div class="status-track-step ${index <= activeIndex ? 'active' : ''} ${currentClass}">${escapeHtml(step)}</div>`;
                        }).join('');
                        return `
                            <article class="service-status-card">
                                <div class="service-status-header">
                                    <h3>${escapeHtml(item.item_name || '-')}</h3>
                                    <span class="status-badge ${getStatusClass(currentStatus)}">${escapeHtml(currentStatus)}</span>
                                </div>
                                <div class="service-meta">
                                    <div><strong>ID Servis:</strong> ${escapeHtml(item.id || '-')}</div>
                                    <div><strong>Nama:</strong> ${escapeHtml(item.customer_name || '-')}</div>
                                    <div><strong>WhatsApp:</strong> ${escapeHtml(item.phone || '-')}</div>
                                    <div><strong>Jenis:</strong> ${escapeHtml(item.service_type || item.item_name || '-')}</div>
                                    <div><strong>Tanggal:</strong> ${escapeHtml(formatDate(item.created_at || item.tanggal_masuk))}</div>
                                    <div><strong>Teknisi:</strong> ${escapeHtml(item.technician || 'Data belum tersedia')}</div>
                                </div>
                                <div class="status-tracker">${progressSteps}</div>
                                <div class="service-notes">
                                    ${escapeHtml(item.notes || item.catatan_teknisi || 'Belum ada catatan perkembangan terbaru.')}
                                </div>
                                <div class="status-customer-update-summary">
                                    <div><strong>Teknisi:</strong> ${escapeHtml(item.technician || 'Data belum tersedia')}</div>
                                    <div><strong>Biaya:</strong> ${escapeHtml(normalizeServiceCost(item).label)}</div>
                                    ${getServiceDisplayStatus(item.status)==='Selesai' ? `<div><strong>Tanggal Selesai:</strong> ${escapeHtml(item.tanggal_selesai ? formatDate(item.tanggal_selesai) : '-')}</div><div><strong>Keterangan Selesai:</strong> ${escapeHtml(item.keterangan_selesai || item.notes || '-')}</div>` : ''}
                                    <div><strong>Update Terakhir:</strong> ${escapeHtml(formatDateTimeValue(item.timestamp_update || item.created_at))}</div>
                                </div>
                                <div style="margin-top: 12px;">
                                    <button class="btn-primary" type="button" onclick='openServiceDetail(${JSON.stringify(String(item.id || ''))})'>Lihat Detail</button>
                                </div>
                            </article>
                        `;
                    }).join('')}
                </div>
            `;
        }


        async function apiRequest(action, payload = {}) {
            if (!CONFIG.API_URL || CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
                throw new Error('Koneksi ke server gagal. API_URL belum diatur.');
            }
            const protectedActions = [
                'syncFormResponses', 'updateServiceStatus', 'saveTechnician', 'syncTechnicians',
                'getTechnicians', 'addStock', 'stockIn', 'stockOut',
                'addNews', 'updateNews', 'deleteNews',
                'uploadFileToDrive', 'uploadMedia', 'addMedia', 'updateMedia', 'deleteMedia', 'syncMediaMetadata', 'migrateExistingMediaMetadata'
            ];
            const requestPayload = { ...payload };
            if (protectedActions.includes(action) && !requestPayload.token) {
                requestPayload.token = getAdminToken();
                if (!requestPayload.token) throw new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
            }
            const controller = new AbortController();
            const requestTimeout = action === 'uploadFileToDrive' ? 120000 : 20000;
            const timeout = window.setTimeout(() => controller.abort(), requestTimeout);
            let response;
            try {
                response = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ action, ...requestPayload }),
                    signal: controller.signal
                });
            } catch (error) {
                if (error && error.name === 'AbortError') throw new Error('Permintaan ke server melewati batas waktu. Silakan coba lagi.');
                throw new Error('Koneksi ke server gagal. Periksa koneksi internet lalu coba lagi.');
            } finally {
                window.clearTimeout(timeout);
            }
            if (!response.ok) {
                throw new Error('HTTP error: ' + response.status);
            }
            let data = {};
            try {
                data = await response.json();
            } catch (error) {
                throw new Error('Response server bukan JSON valid.');
            }
            if (!data || typeof data !== 'object') {
                throw new Error('Response server kosong atau tidak valid.');
            }
            if (data.success === false) {
                const message = data.message || 'Request gagal.';
                if (protectedActions.includes(action) && /token|sesi|session|unauthori[sz]ed|forbidden/i.test(message)) {
                    const authError = new Error('Sesi admin sudah tidak valid. Silakan login kembali.');
                    authError.code = 'ADMIN_SESSION_INVALID';
                    throw authError;
                }
                throw new Error(message);
            }
            API_ACTIONS.add(action);
            if (action === 'healthCheck') window.__API_CONNECTION_STATUS__ = { status: API_STATUS.CONNECTED, message: 'API Terhubung' };
            return data;
        }


        function isAdminLoggedIn() {
            try {
                const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.adminSession) || 'null');
                if (!(session && session.role === 'admin')) return false;
                if (session.expiresAt && Date.now() > Number(session.expiresAt)) {
                    setAdminSession(false);
                    return false;
                }
                return true;
            } catch (error) {
                return false;
            }
        }


        function isClientLoggedIn() {
            try {
                const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.clientSession) || 'null');
                return !!(session && session.role === 'client');
            } catch (error) {
                return false;
            }
        }


        function isTechnicianLoggedIn() {
            try {
                const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.technicianSession) || 'null');
                const role = String(session && session.role || '').trim().toLowerCase();
                return !!(session && (role === 'technician' || role === 'teknisi'));
            } catch (error) {
                return false;
            }
        }


        function getDevelopmentUsers() {
            return [];
        }


        function normalizeTechnicianUser(raw) {
            if (!raw || typeof raw !== 'object') return null;
            const username = String(raw.username || raw.USERNAME || '').trim();
            const name = String(raw.name || raw.NAMA || raw.fullName || username || '').trim();
            if (!username) return null;
            const normalized = {
                id: String(raw.id || raw.USER_ID || raw.ID || 'TECH-' + Date.now() + '-' + Math.random().toString(16).slice(2, 6)),
                name: name || username,
                username: username,
                password: String(raw.password || raw.PASSWORD || raw.PASSWORD_HASH || '').trim(),
                role: String(raw.role || raw.ROLE || 'TEKNISI').toUpperCase(),
                status: String(raw.status || raw.STATUS || 'AKTIF').toUpperCase(),
                specialization: String(raw.specialization || raw.SPESIALISASI || ''),
                phone: String(raw.phone || raw.NO_WHATSAPP || ''),
                createdAt: raw.createdAt || raw.CREATED_AT || new Date().toISOString(),
                updatedAt: raw.updatedAt || raw.UPDATED_AT || new Date().toISOString(),
                lastLogin: raw.lastLogin || raw.LAST_LOGIN || ''
            };
            return {
                ...normalized,
                USER_ID: normalized.id,
                ID: normalized.id,
                NAMA: normalized.name,
                USERNAME: normalized.username,
                PASSWORD: normalized.password,
                PASSWORD_HASH: normalized.password,
                ROLE: normalized.role,
                STATUS: normalized.status,
                SPESIALISASI: normalized.specialization,
                NO_WHATSAPP: normalized.phone,
                CREATED_AT: normalized.createdAt,
                UPDATED_AT: normalized.updatedAt,
                LAST_LOGIN: normalized.lastLogin,
                technicianId: normalized.id,
                technicianName: normalized.name,
                technicianUsername: normalized.username,
                technicianStatus: normalized.status
            };
        }


        function ensureDevelopmentUsers() {
            if (!CONFIG.DEV_MODE) return [];
            const saved = localStorage.getItem(STORAGE_KEYS.technicianUsers);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length) {
                        const normalized = parsed.map(normalizeTechnicianUser).filter(Boolean);
                        if (normalized.length) {
                            localStorage.setItem(STORAGE_KEYS.technicianUsers, JSON.stringify(normalized));
                            return normalized;
                        }
                    }
                } catch (error) {
                    console.warn('Invalid technician data in localStorage:', error);
                }
            }
            const defaults = getDevelopmentUsers()
                .filter(user => String(user.ROLE || user.role || '').toUpperCase() === 'TEKNISI')
                .map(normalizeTechnicianUser)
                .filter(Boolean);
            localStorage.setItem(STORAGE_KEYS.technicianUsers, JSON.stringify(defaults));
            return defaults;
        }


        function getTechnicianUsers() {
            try {
                const key = CONFIG.DEV_MODE ? STORAGE_KEYS.technicianUsers : STORAGE_KEYS.technicianBackendUsers;
                const saved = localStorage.getItem(key);
                if (!saved) return ensureDevelopmentUsers();
                const parsed = JSON.parse(saved);
                if (!Array.isArray(parsed)) return ensureDevelopmentUsers();
                return parsed.map(normalizeTechnicianUser).filter(Boolean);
            } catch (error) {
                return ensureDevelopmentUsers();
            }
        }


        function saveTechnicianUsers(users) {
            const value = Array.isArray(users) ? users.map(normalizeTechnicianUser).filter(Boolean) : [];
            const key = CONFIG.DEV_MODE ? STORAGE_KEYS.technicianUsers : STORAGE_KEYS.technicianBackendUsers;
            localStorage.setItem(key, JSON.stringify(value));
            return value;
        }


        function getLegacyTechnicianUsers() {
            try {
                const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.technicianUsers) || '[]');
                return Array.isArray(parsed) ? parsed.map(normalizeTechnicianUser).filter(Boolean) : [];
            } catch (error) {
                return [];
            }
        }


        function handleTechnicianAuthError(error) {
            if (!error || error.code !== 'ADMIN_SESSION_INVALID') return false;
            setAdminSession(false);
            renderAdminLoginGate();
            showToast('Sesi admin telah berakhir. Silakan login kembali.', 'error');
            return true;
        }


        async function technicianApiRequest(action, payload = {}, retry = true) {
            if (!isAdminLoggedIn() || !getAdminToken()) {
                const error = new Error('Sesi admin tidak ditemukan. Silakan login kembali.');
                error.code = 'ADMIN_SESSION_INVALID';
                throw error;
            }
            try {
                return await apiRequest(action, { ...payload, token: getAdminToken() });
            } catch (error) {
                if (retry && !error?.code && /koneksi|batas waktu|HTTP error: 5/i.test(String(error?.message || ''))) {
                    return technicianApiRequest(action, payload, false);
                }
                throw error;
            }
        }


        async function saveTechnicianToBackend(user, previousUsername = '', passwordOverride) {
            if (!isApiConfigured()) {
                if (CONFIG.DEV_MODE) return { success: true, localOnly: true };
                throw new Error('Backend akun Teknisi belum dikonfigurasi.');
            }
            const response = await technicianApiRequest('saveTechnician', {
                username: user.username || user.USERNAME,
                previousUsername: previousUsername || user.username || user.USERNAME,
                password: passwordOverride !== undefined ? passwordOverride : (user.password || user.PASSWORD || ''),
                name: user.name || user.NAMA,
                status: user.status || user.STATUS || 'AKTIF',
                phone: user.phone || user.NO_WHATSAPP || '',
                specialization: user.specialization || user.SPESIALISASI || ''
            });
            if (!response || response.success === false) throw new Error(response?.message || 'Akun Teknisi gagal disimpan ke server.');
            return response;
        }


        async function syncLocalTechniciansToBackend() {
            if (!isApiConfigured()) throw new Error('Backend akun Teknisi belum dikonfigurasi.');
            const remoteResponse = await technicianApiRequest('getTechnicians', {});
            const remoteNames = new Set((remoteResponse.data || []).map(user => String(user.USERNAME || '').trim().toLowerCase()));
            const users = getLegacyTechnicianUsers().filter(user => !remoteNames.has(String(user.USERNAME || '').trim().toLowerCase())).map(user => ({
                username: user.USERNAME,
                previousUsername: user.USERNAME,
                password: user.PASSWORD || user.PASSWORD_HASH || user.password || '',
                name: user.NAMA,
                status: user.STATUS || 'AKTIF',
                phone: user.NO_WHATSAPP || '',
                specialization: user.SPESIALISASI || ''
            }));
            if (!users.length) throw new Error('Belum ada akun Teknisi lokal untuk disinkronkan.');
            const response = await technicianApiRequest('syncTechnicians', { users });
            if (!response || response.success === false) throw new Error(response?.message || 'Sinkronisasi akun Teknisi gagal.');
            return response;
        }


        async function refreshTechniciansFromBackend() {
            const response = await technicianApiRequest('getTechnicians', {});
            const remoteUsers = Array.isArray(response && response.data) ? response.data : [];
            const localUsers = CONFIG.DEV_MODE ? getTechnicianUsers() : [];
            const localByUsername = new Map(localUsers.map(user => [String(user.USERNAME || '').trim().toLowerCase(), user]));
            const remoteNames = new Set();
            const normalizedRemote = remoteUsers.map(user => {
                const key = String(user.USERNAME || '').trim().toLowerCase();
                remoteNames.add(key);
                const local = localByUsername.get(key);
                return normalizeTechnicianUser({ ...user, password: local?.password || '' });
            }).filter(Boolean);
            saveTechnicianUsers(CONFIG.DEV_MODE ? normalizedRemote.concat(localUsers.filter(user => !remoteNames.has(String(user.USERNAME || '').trim().toLowerCase()))) : normalizedRemote);
            return { remote: normalizedRemote.length };
        }


        function setTechnicianSession(isLoggedIn, technicianName = '', username = '', token = '', technicianId = '') {
            if (isLoggedIn) {
                const session = {
                    loggedIn: true,
                    id: technicianId || username || 'TECH-001',
                    role: 'technician',
                    username: String(username || '').trim(),
                    name: String(technicianName || '').trim(),
                    loggedAt: new Date().toISOString(),
                    expiresAt: Date.now() + (8 * 60 * 60 * 1000),
                    token: String(token || '').trim()
                };
                localStorage.setItem(STORAGE_KEYS.technicianSession, JSON.stringify(session));
            } else {
                localStorage.removeItem(STORAGE_KEYS.technicianSession);
            }
        }


        function setAdminSession(isLoggedIn, username = '', token = '') {
            if (isLoggedIn) {
                const sessionToken = CONFIG.DEV_MODE ? (token || 'DEV_ADMIN_TOKEN') : String(token || '').trim();
                if (!sessionToken) {
                    throw new Error('Login admin tidak mengembalikan token sesi.');
                }
                const session = {
                    role: 'admin',
                    username: String(username || '').toUpperCase(),
                    loggedAt: new Date().toISOString(),
                    expiresAt: Date.now() + (8 * 60 * 60 * 1000),
                    token: sessionToken
                };
                localStorage.setItem(STORAGE_KEYS.adminSession, JSON.stringify(session));
                localStorage.setItem(STORAGE_KEYS.adminToken, session.token);
            } else {
                localStorage.removeItem(STORAGE_KEYS.adminSession);
                localStorage.removeItem(STORAGE_KEYS.adminToken);
            }
        }


        function toggleAdminMenu() {
            const shell = document.querySelector('.admin-shell');
            const button = document.querySelector('.admin-menu-toggle');
            if (!shell || !button) return;
            const isOpen = shell.classList.toggle('admin-menu-open');
            button.textContent = isOpen ? '×' : '☰';
            button.setAttribute('aria-expanded', String(isOpen));
            button.setAttribute(
                'aria-label',
                isOpen ? 'Tutup menu admin' : 'Buka menu admin'
            );
        }


        function closeAdminMenu() {
            const shell = document.querySelector('.admin-shell');
            const button = document.querySelector('.admin-menu-toggle');
            if (!shell || !button) return;
            shell.classList.remove('admin-menu-open');
            button.textContent = '☰';
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-label', 'Buka menu admin');
        }


        function getAdminToken() {
            try {
                const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.adminSession) || 'null');
                if (session && session.role === 'admin' && session.token && (!session.expiresAt || Date.now() <= Number(session.expiresAt))) {
                    return String(session.token);
                }
            } catch (error) {}
            return '';
        }


        function loginAdminDevelopment() {
            return { success: false, message: 'Login development dinonaktifkan. Gunakan akun dari backend.' };
        }


        function loginTechnicianDevelopment() {
            return { success: false, message: 'Login development dinonaktifkan. Gunakan akun dari backend.' };
        }


        async function loginTechnicianViaAPI(username, password) {
            const normalizedUser = String(username || '').trim();
            const normalizedPass = String(password || '').trim();
            if (!normalizedUser || !normalizedPass) {
                return { success: false, message: 'Username dan password Teknisi wajib diisi.' };
            }
            if (!isApiConfigured()) {
                return { success: false, message: 'Koneksi ke server gagal. API_URL belum diatur.' };
            }
            try {
                const response = await apiRequest('loginUser', {
                    username: normalizedUser,
                    password: normalizedPass
                });
                const account = response && response.data;
                const role = String(account && account.role || '').trim().toLowerCase();
                if (!account || !account.token || (role !== 'teknisi' && role !== 'technician')) {
                    return { success: false, message: 'Akun ini bukan akun Teknisi yang aktif.' };
                }
                setTechnicianSession(
                    true,
                    account.name || normalizedUser,
                    account.username || normalizedUser,
                    account.token,
                    account.id || account.userId || ''
                );
                return { success: true, ...account, message: response.message || 'Login Teknisi berhasil.' };
            } catch (error) {
                console.warn('API login Teknisi gagal:', error);
                return { success: false, message: error && error.message ? error.message : 'Login Teknisi gagal.' };
            }
        }


        async function loginTechnician(username, password) {
            if (CONFIG.DEV_MODE || !isApiConfigured()) {
                return loginTechnicianDevelopment(username, password);
            }
            return loginTechnicianViaAPI(username, password);
        }


        async function loginAdminViaAPI(username, password) {
            const normalizedUser = (username || '').trim();
            const normalizedPass = (password || '').trim();
            if (!normalizedUser || !normalizedPass) {
                return { success: false, message: 'Username dan password Admin wajib diisi.' };
            }
            if (!CONFIG.API_URL || CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
                return { success: false, message: 'Koneksi ke server gagal. API_URL belum diatur.' };
            }
            try {
                const data = await apiRequest('loginAdmin', { username: normalizedUser, password: normalizedPass });
                if (data && data.success && data.data && data.data.token) {
                    setAdminSession(true, normalizedUser.toUpperCase(), data.data.token);
                    return { success: true, message: data.message || 'Login Admin berhasil.', token: data.data.token };
                }
                return { success: false, message: data && data.message ? data.message : 'Login admin gagal.' };
            } catch (error) {
                console.warn('API loginAdmin unavailable:', error);
                return { success: false, message: error && error.message ? error.message : 'Login admin gagal.' };
            }
        }


        async function loginAdmin(username, password) {
            if (CONFIG.DEV_MODE) return loginAdminDevelopment(username, password);
            return loginAdminViaAPI(username, password);
        }


        function logoutClient() {
            setClientSession(false);
            renderClientDashboard();
        }


        function logoutAdmin() {
            setAdminSession(false);
            renderAdminDashboard();
            syncRoleNavbar();
            navigateTo('page-dashboard');
        }
        window.logoutTechnician = function logoutTechnician() {
            try {
                localStorage.removeItem(STORAGE_KEYS.technicianSession);
            } catch (e) {
                console.warn('Gagal menghapus session teknisi:', e);
            }
            try {
                if (window.__TECH_AUTO_REFRESH_INTERVAL__) {
                    clearInterval(window.__TECH_AUTO_REFRESH_INTERVAL__);
                    window.__TECH_AUTO_REFRESH_INTERVAL__ = null;
                }
            } catch (e) {}
            window.__LERESSAE_TECH_HISTORY = ['dashboard'];
            window.__TECH_CLIENT_FILTER__ = {period:'this_week',from:'',to:''};
            try {
                const techPage = document.getElementById('page-technician');
                if (techPage) {
                    techPage.classList.remove('active');
                    techPage.style.display = 'none';
                    techPage.setAttribute('aria-hidden','true');
                }
                const panel = document.getElementById('technicianPanelContent');
                if (panel) panel.innerHTML = '';
                const detail = document.getElementById('technicianDetailContent');
                if (detail) detail.innerHTML = '';
                const shell = document.getElementById('technicianShell');
                if (shell) shell.remove();
                document.body.classList.remove('technician-mode','tech-mode');
            } catch (e) {
                console.warn('UI Teknisi cleanup:', e);
            }
            try {
                document.querySelectorAll('.page-view').forEach(function(page){
                    page.classList.remove('active');
                    page.setAttribute('aria-hidden','true');
                });
                const dashboard = document.getElementById('page-dashboard');
                if (dashboard) {
                    dashboard.classList.add('active');
                    dashboard.style.display = '';
                    dashboard.setAttribute('aria-hidden','false');
                }
                window.__LERESSAE_PUBLIC_HISTORY = ['page-dashboard'];
                window.scrollTo(0,0);
            } catch (e) {}
            try { syncRoleNavbar(); } catch (e) {}
            window.setTimeout(function(){
                window.location.reload();
            }, 80);
        }


        function renderClientDashboard() {
            const accessNotice = document.getElementById('clientAccessNotice');
            const dashboard = document.getElementById('clientDashboardContent');
            if (!accessNotice || !dashboard) return;
            const loggedIn = isClientLoggedIn();
            accessNotice.classList.toggle('hidden', loggedIn);
            dashboard.classList.toggle('hidden', !loggedIn);
            if (!loggedIn) return;
            const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.clientSession) || '{}');
            const username = session.username || 'CLIENT_1';
            const records = loadServiceRecords().filter(item => normalizePhone(item.phone) && (item.client_role || '').toUpperCase() === username.toUpperCase());
            const total = records.length;
            const progress = records.filter(item => getServiceDisplayStatus(item.status) === 'Sedang Diproses').length;
            const waiting = 0;
            const done = records.filter(item => getServiceDisplayStatus(item.status) === 'Selesai').length;
            document.getElementById('clientStatTotal').textContent = total;
            document.getElementById('clientStatProgress').textContent = progress;
            document.getElementById('clientStatWaiting').textContent = waiting;
            document.getElementById('clientStatDone').textContent = done;
            const list = document.getElementById('clientServiceList');
            if (!list) return;
            if (!records.length) {
                list.innerHTML = '<div class="admin-empty-state">Belum ada servis yang terdaftar untuk akun ini.</div>';
                return;
            }
            list.innerHTML = records.map(item => `
                <article class="service-status-card">
                    <div class="service-status-header">
                        <h3>${escapeHtml(item.item_name || '-')}</h3>
                        <span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span>
                    </div>
                    <div class="service-meta">
                        <div><strong>ID Servis:</strong> ${escapeHtml(item.id || '-')}</div>
                        <div><strong>WhatsApp:</strong> ${escapeHtml(item.phone || '-')}</div>
                        <div><strong>Teknisi:</strong> ${escapeHtml(item.technician || 'Data belum tersedia')}</div>
                        <div><strong>Estimasi:</strong> ${escapeHtml(item.estimasi_selesai || 'Data belum tersedia')}</div>
                    </div>
                    <div class="service-notes">
                        ${escapeHtml(item.notes || 'Data belum tersedia')}
                    </div>
                    <div style="margin-top: 12px;">
                        <button class="btn-primary" type="button" data-service-id="${escapeHtml(item.id || '')}" onclick='openServiceDetail(${JSON.stringify(String(item.id || ''))})'>Lihat Detail</button>
                    </div>
                </article>
            `).join('');
        }


        function renderServiceDetailCard(item) {
                        const form=getServiceFormFields(item),cost=normalizeServiceCost(item),proof=getServiceProofUrl(item),maps=safeExternalUrl(form.google_maps||item.google_maps||item.maps||'');
                        const done=getServiceDisplayStatus(item.status)==='Selesai';
                        return `<div class="service-status-card"><div class="service-status-header"><h3>${escapeHtml(form.barang||item.item_name||'-')}</h3><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span></div>
                            <div class="service-meta"><div><strong>ID Servis:</strong> ${escapeHtml(item.id||'-')}</div><div><strong>Tanggal:</strong> ${escapeHtml(form.tanggal||formatDate(item.created_at||item.tanggal_masuk))}</div><div><strong>Nama Customer:</strong> ${escapeHtml(form.nama||item.customer_name||'-')}</div><div><strong>No. WhatsApp:</strong> ${escapeHtml(form.whatsapp||item.phone||'-')}</div><div><strong>Alamat:</strong> ${escapeHtml(form.alamat||item.alamat||'-')}</div><div><strong>Google Maps:</strong> ${maps?`<a class="btn-secondary small admin-gmaps-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Lihat GMaps</a>`:'-'}</div><div><strong>Jenis Barang:</strong> ${escapeHtml(form.barang||item.item_name||'-')}</div><div><strong>Merek:</strong> ${escapeHtml(form.merk||item.merk||'-')}</div><div><strong>Tipe:</strong> ${escapeHtml(form.tipe||item.tipe||'-')}</div><div><strong>Keluhan:</strong> ${escapeHtml(form.keluhan||item.keluhan||'-')}</div><div><strong>Teknisi:</strong> ${escapeHtml(form.teknisi||item.technician||'-')}</div><div><strong>Catatan Teknisi:</strong> ${escapeHtml(item.catatan_teknisi||item.notes||'-')}</div>${done?`<div><strong>Keterangan Selesai:</strong> ${escapeHtml(item.keterangan_selesai||item.notes||'-')}</div><div><strong>Tanggal Selesai:</strong> ${escapeHtml(item.tanggal_selesai?formatDate(item.tanggal_selesai):'-')}</div>`:''}<div><strong>Biaya Service:</strong> ${escapeHtml(cost.label)}</div>${item.biaya_keterangan?`<div><strong>Keterangan Biaya:</strong> ${escapeHtml(item.biaya_keterangan)}</div>`:''}<div><strong>Waktu Update Terakhir:</strong> ${escapeHtml(formatDateTimeValue(item.timestamp_update||item.created_at))}</div></div>${proof?`<div class="status-proof-public"><strong>Bukti Foto Service</strong><img src="${escapeHtml(proof)}" alt="Bukti foto service"></div>`:''}</div>`;
                }


function openServiceDetail(serviceId) {
            const normalizedId = String(serviceId ?? '').trim();
            if (!normalizedId) {
                showToast('ID servis tidak valid.', 'error');
                return;
            }
            const records = Array.isArray(loadServiceRecords()) ? loadServiceRecords() : [];
            const item = records.find(entry => String(entry.id || '') === normalizedId);
            if (!item) {
                showToast('Data servis tidak ditemukan.', 'error');
                return;
            }
            const activePublicPage=Array.from(document.querySelectorAll('.page-view.active'))[0],techShell=document.getElementById('technicianShell'),adminShell=document.querySelector('.admin-shell');
            let returnKind='public',returnPage=activePublicPage?activePublicPage.id:'page-status';
            if(techShell&&isTechnicianLoggedIn()){returnKind='tech';const h=window.__LERESSAE_TECH_HISTORY||['dashboard'];returnPage=h[h.length-1]||'dashboard';}
            else if(adminShell&&isAdminLoggedIn()){returnKind='admin';const h=window.__LERESSAE_ADMIN_HISTORY||['dashboard'];returnPage=h[h.length-1]||'dashboard';}
            const scroll=window.scrollY||0;window.__LERESSAE_DETAIL_RETURN_CONTEXT__={kind:returnKind,page:returnPage,scroll};window.__LERESSAE_DETAIL_RETURN_PAGE__=returnPage;window.__LERESSAE_DETAIL_RETURN_KIND__=returnKind;window.__LERESSAE_DETAIL_RETURN_SCROLL__=scroll;
            const done=getServiceDisplayStatus(item.status)==='Selesai';
            const detailHtml=`<div class="leressae-detail-back-row"><button type="button" class="leressae-back-btn" data-service-detail-back><span class="leressae-back-icon">←</span><span>Kembali</span></button></div>
              <div class="service-status-card"><div class="service-status-header"><h3>${escapeHtml(form.barang||item.item_name||'-')}</h3><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span></div>
              <div class="service-meta"><div><strong>ID Servis:</strong> ${escapeHtml(item.id||'-')}</div><div><strong>Tanggal:</strong> ${escapeHtml(form.tanggal||formatDate(item.created_at||item.tanggal_masuk))}</div><div><strong>Nama Customer:</strong> ${escapeHtml(form.nama||item.customer_name||'-')}</div><div><strong>No. WhatsApp:</strong> ${escapeHtml(form.whatsapp||item.phone||'-')}</div><div><strong>Alamat:</strong> ${escapeHtml(form.alamat||item.alamat||'-')}</div><div><strong>Google Maps:</strong> ${maps?`<a class="btn-secondary small admin-gmaps-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Lihat GMaps</a>`:'-'}</div><div><strong>Jenis Barang:</strong> ${escapeHtml(form.barang||item.item_name||'-')}</div><div><strong>Merek:</strong> ${escapeHtml(form.merk||item.merk||'-')}</div><div><strong>Tipe:</strong> ${escapeHtml(form.tipe||item.tipe||'-')}</div><div><strong>Keluhan:</strong> ${escapeHtml(form.keluhan||item.keluhan||'-')}</div><div><strong>Teknisi:</strong> ${escapeHtml(form.teknisi||item.technician||'-')}</div><div><strong>Catatan Teknisi:</strong> ${escapeHtml(item.catatan_teknisi||item.notes||'-')}</div>${done?`<div><strong>Keterangan Selesai:</strong> ${escapeHtml(item.keterangan_selesai||item.notes||'-')}</div><div><strong>Tanggal Selesai:</strong> ${escapeHtml(item.tanggal_selesai?formatDate(item.tanggal_selesai):'-')}</div>`:''}<div><strong>Biaya Service:</strong> ${escapeHtml(cost.label)}</div>${item.biaya_keterangan?`<div><strong>Keterangan Biaya:</strong> ${escapeHtml(item.biaya_keterangan)}</div>`:''}<div><strong>Waktu Update Terakhir:</strong> ${escapeHtml(formatDateTimeValue(item.timestamp_update||item.created_at))}</div></div>${proof?`<div class="status-proof-public"><strong>Bukti Foto Service</strong><img src="${escapeHtml(proof)}" alt="Bukti foto service"></div>`:''}</div>`;
            if(returnKind==='admin'&&isAdminLoggedIn()){renderAdminAppShell(returnPage,detailHtml);document.querySelector('.admin-content')?.querySelectorAll(':scope > .leressae-back-row').forEach(el=>el.remove());requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));return;}
            if(returnKind==='tech'&&isTechnicianLoggedIn()){const view=document.getElementById('technicianView');if(view)view.innerHTML=detailHtml;const shell=document.getElementById('technicianShell');if(shell)shell.dataset.techPage=returnPage;return;}
            const statusResult=document.getElementById('statusResult');if(statusResult)statusResult.innerHTML=detailHtml;navigateTo('page-status',{fromBack:true});
        }


        function showToast(message, type = 'info') {
            if (!document || !document.body) return;
            let toast = document.getElementById('appToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'appToast';
                toast.style.position = 'fixed';
                toast.style.right = '20px';
                toast.style.bottom = '20px';
                toast.style.background = '#0f172a';
                toast.style.color = '#fff';
                toast.style.padding = '12px 16px';
                toast.style.borderRadius = '10px';
                toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
                toast.style.zIndex = '2000';
                toast.style.maxWidth = '320px';
                toast.style.fontSize = '0.82rem';
                toast.style.fontWeight = '700';
                toast.style.transition = 'opacity 0.2s ease';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            const colors = { success: '#166534', info: '#0f172a', error: '#b91c1c' };
            toast.style.background = colors[type] || '#0f172a';
            toast.style.opacity = '1';
            clearTimeout(toast._timer);
            toast._timer = setTimeout(() => {
                toast.style.opacity = '0';
            }, 2400);
        }


        function getSavedRolePage(role) {
            const key = role === 'technician' ? STORAGE_KEYS.technicianLastPage : STORAGE_KEYS.adminLastPage;
            const value = (() => {
                try {
                    return localStorage.getItem(key) || '';
                } catch (error) {
                    return '';
                }
            })();
            return String(value || '').trim();
        }


        function saveRolePage(role, page) {
            const safePage = String(page || '').trim();
            if (!safePage) return;
            const key = role === 'technician' ? STORAGE_KEYS.technicianLastPage : STORAGE_KEYS.adminLastPage;
            try {
                localStorage.setItem(key, safePage);
            } catch (error) {
                console.warn('Gagal menyimpan halaman sesi:', error);
            }
        }


        function restoreSavedRolePage() {
            if (isAdminLoggedIn()) {
                const allowed = ['dashboard', 'services', 'running', 'completed', 'customers', 'technicians', 'stock', 'locations', 'media', 'news', 'reports', 'settings'];
                const saved = getSavedRolePage('admin');
                const target = allowed.includes(saved) ? saved : 'dashboard';
                if (document.querySelector('.admin-shell')) {
                    window.__LERESSAE_ADMIN_HISTORY = [target];
                    showAdminPage(target, { resetHistory: true });
                    return true;
                }
                showAdminPage(target, { resetHistory: true });
                return true;
            }
            if (isTechnicianLoggedIn()) {
                const allowed = ['dashboard', 'clients', 'status', 'stock', 'profile'];
                const saved = getSavedRolePage('technician');
                const target = allowed.includes(saved) ? saved : 'dashboard';
                if (document.getElementById('page-technician')) {
                    window.__LERESSAE_TECH_HISTORY = [target];
                    renderTechView(target, { resetHistory: true });
                    return true;
                }
                if (typeof window.renderTechnicianPanelPage === 'function') {
                    window.renderTechnicianPanelPage();
                }
                return true;
            }
            return false;
        }


        function checkAdminSession() {
            return isAdminLoggedIn();
        }


        function getStockRecords() {
            return Array.isArray(window.__STOCK_CACHE__) ? window.__STOCK_CACHE__ : [];
        }


        function normalizeStockRecord(raw) {
            const item = raw && typeof raw === 'object' ? raw : {};
            const numberValue = value => {
                const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
                return Number.isFinite(n) ? n : 0;
            };
            const stokAwal = numberValue(item.stokAwal ?? item.STOK_AWAL ?? item.stok_awal);
            const masuk = numberValue(item.masuk ?? item.MASUK ?? item.STOK_MASUK ?? item.stok_masuk);
            const keluar = numberValue(item.keluar ?? item.KELUAR ?? item.STOK_KELUAR ?? item.stok_keluar);
            const suppliedCurrent = item.stokSaatIni ?? item.STOK_SAAT_INI ?? item.stok_saat_ini ?? item.STOK;
            const stokSaatIni = suppliedCurrent === undefined || suppliedCurrent === null || suppliedCurrent === ''
                ? stokAwal + masuk - keluar
                : numberValue(suppliedCurrent);
            const minimum = numberValue(item.minimum ?? item.MINIMUM ?? item.STOK_MINIMUM ?? item.stok_minimum);
            const backendStatus = String(item.status ?? item.STATUS ?? '').trim().toUpperCase();
            const status = backendStatus || (stokSaatIni <= 0 ? 'HABIS' : stokSaatIni <= minimum ? 'MENIPIS' : 'AMAN');
            return {
                ...item,
                code: String(item.code ?? item.KODE ?? item.KODE_BARANG ?? item.ID_BARANG ?? item.id ?? item.ID ?? ''),
                name: String(item.name ?? item.NAMA ?? item.NAMA_BARANG ?? item.nama ?? ''),
                category: String(item.category ?? item.KATEGORI ?? item.kategori ?? ''),
                merk: String(item.merk ?? item.MERK ?? item.MEREK ?? item.merek ?? ''),
                satuan: String(item.satuan ?? item.SATUAN ?? ''),
                stokAwal, masuk, keluar, stokSaatIni, minimum, status
            };
        }


        function saveStockRecords(records) {
            window.__STOCK_CACHE__ = Array.isArray(records) ? records.map(normalizeStockRecord) : [];
        }


        function getStockHistory() {
            return Array.isArray(window.__STOCK_HISTORY_CACHE__) ? window.__STOCK_HISTORY_CACHE__ : [];
        }


        function saveStockHistory(history) {
            window.__STOCK_HISTORY_CACHE__ = Array.isArray(history) ? history : [];
        }


        function getStockAdditionalRecords() {
            return Array.isArray(window.__STOCK_ADDITIONAL_CACHE__) ? window.__STOCK_ADDITIONAL_CACHE__ : [];
        }


        function saveStockAdditionalRecords(records) {
            window.__STOCK_ADDITIONAL_CACHE__ = Array.isArray(records)
                ? records.map(normalizeStockRecord)
                : [];
        }


        async function refreshStockDataFromApi() {
            const apiReady = !!(CONFIG.API_URL && CONFIG.API_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL');
            if (!apiReady) {
                saveStockRecords([]);
                saveStockAdditionalRecords([]);
                saveStockHistory([]);
                return { stock: [], additional: [], history: [] };
            }
            try {
                const responses = await Promise.allSettled([
                    apiRequest('getStock', {}),
                    apiRequest('getStockAdditional', {}),
                    apiRequest('getStockHistory', {})
                ]);
                const getData = index => {
                    const result = responses[index];
                    return result && result.status === 'fulfilled' ? result.value : null;
                };
                const stockResponse = getData(0);
                const additionalResponse = getData(1);
                const historyResponse = getData(2);
                const stock = Array.isArray(stockResponse?.data) ? stockResponse.data : [];
                const additional = Array.isArray(additionalResponse?.data) ? additionalResponse.data : [];
                const history = Array.isArray(historyResponse?.data) ? historyResponse.data : [];
                window.__STOCK_SUMMARY_CACHE__ = null;
                if (stockResponse) saveStockRecords(stock);
                if (additionalResponse) saveStockAdditionalRecords(additional);
                if (historyResponse) saveStockHistory(history);
                return {
                    stock: getStockRecords(),
                    additional: getStockAdditionalRecords(),
                    history: getStockHistory()
                };
            } catch (error) {
                console.warn('Unable to refresh stock data:', error);
                return {
                    stock: getStockRecords(),
                    additional: getStockAdditionalRecords(),
                    history: getStockHistory()
                };
            }
        }


        function refreshStockInBackground() {
            if (window.__STOCK_REQUEST__) return window.__STOCK_REQUEST__;
            window.__STOCK_LOADING__ = true;
            window.__STOCK_REQUEST__ = refreshStockDataFromApi().finally(() => {
                window.__STOCK_LOADING__ = false;
                window.__STOCK_REQUEST__ = null;
                if (window.__ADMIN_CURRENT_PAGE__ === 'stock') {
                    showAdminPage('stock', { fromBack: true, skipStockRefresh: true });
                }
            });
            return window.__STOCK_REQUEST__;
        }


        function getFilteredServices(records, filters = {}) {
            const keyword = (filters.keyword || '').trim().toLowerCase();
            const selectedStatus = filters.status || 'all';
            const selectedDate = filters.date || 'all';
            const tech = filters.technician || 'all';
            return records.filter(item => {
                const matchesText = !keyword || [item.id, item.customer_name, item.phone, item.item_name, item.merk, item.tipe].some(value => String(value || '').toLowerCase().includes(keyword));
                const matchesStatus = selectedStatus === 'all' || getServiceDisplayStatus(item.status) === selectedStatus;
                const matchesTech = tech === 'all' || String(item.technician || '').toLowerCase() === tech.toLowerCase();
                let matchesDate = true;
                if (selectedDate !== 'all') {
                    const itemDate = new Date(item.created_at || item.tanggal_masuk || item.timestamp || new Date());
                    if (!Number.isNaN(itemDate.getTime())) {
                        const today = new Date();
                        const diffDays = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
                        if (selectedDate === 'today') matchesDate = diffDays === 0;
                        else if (selectedDate === 'yesterday') matchesDate = diffDays === 1;
                        else if (selectedDate === '7') matchesDate = diffDays <= 7;
                        else if (selectedDate === '30') matchesDate = diffDays <= 30;
                        else if (selectedDate === '90') matchesDate = diffDays <= 90;
                        else if (selectedDate === '180') matchesDate = diffDays <= 180;
                        else if (selectedDate === '365') matchesDate = diffDays <= 365;
                    }
                }
                return matchesText && matchesStatus && matchesDate && matchesTech;
            });
        }


        function parseDateValue(value) {
            if (!value) return null;
            const raw = String(value).trim();
            if (!raw) return null;
            const normalized = raw.includes('T') || raw.includes(' ') ? raw : raw + 'T00:00:00+07:00';
            const date = new Date(normalized);
            if (Number.isNaN(date.getTime())) return null;
            return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        }


        function applyPeriodFilter(records, period, dateField, customStart = '', customEnd = '') {
            if (!Array.isArray(records)) return [];
            if (!period || period === 'all') return records;
            const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            if (period === 'custom') {
                const from = customStart ? new Date(customStart + 'T00:00:00+07:00') : null;
                const to = customEnd ? new Date(customEnd + 'T23:59:59+07:00') : null;
                if (from && to && from > to) {
                    return [];
                }
                return records.filter(item => {
                    const raw = item[dateField] || item.created_at || item.tanggal_masuk || item.tanggal_selesai || item.timestamp || null;
                    if (!raw) return false;
                    const itemJakarta = parseDateValue(raw);
                    if (!itemJakarta) return false;
                    const meetsStart = !from || itemJakarta >= from;
                    const meetsEnd = !to || itemJakarta <= to;
                    return meetsStart && meetsEnd;
                });
            }
            const start = new Date(nowJakarta);
            if (period === 'today') {
                start.setHours(0, 0, 0, 0);
            } else if (period === 'this_week') {
                const day = (nowJakarta.getDay() + 6) % 7;
                start.setDate(nowJakarta.getDate() - day);
                start.setHours(0, 0, 0, 0);
            } else if (period === '1_month') {
                start.setMonth(nowJakarta.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
            } else if (period === '6_month') {
                start.setMonth(nowJakarta.getMonth() - 6);
                start.setHours(0, 0, 0, 0);
            } else if (period === '1_year') {
                start.setFullYear(nowJakarta.getFullYear() - 1);
                start.setHours(0, 0, 0, 0);
            } else {
                return records;
            }
            return records.filter(item => {
                const raw = item[dateField] || item.created_at || item.tanggal_masuk || item.tanggal_selesai || item.timestamp || null;
                if (!raw) return false;
                const itemJakarta = parseDateValue(raw);
                if (!itemJakarta) return false;
                return itemJakarta >= start && itemJakarta <= nowJakarta;
            });
        }


        function getAdminStats(records) {
            const total = records.length;
            const progress = records.filter(item => getServiceDisplayStatus(item.status) === 'Sedang Diproses').length;
            const done = records.filter(item => getServiceDisplayStatus(item.status) === 'Selesai').length;
            const waiting = 0;
            const cancelled = 0;
            return { total, waiting, progress, done, cancelled };
        }


        function renderAdminLoginGate() {
            const gate = document.getElementById('adminLoginGate');
            if (!gate) return;
            gate.classList.remove('hidden');
            gate.innerHTML = `
                <div class="login-panel-header">
                    <div class="brand-lock">A</div>
                    <h3>Admin Login</h3>
                    <p>Masuk untuk mengelola servis, pelanggan, stock, dan laporan.</p>
                </div>
                <form id="adminGateForm" class="login-form">
                    <div class="login-field">
                        <label for="adminGateUsername">Username</label>
                        <input id="adminGateUsername" type="text" placeholder="Masukkan username admin" autocomplete="username">
                    </div>
                    <div class="login-field">
                        <label for="adminGatePassword">Password</label>
                        <div class="password-row">
                            <input id="adminGatePassword" type="password" placeholder="Masukkan password" autocomplete="current-password">
                            <button type="button" class="toggle-password" data-toggle-target="adminGatePassword">Show</button>
                        </div>
                    </div>
                    <div class="login-actions">
                        <button type="button" class="login-btn-secondary" onclick="closeLogin()">Batal</button>
                        <button type="submit" class="login-btn-primary" id="adminGateSubmit">Login</button>
                    </div>
                    <div id="adminGateError" class="admin-notice hidden" style="margin-top:12px;"></div>
                </form>
            `;
            const toggle = gate.querySelector('[data-toggle-target]');
            if (toggle) toggle.addEventListener('click', () => {
                const target = document.getElementById(toggle.dataset.toggleTarget);
                if (!target) return;
                const isPassword = target.type === 'password';
                target.type = isPassword ? 'text' : 'password';
                toggle.textContent = isPassword ? 'Hide' : 'Show';
            });
            const adminGateForm = gate.querySelector('#adminGateForm');
            const adminGateSubmit = document.getElementById('adminGateSubmit');
            adminGateForm.addEventListener('keydown', event => {
                if (event.key === 'Enter' && event.target.matches('input')) {
                    event.preventDefault();
                    adminGateForm.requestSubmit(adminGateSubmit);
                }
            });
            adminGateForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const submitBtn = document.getElementById('adminGateSubmit');
                const errorBox = document.getElementById('adminGateError');
                if (submitBtn.disabled) return;
                const username = document.getElementById('adminGateUsername').value.trim();
                const password = document.getElementById('adminGatePassword').value.trim();
                submitBtn.disabled = true;
                submitBtn.classList.add('submit-loading');
                errorBox.classList.add('hidden');
                try {
                    const result = await loginAdmin(username, password);
                    if (result.success) {
                        closeLogin();
                        renderAdminDashboard();
                        navigateTo('page-admin');
                        startAdminSyncLoop();
                        showToast('Login admin berhasil.', 'success');
                    } else {
                        errorBox.textContent = result.message;
                        errorBox.classList.remove('hidden');
                        showToast(result.message, 'error');
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('submit-loading');
                }
            });
        }


        function getAdminMenuMeta() {
            return {
                dashboard: { label: 'Dashboard', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="4" rx="1.5"></rect><rect x="14" y="11" width="7" height="10" rx="1.5"></rect><rect x="3" y="12" width="7" height="9" rx="1.5"></rect></svg>' },
                services: { label: 'Data Servis', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12"></path><path d="M8 12h12"></path><path d="M8 18h12"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>' },
                running: { label: 'Servis Berjalan', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h4.5A1.5 1.5 0 0 1 20 4.5v4.5"></path><path d="M14 20h6"></path><path d="M20 12v7.5A1.5 1.5 0 0 1 18.5 21H5.5A1.5 1.5 0 0 1 4 19.5V4.5A1.5 1.5 0 0 1 5.5 3H12"></path><path d="M12 8v4l3 2"></path></svg>' },
                completed: { label: 'Servis Selesai', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12.5 2.2 2.2 4.8-5.2"></path></svg>' },
                customers: { label: 'Pelanggan', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"></path><circle cx="9.5" cy="7" r="3.5"></circle><path d="M22 19v-1a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
                technicians: { label: 'Teknisi', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 20a7 7 0 0 1 16 0"></path><path d="M18 8h4"></path><path d="M20 6v4"></path></svg>' },
                stock: { label: 'Stock Flow', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5 12 3l9 4.5-9 4.5L3 7.5Z"></path><path d="M3 12l9 4.5 9-4.5"></path><path d="M3 16.5 12 21l9-4.5"></path></svg>' },
                locations: { label: 'Lokasi Servis', iconSvg: '<span class="admin-nav-icon" aria-hidden="true">⌖</span>' },
                media: { label: 'Update Media', iconSvg: '<span class="admin-nav-icon" aria-hidden="true">◫</span>' },
                news: { label: 'Update Berita', iconSvg: '<span class="admin-nav-icon" aria-hidden="true">▤</span>' },
                reports: { label: 'Laporan', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10"></path><path d="M10 20V4"></path><path d="M16 20v-8"></path><path d="M22 20v-12"></path></svg>' },
                settings: { label: 'Pengaturan', iconSvg: '<svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.82-.33 1.7 1.7 0 0 0-1 1.54V20a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9.8 18.4a1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9.8 5.6a1.7 1.7 0 0 0 1-1.54V4a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 14.2 5.6a1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.38.38.94.49 1.54 1H21a2 2 0 1 1 0 4h-.09c-.6.51-1.16.62-1.54 1Z"></path></svg>' }
            };
        }


        function setActiveAdminMenu(page) {
            const items = document.querySelectorAll('.admin-nav-item');
            items.forEach(item => {
                const active = item.dataset.adminPage === page;
                item.classList.toggle('active', active);
            });
        }


        function renderAdminAppShell(page, contentHtml) {
            const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.adminSession) || '{}');
            const username = session.username || 'ADMIN_1';
            const menu = getAdminMenuMeta();
            const pageTitle = menu[page] ? menu[page].label : 'Dashboard';
            const dashboardContainer = document.getElementById('adminDashboardContent');
            if (!dashboardContainer) return;
            const syncState = window.__ADMIN_SYNC_STATE__ || { label: 'Connected', text: 'Data tersinkronisasi' };
            dashboardContainer.innerHTML = `
                <div class="admin-shell">
                    <aside class="admin-sidebar">
                        <div class="admin-brand-box">
                            <div class="logo-mini">A</div>
                            <div>
                                <strong>Admin Panel</strong>
                                <span>System</span>
                            </div>
                        </div>
                        <ul class="admin-nav-list">
                            ${Object.entries(menu).map(([key, value]) => `
                                <li>
                                    <button class="admin-nav-item ${page === key ? 'active' : ''}" data-admin-page="${key}" type="button">
                                        ${value.iconSvg || '<span>' + (value.icon || '') + '</span>'} <span>${value.label}</span>
                                    </button>
                                </li>
                            `).join('')}
                            <li>
                                <button class="admin-nav-item admin-sidebar-logout" type="button" onclick="logoutAdmin();">
                                    <svg class="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg> <span>Logout</span>
                                </button>
                            </li>
                        </ul>
                    </aside>
                    <div class="admin-content">
                        <div class="admin-topbar">
                            <div class="admin-title-row">
                                <button class="admin-menu-toggle" type="button"
                                        onclick="toggleAdminMenu()"
                                        aria-label="Buka menu admin"
                                        aria-expanded="false">☰</button>
                                <div>
                                    <div class="admin-breadcrumb">Admin / ${escapeHtml(pageTitle)}</div>
                                    <h2>${escapeHtml(pageTitle)}</h2>
                                </div>
                            </div>
                            <div class="admin-topbar-meta">
                                <span class="admin-user-chip">${escapeHtml(username)}</span>
                                <span class="admin-sync-badge ${syncState.label === 'Connection Error' ? 'error' : 'ok'}">● ${escapeHtml(syncState.label || 'Connected')}</span>
                            </div>
                        </div>
                        ${contentHtml}
                    </div>
                </div>
            `;
            setActiveAdminMenu(page);
        }


        function renderAdminDashboardPage() {
            const records = loadServiceRecords();
            const stats = getAdminStats(records);
            const chartRecords = typeof window.filterAdminOperationalRecords === 'function'
                ? window.filterAdminOperationalRecords(records)
                : records;
            const lineData = typeof window.buildAdminOperationalLineData === 'function'
                ? window.buildAdminOperationalLineData(records)
                : [];
            const statusData = typeof window.buildAdminOperationalStatusData === 'function'
                ? window.buildAdminOperationalStatusData(chartRecords)
                : [];
            const histogramData = typeof window.buildAdminOperationalHistogramData === 'function'
                ? window.buildAdminOperationalHistogramData(lineData)
                : [];
            const itemData = typeof window.buildAdminOperationalItemData === 'function'
                ? window.buildAdminOperationalItemData(chartRecords)
                : [];
            const period = window.__ADMIN_CHART_PERIOD__ || '7d';
            const customFrom = window.__ADMIN_CHART_CUSTOM_FROM__ || '';
            const customTo = window.__ADMIN_CHART_CUSTOM_TO__ || '';
            const periodLabel = period === '1d' ? 'Hari Ini' : period === '30d' ? '1 Bulan' : period === 'custom' ? 'Custom' : '1 Minggu';
            const totalChart = chartRecords.length;
            const lineChart = typeof window.renderAdminOperationalLineChart === 'function'
                ? window.renderAdminOperationalLineChart(lineData)
                : '<div class="chart-empty">Grafik belum tersedia.</div>';
            const pieChart = typeof window.renderAdminOperationalPieChart === 'function'
                ? window.renderAdminOperationalPieChart(statusData)
                : '<div class="chart-empty">Grafik belum tersedia.</div>';
            const histogramChart = typeof window.renderAdminOperationalHistogramChart === 'function'
                ? window.renderAdminOperationalHistogramChart(histogramData)
                : '<div class="chart-empty">Grafik belum tersedia.</div>';
            const itemChart = typeof window.renderAdminOperationalItemChart === 'function'
                ? window.renderAdminOperationalItemChart(itemData)
                : '<div class="chart-empty">Grafik belum tersedia.</div>';
            return `
                <div class="admin-panels admin-dashboard-panels">
                    <div class="admin-card">
                        <div class="admin-card-header">
                            <h3>Statistik Utama</h3>
                            <span class="admin-user-chip">Data dari Spreadsheet</span>
                        </div>
                        <div class="admin-stat-grid-8">
                            <div class="admin-stat-mini"><span class="label">Total Servis</span><span class="value">${stats.total}</span></div>
                            <div class="admin-stat-mini"><span class="label">Servis Hari Ini</span><span class="value">${records.filter(item => { const d = new Date(item.created_at || item.timestamp || item.tanggal_masuk || ''); const n = new Date(); return !Number.isNaN(d.getTime()) && d.toDateString() === n.toDateString(); }).length}</span></div>
                            <div class="admin-stat-mini"><span class="label">Sedang Diproses</span><span class="value">${stats.progress}</span></div>
                            <div class="admin-stat-mini"><span class="label">Selesai</span><span class="value">${stats.done}</span></div>
                        </div>
                    </div>
                    <div class="admin-card">
                        <div class="admin-card-header">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;width:100%;">
                                <div>
                                    <h3 style="margin:0;">Grafik Operasional</h3>
                                    <div class="chart-meta">Menampilkan ${totalChart} servis pada periode ${escapeHtml(periodLabel)}. Data mengikuti hasil sinkronisasi backend.</div>
                                </div>
                                <div class="admin-chart-filter">
                                    <label class="admin-chart-filter-label" for="adminChartPeriodSelect">Periode:</label>
                                    <select id="adminChartPeriodSelect" class="admin-chart-filter-select" aria-label="Filter periode grafik operasional">
                                        <option value="1d" ${period === '1d' ? 'selected' : ''}>Hari Ini</option>
                                        <option value="7d" ${period === '7d' ? 'selected' : ''}>1 Minggu</option>
                                        <option value="30d" ${period === '30d' ? 'selected' : ''}>1 Bulan</option>
                                        <option value="custom" ${period === 'custom' ? 'selected' : ''}>Custom</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="chart-period-custom" id="adminChartCustomDates" ${period === 'custom' ? '' : 'hidden'}>
                            <label for="adminChartDateFrom">Mulai</label>
                            <input id="adminChartDateFrom" type="date" value="${escapeHtml(customFrom)}" aria-label="Tanggal mulai grafik operasional">
                            <label for="adminChartDateTo">Sampai</label>
                            <input id="adminChartDateTo" type="date" value="${escapeHtml(customTo)}" aria-label="Tanggal akhir grafik operasional">
                        </div>
                        <div class="chart-grid chart-grid-4" style="margin-top:14px;">
                            <div class="chart-box operational-chart">
                                <h4>Tren Servis</h4>
                                ${lineChart}
                            </div>
                            <div class="chart-box operational-chart">
                                <h4>Distribusi Status Servis</h4>
                                ${pieChart}
                            </div>
                            <div class="chart-box operational-chart">
                                <h4>Histogram Volume Servis</h4>
                                ${histogramChart}
                            </div>
                            <div class="chart-box operational-chart">
                                <h4>Servis Berdasarkan Jenis Barang</h4>
                                ${itemChart}
                            </div>
                        </div>
                    </div>
                    <div class="admin-card admin-activity-card">
                        <div class="admin-card-header">
                            <h3>Aktivitas Terbaru</h3>
                            <button class="btn-primary" type="button" data-admin-page="services">Lihat semua</button>
                        </div>
                        <div class="admin-table-wrap admin-activity-table-wrap">
                            <table class="admin-table admin-activity-table">
                                <thead>
                                    <tr><th>ID</th><th>Tanggal</th><th>Customer</th><th>No. WhatsApp</th><th>Alamat</th><th>Google Maps</th><th>Media Customer</th><th>Barang</th><th>Keluhan</th><th>Status</th><th>Teknisi</th><th>Update</th></tr>
                                </thead>
                                <tbody>
                                    ${records.slice(0, 6).map(item => {
                                        const f = getServiceFormFields(item);
                                        const maps = safeExternalUrl(f.google_maps || item.google_maps || item.maps || '');
                                        return `
                                        <tr>
                                            <td class="id-cell">${escapeHtml(item.id || '-')}</td>
                                            <td>${escapeHtml(formatDate(f.tanggal && f.tanggal !== '-' ? f.tanggal : item.created_at || item.tanggal_masuk))}</td>
                                            <td>${escapeHtml(f.nama || item.customer_name || '-')}</td>
                                            <td>${escapeHtml(f.whatsapp || item.phone || '-')}</td>
                                            <td class="admin-activity-address">${escapeHtml(f.alamat || item.alamat || '-')}</td>
                                            <td>${maps ? `<a class="btn-secondary small admin-gmaps-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Lihat GMaps</a>` : '-'}</td>
                                            <td>${f.media_customer.length ? `<button type="button" class="btn-secondary small" data-tech-customer-media="${escapeHtml(item.id || '')}">Lihat Media</button>` : 'Belum Ada'}</td>
                                            <td>${escapeHtml(f.barang || item.item_name || '-')}</td>
                                            <td>${escapeHtml(f.keluhan || item.keluhan || '-')}</td>
                                            <td><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span></td>
                                            <td>${escapeHtml(f.teknisi || item.technician || 'Belum ada')}</td>
                                            <td>${escapeHtml(formatDateTimeValue(item.timestamp_update || item.updated_at || item.created_at || f.tanggal))}</td>
                                        </tr>`;
                                    }).join('') || '<tr><td colspan="12"><div class="admin-empty-state">Belum ada data servis dari database.</div></td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }


        function renderServicesPage() {
            const records = loadServiceRecords();
            const filtered = getFilteredServices(records, {
                keyword: document.getElementById('adminSearchInput') ? document.getElementById('adminSearchInput').value : '',
                status: document.getElementById('adminFilterStatus') ? document.getElementById('adminFilterStatus').value : 'all',
                date: document.getElementById('adminFilterDate') ? document.getElementById('adminFilterDate').value : 'all'
            });
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <div>
                            <h3>Data Servis</h3>
                            <p class="section-sub-text">Data pelanggan ditampilkan sesuai data yang diterima dari Google Form. Status servis hanya dapat diubah oleh Teknisi.</p>
                        </div>
                    </div>
                    <div class="filter-grid">
                        <input id="adminSearchInput" type="text" placeholder="Cari nama, WhatsApp, ID" value="">
                        <select id="adminFilterStatus">
                            <option value="all">Semua status</option>
                            ${APP_CONFIG.statusOptions.map(status => `<option value="${status}">${status}</option>`).join('')}
                        </select>
                        <select id="adminFilterDate">
                            <option value="all">Semua rentang</option>
                            <option value="today">Hari ini</option>
                            <option value="yesterday">Kemarin</option>
                            <option value="7">7 hari</option>
                            <option value="30">30 hari</option>
                            <option value="90">3 bulan</option>
                            <option value="180">6 bulan</option>
                            <option value="365">1 tahun</option>
                        </select>
                    </div>
                    <div class="admin-table-wrap">
                        <table class="admin-table admin-services-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Tanggal</th><th>Customer</th><th>No. WhatsApp</th><th>Alamat</th><th>Google Maps</th><th>Media Customer</th><th>Barang</th><th>Keluhan</th><th>Status</th><th>Teknisi</th><th>Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.length ? filtered.map(item => {
                                    const f = getServiceFormFields(item);
                                    const maps = safeExternalUrl(f.google_maps || item.google_maps || item.maps || '');
                                    return `
                                    <tr>
                                        <td class="id-cell">${escapeHtml(item.id)}</td>
                                        <td>${escapeHtml(formatDate(f.tanggal))}</td>
                                        <td>${escapeHtml(f.nama)}</td>
                                        <td>${escapeHtml(f.whatsapp)}</td>
                                        <td>${escapeHtml(f.alamat || item.alamat || '-')}</td>
                                        <td>${maps ? `<a class="btn-secondary small admin-gmaps-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Lihat GMaps</a>` : '-'}</td>
                                        <td>${f.media_customer.length ? `<button type="button" class="btn-secondary small" data-tech-customer-media="${escapeHtml(item.id || '')}">Lihat Media</button>` : 'Belum Ada'}</td>
                                        <td>${escapeHtml(f.barang)}</td>
                                        <td title="${escapeHtml(f.keluhan)}">${escapeHtml(f.keluhan)}</td>
                                        <td><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span></td>
                                        <td>${escapeHtml(f.teknisi)}</td>
                                        <td>${escapeHtml(formatDate(item.timestamp_update || item.created_at || f.tanggal))}</td>
                                    </tr>`;
                                }).join('') : '<tr><td colspan="12"><div class="admin-empty-state">Belum ada data servis.</div></td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }


        function renderRunningServicesPage() {
            const all = loadServiceRecords().filter(item => !isAdminCompleted(item));
            const period = window.__RUNNING_FILTER_PERIOD__ || (document.getElementById('runningPeriodFilter') ? document.getElementById('runningPeriodFilter').value : 'all');
            const keyword = (document.getElementById('runningSearchInput') ? document.getElementById('runningSearchInput').value : window.__RUNNING_FILTER__ || '').trim();
            const customFrom = window.__RUNNING_FILTER_CUSTOM_FROM__ || (document.getElementById('runningDateFrom') ? document.getElementById('runningDateFrom').value : '');
            const customTo = window.__RUNNING_FILTER_CUSTOM_TO__ || (document.getElementById('runningDateTo') ? document.getElementById('runningDateTo').value : '');
            const invalidRange = !!(period === 'custom' && customFrom && customTo && customFrom > customTo);
            const searched = getFilteredServices(all, { keyword, status: 'all', date: 'all' });
            const filtered = invalidRange ? [] : applyPeriodFilter(searched, period, 'created_at', customFrom, customTo);
            const emptyMessage = keyword ? 'Data servis tidak ditemukan.' : 'Tidak ada servis yang menunggu proses teknisi/Admin.';
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <div style="min-width:0;">
                            <h3>Servis Berjalan</h3>
                            <p class="section-sub-text">Status hanya berubah dari Teknisi. Admin tidak dapat mengubah status di halaman ini.</p>
                        </div>
                        <div class="admin-service-filter-bar">
                            <div class="admin-service-filter-group">
                                <label for="runningPeriodFilter" style="font-weight:700; white-space:nowrap;">Periode:</label>
                                <select id="runningPeriodFilter" class="admin-service-period-select" aria-label="Filter periode servis berjalan">
                                    <option value="all" ${period === 'all' ? 'selected' : ''}>Semua</option>
                                    <option value="today" ${period === 'today' ? 'selected' : ''}>Hari Ini</option>
                                    <option value="this_week" ${period === 'this_week' ? 'selected' : ''}>1 Minggu</option>
                                    <option value="1_month" ${period === '1_month' ? 'selected' : ''}>1 Bulan</option>
                                    <option value="6_month" ${period === '6_month' ? 'selected' : ''}>6 Bulan</option>
                                    <option value="1_year" ${period === '1_year' ? 'selected' : ''}>1 Tahun</option>
                                    <option value="custom" ${period === 'custom' ? 'selected' : ''}>Custom</option>
                                </select>
                            </div>
                            <input id="runningSearchInput" class="admin-service-search-input" type="text" placeholder="Cari nama, WhatsApp, ID Servis" value="${escapeHtml(keyword || '')}" />
                            <span class="admin-user-chip admin-service-total">Total: ${filtered.length}</span>
                        </div>
                    </div>
                    ${period === 'custom' ? `
                        <div class="admin-service-filter-bar" style="margin-bottom:16px; gap:12px; flex-wrap:wrap;">
                            <div class="admin-service-filter-group" style="flex:1 1 180px; min-width:180px;">
                                <label style="font-weight:700;">Dari:</label>
                                <input id="runningDateFrom" type="date" class="admin-service-period-select" value="${escapeHtml(customFrom)}" style="width:100%; min-width:150px;" />
                            </div>
                            <div class="admin-service-filter-group" style="flex:1 1 180px; min-width:180px;">
                                <label style="font-weight:700;">Sampai:</label>
                                <input id="runningDateTo" type="date" class="admin-service-period-select" value="${escapeHtml(customTo)}" style="width:100%; min-width:150px;" />
                            </div>
                        </div>
                    ` : ''}
                    <div class="admin-table-wrap">
                        <table class="admin-table admin-running-services-table">
                            <thead>
                                <tr><th>ID</th><th>Tanggal</th><th>Customer</th><th>No. WhatsApp</th><th>Alamat</th><th>Google Maps</th><th>Media Customer</th><th>Barang</th><th>Status</th><th>Teknisi</th><th>Aksi</th></tr>
                            </thead>
                            <tbody>
                                ${filtered.length ? filtered.map(item => {
                                    const f = getServiceFormFields(item);
                                    const maps = safeExternalUrl(f.google_maps || item.google_maps || item.maps || '');
                                    const technicianFinished = getServiceDisplayStatus(item.status) === 'Selesai';
                                    const adminConfirmed = isAdminCompleted(item);
                                    const done = technicianFinished && !adminConfirmed;
                                    return `
                                    <tr>
                                        <td class="id-cell">${escapeHtml(item.id)}</td>
                                        <td>${escapeHtml(formatDate(f.tanggal))}</td>
                                        <td>${escapeHtml(f.nama)}</td>
                                        <td>${escapeHtml(f.whatsapp)}</td>
                                        <td>${escapeHtml(f.alamat || item.alamat || '-')}</td>
                                        <td>${maps ? `<a class="btn-secondary small admin-gmaps-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Lihat GMaps</a>` : '-'}</td>
                                        <td>${f.media_customer.length ? `<button type="button" class="btn-secondary small" data-tech-customer-media="${escapeHtml(item.id || '')}">Lihat Media</button>` : 'Belum Ada'}</td>
                                        <td>${escapeHtml(f.barang)}</td>
                                        <td><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span></td>
                                        <td>${escapeHtml(f.teknisi)}</td>
                                        <td>
                                            <div class="admin-action-stack">
                                                <button class="admin-confirm-service-btn ${done ? 'ready' : 'blocked'}" type="button" data-admin-complete="${escapeHtml(item.id)}" ${done ? '' : 'disabled'} title="${done ? 'Konfirmasi servis selesai' : 'Menunggu Teknisi menyelesaikan servis'}">Update</button>
                                                <button class="btn-secondary small" type="button" data-open-detail="${escapeHtml(item.id)}">Detail</button>
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('') : `<tr><td colspan="11"><div class="admin-empty-state">${emptyMessage}</div></td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }


        function renderCompletedServicesPage() {
            const all = loadServiceRecords().filter(item => getServiceDisplayStatus(item.status) === 'Selesai' && isAdminCompleted(item));
            const period = window.__COMPLETED_FILTER_PERIOD__ || (document.getElementById('completedPeriodFilter') ? document.getElementById('completedPeriodFilter').value : 'all');
            const keyword = (document.getElementById('completedSearchInput') ? document.getElementById('completedSearchInput').value : window.__COMPLETED_FILTER__ || '').trim();
            const customFrom = window.__COMPLETED_FILTER_CUSTOM_FROM__ || (document.getElementById('completedDateFrom') ? document.getElementById('completedDateFrom').value : '');
            const customTo = window.__COMPLETED_FILTER_CUSTOM_TO__ || (document.getElementById('completedDateTo') ? document.getElementById('completedDateTo').value : '');
            const invalidRange = !!(period === 'custom' && customFrom && customTo && customFrom > customTo);
            const searched = getFilteredServices(all, { keyword, status: 'all', date: 'all' });
            const filtered = invalidRange ? [] : applyPeriodFilter(searched, period, 'tanggal_selesai', customFrom, customTo);
            const emptyMessage = keyword ? 'Data servis tidak ditemukan.' : 'Belum ada servis selesai pada periode ini.';
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>Servis Selesai</h3>
                        <div class="admin-service-filter-bar">
                            <div class="admin-service-filter-group">
                                <label style="font-weight:700; white-space:nowrap;">Periode:</label>
                                <select id="completedPeriodFilter" class="admin-service-period-select" aria-label="Filter periode servis selesai">
                                    <option value="all" ${period === 'all' ? 'selected' : ''}>Semua</option>
                                    <option value="today" ${period === 'today' ? 'selected' : ''}>Hari Ini</option>
                                    <option value="this_week" ${period === 'this_week' ? 'selected' : ''}>1 Minggu</option>
                                    <option value="1_month" ${period === '1_month' ? 'selected' : ''}>1 Bulan</option>
                                    <option value="6_month" ${period === '6_month' ? 'selected' : ''}>6 Bulan</option>
                                    <option value="1_year" ${period === '1_year' ? 'selected' : ''}>1 Tahun</option>
                                    <option value="custom" ${period === 'custom' ? 'selected' : ''}>Custom</option>
                                </select>
                            </div>
                            <input id="completedSearchInput" class="admin-service-search-input" type="text" placeholder="Cari nama, WhatsApp, ID Servis" value="${escapeHtml(keyword || '')}" />
                            <span class="admin-user-chip admin-service-total">Total: ${filtered.length}</span>
                        </div>
                    </div>
                    ${period === 'custom' ? `
                        <div class="admin-service-filter-bar" style="margin-bottom:16px; gap:12px; flex-wrap:wrap;">
                            <div class="admin-service-filter-group" style="flex:1 1 180px; min-width:180px;">
                                <label style="font-weight:700; white-space:nowrap;">Dari:</label>
                                <input id="completedDateFrom" type="date" class="admin-service-period-select" value="${escapeHtml(customFrom)}" style="width:100%; min-width:150px;" />
                            </div>
                            <div class="admin-service-filter-group" style="flex:1 1 180px; min-width:180px;">
                                <label style="font-weight:700; white-space:nowrap;">Sampai:</label>
                                <input id="completedDateTo" type="date" class="admin-service-period-select" value="${escapeHtml(customTo)}" style="width:100%; min-width:150px;" />
                            </div>
                        </div>
                    ` : ''}
                    ${invalidRange ? '<div class="admin-empty-state" style="margin-bottom:12px;">Tanggal Dari tidak boleh lebih besar dari tanggal Sampai.</div>' : ''}
                    <div class="admin-stat-grid-8 admin-completed-summary-grid" style="margin-bottom:16px;">
                        <div class="admin-stat-mini admin-completed-summary-total"><span class="label">Total Selesai</span><span class="value">${filtered.length}</span></div>
                        <div class="admin-stat-mini admin-completed-summary-status"><span class="label">Status</span><span class="value">Selesai</span></div>
                    </div>
                    <div class="admin-table-wrap">
                        <table class="admin-table admin-completed-services-table">
                            <thead>
                                <tr><th>ID</th><th>Tanggal Masuk</th><th>Tanggal Selesai</th><th>Customer</th><th>Alamat</th><th>Google Maps</th><th>Media Customer</th><th>Barang</th><th>Teknisi</th><th>Biaya</th><th>Status</th><th>Aksi</th></tr>
                            </thead>
                            <tbody>
                                ${filtered.length ? filtered.map(item => {
                                    const f = getServiceFormFields(item);
                                    const maps = safeExternalUrl(f.google_maps || item.google_maps || item.maps || '');
                                    return `
                                    <tr>
                                        <td class="id-cell">${escapeHtml(item.id)}</td>
                                        <td>${escapeHtml(formatDate(item.created_at || item.tanggal_masuk))}</td>
                                        <td>${escapeHtml(item.tanggal_selesai ? formatDate(item.tanggal_selesai) : '-')}</td>
                                        <td>${escapeHtml(f.nama || item.customer_name || '-')}</td>
                                        <td>${escapeHtml(f.alamat || item.alamat || '-')}</td>
                                        <td>${maps ? `<a class="btn-secondary small admin-gmaps-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Lihat GMaps</a>` : '-'}</td>
                                        <td>${f.media_customer.length ? `<button type="button" class="btn-secondary small" data-tech-customer-media="${escapeHtml(item.id || '')}">Lihat Media</button>` : 'Belum Ada'}</td>
                                        <td>${escapeHtml(f.barang || item.item_name || '-')}</td>
                                        <td>${escapeHtml(item.technician || 'Belum ada')}</td>
                                        <td>${escapeHtml(item.biaya || '-')}</td>
                                        <td><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span></td>
                                        <td><button class="btn-secondary small" type="button" data-open-detail="${escapeHtml(item.id)}">Detail</button></td>
                                    </tr>
                                `;}).join('') : `<tr><td colspan="12"><div class="admin-empty-state">${emptyMessage}</div></td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }


        function getAdminCustomerGroups() {
            const records = loadServiceRecords();
            const groups = new Map();

            records.forEach(item => {
                const form = getServiceFormFields(item);
                const name = String(form.nama && form.nama !== '-' ? form.nama : item.customer_name || 'Pelanggan').trim() || 'Pelanggan';
                const phone = normalizePhone(form.whatsapp || item.phone || '');
                const key = phone || name.toLowerCase().replace(/\s+/g, '-');

                if (!groups.has(key)) {
                    groups.set(key, {
                        key,
                        name,
                        phone: phone || form.whatsapp || item.phone || 'Tidak tersedia',
                        total: 0,
                        active: 0,
                        completed: 0,
                        totalRevenue: 0,
                        lastDate: null
                    });
                }

                const customer = groups.get(key);
                const status = getServiceDisplayStatus(item.status);
                customer.total += 1;
                if (status === 'Sedang Diproses') customer.active += 1;
                if (status === 'Selesai') customer.completed += 1;

                const revenueValue = Number(String(item.biaya ?? item.BIAYA ?? item.total_biaya ?? item.totalBiaya ?? '').replace(/[^0-9]/g, '')) || 0;
                customer.totalRevenue += revenueValue;

                const last = parseDateValue(item.created_at || item.tanggal_masuk || item.timestamp_update || item.updated_at || '');
                if (last && (!customer.lastDate || last > customer.lastDate)) {
                    customer.lastDate = last;
                }
            });

            return Array.from(groups.values())
                .map(customer => ({
                    ...customer,
                    lastDate: customer.lastDate ? formatDate(customer.lastDate) : '-'
                }))
                .sort((a, b) => {
                    const aTime = a.lastDate && a.lastDate !== '-' ? new Date(a.lastDate).getTime() : 0;
                    const bTime = b.lastDate && b.lastDate !== '-' ? new Date(b.lastDate).getTime() : 0;
                    return bTime - aTime;
                });
        }



        function renderCustomerProfile(customerKey) {
            const key = String(customerKey || '').trim();
            if (!key) {
                showToast('Pelanggan tidak ditemukan.', 'error');
                return;
            }

            const records = loadServiceRecords();
            const normalized = normalizePhone(key);
            const match = records.filter(item => {
                const form = getServiceFormFields(item);
                const phoneMatch = normalizePhone(form.whatsapp || item.phone || '') === normalized;
                const nameMatch = String(form.nama && form.nama !== '-' ? form.nama : item.customer_name || '').trim().toLowerCase() === key.toLowerCase();
                return phoneMatch || nameMatch;
            });

            if (!match.length) {
                showToast('Data pelanggan tidak ditemukan.', 'error');
                return;
            }

            const detailPhone = match[0].phone || getServiceFormFields(match[0]).whatsapp || key;
            openCustomerServices(detailPhone);
        }



        function renderCustomersPage() {
            const customers = getAdminCustomerGroups();
            const table = customers.map(customer => `
                <tr>
                    <td><strong>${escapeHtml(customer.name)}</strong></td>
                    <td>${escapeHtml(customer.phone)}</td>
                    <td>${customer.total}</td>
                    <td>${customer.active}</td>
                    <td>${customer.completed}</td>
                    <td>${escapeHtml(formatRupiah(customer.totalRevenue))}</td>
                    <td>${escapeHtml(customer.lastDate)}</td>
                    <td><button class="btn-secondary small" type="button" data-customer-detail="${escapeHtml(customer.key)}">Detail</button></td>
                </tr>
            `).join('');
            return `
                <div class="admin-card admin-customers-card">
                    <div class="admin-card-header"><div><h3>Manajemen Pelanggan</h3><p class="section-sub-text">Ringkasan servis dan transaksi setiap pelanggan.</p></div><span class="admin-user-chip">${customers.length} pelanggan</span></div>
                    <div class="admin-table-wrap admin-customers-table-wrap">
                        <table class="admin-table admin-customers-table">
                            <thead><tr><th>Customer</th><th>No. WhatsApp</th><th>Jumlah Servis</th><th>Servis Aktif</th><th>Servis Selesai</th><th>Total Transaksi</th><th>Servis Terakhir</th><th>Aksi</th></tr></thead>
                            <tbody>${table || '<tr><td colspan="8"><div class="admin-empty-state">Belum ada data pelanggan.</div></td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }


        function openCustomerServices(phone) {
            const customerRecords = loadServiceRecords().filter(item => normalizePhone(item.phone) === normalizePhone(phone));
            if (!customerRecords.length) {
                showToast('Data servis pelanggan tidak ditemukan.', 'error');
                return;
            }
            const customerName = customerRecords[0].customer_name || 'Pelanggan';
            const content = `
                <div class="leressae-detail-back-row">
                    <button type="button" class="leressae-back-btn" data-customer-services-back>
                        <span class="leressae-back-icon">&#8592;</span><span>Kembali ke Pelanggan</span>
                    </button>
                </div>
                <div class="customer-services-heading">
                    <h3>Riwayat Servis - ${escapeHtml(customerName)}</h3>
                    <span class="admin-user-chip">${customerRecords.length} servis</span>
                </div>
                <div class="customer-service-detail-list">
                    ${customerRecords.map(renderServiceDetailCard).join('')}
                </div>
            `;
            renderAdminAppShell('customers', content);
            requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
        }


function getTechnicianStatsForUser(user) {
            const records = loadServiceRecords();
            const assigned = records.filter(item => {
                const matchName = String(item.technician || '').toLowerCase() === String(user.NAMA || '').toLowerCase();
                const matchUser = String(item.id_teknisi || '').toLowerCase() === String(user.USERNAME || '').toLowerCase();
                return matchName || matchUser;
            });
            const active = assigned.filter(item => getServiceDisplayStatus(item.status) === 'Sedang Diproses').length;
            const completed = assigned.filter(item => getServiceDisplayStatus(item.status) === 'Selesai').length;
            return { active, completed, total: assigned.length };
        }


        function getTechnicianHistory() {
            try {
                const saved = localStorage.getItem(STORAGE_KEYS.serviceHistory);
                if (!saved) return [];
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return [];
            }
        }


        function saveTechnicianHistory(history) {
            localStorage.setItem(STORAGE_KEYS.serviceHistory, JSON.stringify(Array.isArray(history) ? history : []));
        }


        function recordTechnicianHistory(serviceId, oldStatus, newStatus, technicianName, notes = '', admin = 'ADMIN_1', details = {}) {
            const history = getTechnicianHistory();
            history.push({
                ID_HISTORY: details.ID_HISTORY || ('HIST-' + Date.now() + '-' + Math.random().toString(16).slice(2, 6)),
                ID_SERVIS: serviceId,
                TIMESTAMP: details.TIMESTAMP || new Date().toISOString(),
                STATUS_LAMA: getServiceDisplayStatus(oldStatus),
                STATUS_BARU: getServiceDisplayStatus(newStatus),
                TEKNISI: technicianName,
                CATATAN: notes || '',
                KETERANGAN_SELESAI: details.KETERANGAN_SELESAI || '',
                BIAYA_TIPE: details.BIAYA_TIPE || '',
                BIAYA_NOMINAL: Number.isFinite(Number(details.BIAYA_NOMINAL)) ? Number(details.BIAYA_NOMINAL) : 0,
                ADMIN: admin || ''
            });
            saveTechnicianHistory(history);
        }


        function renderTechniciansPage() {
            const techUsers = getTechnicianUsers();
            const records = loadServiceRecords();
            const loadError = window.__TECHNICIAN_LOAD_ERROR__ || '';
            const filters = window.__TECHNICIAN_FILTERS__ || { query: '', status: 'all' };
            const q = (document.getElementById('techSearchInput') ? document.getElementById('techSearchInput').value : filters.query || '').trim().toLowerCase();
            const statusFilter = (document.getElementById('techStatusFilter') ? document.getElementById('techStatusFilter').value : filters.status || 'all');
            const filteredUsers = techUsers.filter(user => {
                const matchesStatus = statusFilter === 'all' || String(user.STATUS || '').toUpperCase() === statusFilter;
                const searchText = [user.NAMA, user.USERNAME, user.SPESIALISASI, user.NO_WHATSAPP].join(' ').toLowerCase();
                return matchesStatus && (!q || searchText.includes(q));
            });
            const rows = filteredUsers.map(user => {
                const stats = getTechnicianStatsForUser(user);
                return `
                    <tr>
                        <td>${escapeHtml(user.NAMA)}</td>
                        <td>${escapeHtml(user.USERNAME)}</td>
                        <td><span class="status-badge ${String(user.STATUS || 'AKTIF').toUpperCase() === 'AKTIF' ? 'done' : 'cancelled'}">${escapeHtml(String(user.STATUS || 'AKTIF'))}</span></td>
                        <td>${stats.active}</td>
                        <td>${stats.completed}</td>
                        <td>${stats.total}</td>
                        <td>
                            <div class="admin-action-stack admin-tech-actions">
                                <button class="btn-secondary small" type="button" data-tech-detail="${escapeHtml(user.USERNAME)}">Lihat</button>
                                <button class="btn-secondary small" type="button" data-tech-edit="${escapeHtml(user.USERNAME)}">Edit</button>
                                <button class="save-status-btn" type="button" data-tech-toggle="${escapeHtml(user.USERNAME)}">${String(user.STATUS || 'AKTIF').toUpperCase() === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            const activeServices = records.filter(item => getServiceDisplayStatus(item.status) === 'Sedang Diproses').length;
            const completedServices = records.filter(item => getServiceDisplayStatus(item.status) === 'Selesai').length;
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>Manajemen Teknisi</h3>
                        <button class="btn-secondary" type="button" data-tech-action="sync-local">Sinkronkan Akun Lama</button>
                        <button class="btn-primary" type="button" data-tech-action="add">+ Tambah Teknisi</button>
                    </div>
                    ${loadError ? `<div class="admin-empty-state" role="alert" style="margin:12px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;"><span>${escapeHtml(loadError)}</span><button class="btn-secondary small" type="button" data-tech-action="retry">Coba lagi</button></div>` : ''}
                    <div class="admin-stat-grid-8">
                        <div class="admin-stat-mini"><span class="label">Total Teknisi</span><span class="value">${techUsers.length}</span></div>
                        <div class="admin-stat-mini"><span class="label">Teknisi Aktif</span><span class="value">${techUsers.filter(u => String(u.STATUS || '').toUpperCase() === 'AKTIF').length}</span></div>
                        <div class="admin-stat-mini"><span class="label">Teknisi Nonaktif</span><span class="value">${techUsers.filter(u => String(u.STATUS || '').toUpperCase() !== 'AKTIF').length}</span></div>
                        <div class="admin-stat-mini"><span class="label">Servis Aktif</span><span class="value">${activeServices}</span></div>
                        <div class="admin-stat-mini"><span class="label">Servis Selesai</span><span class="value">${completedServices}</span></div>
                    </div>
                    <div class="filter-grid" style="margin-top:16px;">
                        <select id="techStatusFilter">
                            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>Semua Status</option>
                            <option value="AKTIF" ${statusFilter === 'AKTIF' ? 'selected' : ''}>Aktif</option>
                            <option value="NONAKTIF" ${statusFilter === 'NONAKTIF' ? 'selected' : ''}>Nonaktif</option>
                        </select>
                        <input id="techSearchInput" type="text" placeholder="Cari nama / username / spesialisasi" value="${escapeHtml(q)}" />
                    </div>
                    <div class="admin-table-wrap admin-tech-management-wrap" style="margin-top:16px;">
                        <table class="admin-table admin-tech-management-table">
                            <thead>
                                <tr>
                                    <th>Nama Teknisi</th>
                                    <th>Username</th>
                                    <th>Status</th>
                                    <th>Servis Aktif</th>
                                    <th>Servis Selesai</th>
                                    <th>Total Servis</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows || '<tr><td colspan="7"><div class="admin-empty-state">Belum ada data teknisi.</div></td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }


        function getAllowedTechnicianStatuses(currentStatus) {
            const current = getServiceDisplayStatus(currentStatus);
            if (current === 'Selesai') return [];
            return ['Selesai'];
        }


        function canTechnicianUpdateStatus(currentStatus, nextStatus) {
            const current = getServiceDisplayStatus(currentStatus);
            const next = getServiceDisplayStatus(nextStatus);
            if (current === 'Selesai') return false;
            return next === 'Sedang Diproses' || next === 'Selesai';
        }


        function renderTechnicianPanel() {
            const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.technicianSession) || '{}');
            if (!session || !session.role || session.role !== 'technician') {
                return `
                    <div class="admin-card">
                        <div class="admin-empty-state">Silakan login sebagai teknisi untuk membuka panel.</div>
                    </div>
                `;
            }
            const techUser = getTechnicianUsers().find(item => String(item.USERNAME || '').toLowerCase() === String(session.username || '').toLowerCase());
            const workplaces = loadServiceRecords().filter(item => {
                const sameTechnician = String(item.technician || '').toLowerCase() === String(session.name || '').toLowerCase();
                const sameUser = String(item.id_teknisi || '').toLowerCase() === String(session.username || '').toLowerCase();
                return sameTechnician || sameUser;
            });
            const activeJobs = workplaces.filter(item => getServiceDisplayStatus(item.status) === 'Sedang Diproses');
            const inProgress = workplaces.filter(item => getServiceDisplayStatus(item.status) === 'Sedang Diproses');
            const rows = activeJobs.map(item => `
                <tr>
                    <td class="id-cell">${escapeHtml(item.id)}</td>
                    <td>${escapeHtml(item.customer_name || '-')}</td>
                    <td>${escapeHtml(item.item_name || '-')}</td>
                    <td>${escapeHtml(item.keluhan || '-')}</td>
                    <td>${escapeHtml(formatDate(item.created_at || item.tanggal_masuk))}</td>
                    <td><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span></td>
                    <td>
                        <button class="btn-secondary small" type="button" data-tech-job-detail="${escapeHtml(item.id)}">Lihat Detail</button>
                    </td>
                </tr>
            `).join('');
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>Halo, ${escapeHtml(session.name || techUser?.NAMA || 'Teknisi')}</h3>
                        <button class="btn-secondary" type="button" onclick="logoutTechnician()">Logout</button>
                    </div>
                    <div class="admin-stat-grid-8">
                        <div class="admin-stat-mini"><span class="label">Pekerjaan Masuk</span><span class="value">${activeJobs.length}</span></div>
                        <div class="admin-stat-mini"><span class="label">Sedang Diproses</span><span class="value">${inProgress.length}</span></div>
                        <div class="admin-stat-mini"><span class="label">Total Pekerjaan Aktif</span><span class="value">${activeJobs.length}</span></div>
                    </div>
                    <div class="admin-table-wrap" style="margin-top:16px;">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>ID Servis</th>
                                    <th>Customer</th>
                                    <th>Barang</th>
                                    <th>Keluhan</th>
                                    <th>Tanggal Masuk</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows || '<tr><td colspan="7"><div class="admin-empty-state">Tidak ada pekerjaan untuk teknisi ini.</div></td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }


        function renderTechnicianPanelPage() {
            const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.technicianSession) || '{}');
            if (!session || session.role !== 'technician') {
                navigateTo('page-dashboard');
                return;
            }
            let techPage = document.getElementById('page-technician');
            if (!techPage) {
                techPage = document.createElement('section');
                techPage.id = 'page-technician';
                techPage.className = 'page-view active';
                techPage.setAttribute('aria-hidden', 'false');
                document.querySelector('.wrapper')?.appendChild(techPage);
            }
            let panel = document.getElementById('technicianPanelContent');
            if (!panel) {
                panel = document.createElement('div');
                panel.id = 'technicianPanelContent';
                panel.className = 'technician-panel-wrap';
                techPage.appendChild(panel);
            }
            panel.innerHTML = renderTechnicianPanel();
            document.querySelectorAll('.page-view').forEach(page => {
                const isTech = page.id === 'page-technician';
                page.classList.toggle('active', isTech);
                page.setAttribute('aria-hidden', isTech ? 'false' : 'true');
            });
            techPage.classList.add('active');
        }


        function openTechnicianModal(mode, username) {
            const users = getTechnicianUsers();
            const current = mode === 'edit' ? users.find(user => String(user.USERNAME || '').toLowerCase() === String(username || '').toLowerCase()) : null;
            const modal = document.createElement('div');
            modal.className = 'stock-modal show';
            modal.innerHTML = `
                <div class="stock-panel">
                    <div class="stock-panel-header">
                        <button class="stock-close" type="button">×</button>
                        <h3>${mode === 'edit' ? 'Edit Teknisi' : 'Tambah Teknisi'}</h3>
                    </div>
                    <form class="stock-body" id="techEditorForm">
                        <div class="field-row"><label>Nama Lengkap</label><input name="nama" required value="${escapeHtml(current?.NAMA || '')}"></div>
                        <div class="field-row"><label>Username</label><input name="username" required value="${escapeHtml(current?.USERNAME || '')}"></div>
                        <div class="field-row"><label>Password Baru</label><input name="password" type="password" placeholder="${mode === 'edit' ? 'Kosongkan bila tidak ingin mengganti' : 'Wajib diisi'}"></div>
                        <div class="field-row"><label>Konfirmasi Password</label><input name="confirmPassword" type="password" placeholder="${mode === 'edit' ? 'Kosongkan bila tidak ingin mengganti' : 'Ulangi password'}"></div>
                        <div class="field-row"><label>No. WhatsApp</label><input name="whatsapp" value="${escapeHtml(current?.NO_WHATSAPP || '')}"></div>
                        <div class="field-row"><label>Spesialisasi</label><input name="spesialisasi" value="${escapeHtml(current?.SPESIALISASI || '')}"></div>
                        <div class="field-row"><label>Status</label><select name="status"><option value="AKTIF" ${String(current?.STATUS || 'AKTIF').toUpperCase() === 'AKTIF' ? 'selected' : ''}>Aktif</option><option value="NONAKTIF" ${String(current?.STATUS || 'AKTIF').toUpperCase() === 'NONAKTIF' ? 'selected' : ''}>Nonaktif</option></select></div>
                        <div class="stock-actions"><button class="btn-secondary" type="button">Batal</button><button class="btn-primary" type="submit">Simpan</button></div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            const close = () => modal.remove();
            modal.querySelectorAll('button[type="button"]').forEach(btn => btn.onclick = close);
            modal.querySelector('form').onsubmit = async event => {
                event.preventDefault();
                const form = new FormData(event.target);
                const payload = Object.fromEntries(form.entries());
                const nama = String(payload.nama || '').trim();
                const usernameValue = String(payload.username || '').trim();
                const password = String(payload.password || '');
                const confirmPassword = String(payload.confirmPassword || '');
                const status = String(payload.status || 'AKTIF').toUpperCase();
                if (!nama) { showToast('Nama wajib diisi.', 'error'); return; }
                if (!usernameValue) { showToast('Username wajib diisi.', 'error'); return; }
                if (!current && !password) { showToast('Password wajib diisi.', 'error'); return; }
                if (password || confirmPassword) {
                    if (password !== confirmPassword) { showToast('Password dan konfirmasi harus sama.', 'error'); return; }
                }
                const existing = users.find(user => String(user.USERNAME || '').toLowerCase() === usernameValue.toLowerCase() && (!current || String(user.USERNAME || '').toLowerCase() !== String(current.USERNAME || '').toLowerCase()));
                if (existing) { showToast('Username teknisi sudah digunakan.', 'error'); return; }
                const normalizedUser = {
                    id: current?.id || current?.USER_ID || current?.ID || '',
                    name: nama,
                    username: usernameValue,
                    password: password || current?.password || current?.PASSWORD || current?.PASSWORD_HASH || '',
                    role: 'TEKNISI',
                    status: status,
                    specialization: payload.spesialisasi || current?.specialization || current?.SPESIALISASI || '',
                    phone: payload.whatsapp || current?.phone || current?.NO_WHATSAPP || '',
                    createdAt: current?.createdAt || current?.CREATED_AT || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastLogin: current?.lastLogin || current?.LAST_LOGIN || ''
                };
                try {
                    const backendPassword = password || current?.PASSWORD || current?.PASSWORD_HASH || current?.password || '';
                    await saveTechnicianToBackend(normalizedUser, current?.USERNAME || usernameValue, backendPassword);
                    await refreshTechniciansFromBackend();
                    close();
                    showAdminPage('technicians');
                    showToast(mode === 'edit' ? 'Data teknisi berhasil diperbarui.' : 'Teknisi baru berhasil dibuat.', 'success');
                } catch (error) {
                    if (handleTechnicianAuthError(error)) return;
                    showToast(error.message || 'Akun Teknisi gagal disimpan.', 'error');
                }
            };
        }


        function renderTechnicianDetail(username) {
            const users = getTechnicianUsers();
            const user = users.find(item => String(item.USERNAME || '').toLowerCase() === String(username || '').toLowerCase());
            if (!user) { showToast('Data teknisi tidak ditemukan.', 'error'); return; }
            const records = loadServiceRecords();
            const assigned = records.filter(item => {
                const sameName = String(item.technician || '').toLowerCase() === String(user.NAMA || '').toLowerCase();
                const sameUser = String(item.id_teknisi || '').toLowerCase() === String(user.USERNAME || '').toLowerCase();
                return sameName || sameUser;
            });
            const active = assigned.filter(item => getServiceDisplayStatus(item.status) === 'Sedang Diproses');
            const completed = assigned.filter(item => getServiceDisplayStatus(item.status) === 'Selesai');
            const detail = document.getElementById('statusResult');
            if (!detail) return;
            detail.innerHTML = `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>Detail Teknisi</h3>
                    </div>
                    <div class="service-meta" style="margin-bottom:16px;">
                        <div><strong>Nama:</strong> ${escapeHtml(user.NAMA)}</div>
                        <div><strong>Username:</strong> ${escapeHtml(user.USERNAME)}</div>
                        <div><strong>Status:</strong> <span class="status-badge ${String(user.STATUS || 'AKTIF').toUpperCase() === 'AKTIF' ? 'done' : 'cancelled'}">${escapeHtml(String(user.STATUS || 'AKTIF'))}</span></div>
                        <div><strong>Servis Aktif:</strong> ${active.length}</div>
                        <div><strong>Servis Selesai:</strong> ${completed.length}</div>
                        <div><strong>Total Servis:</strong> ${assigned.length}</div>
                    </div>
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>ID Servis</th><th>Customer</th><th>Barang</th><th>Status</th><th>Tanggal Masuk</th><th>Tanggal Selesai</th></tr></thead>
                            <tbody>
                                ${assigned.length ? assigned.map(item => `
                                    <tr>
                                        <td class="id-cell">${escapeHtml(item.id)}</td>
                                        <td>${escapeHtml(item.customer_name || '-')}</td>
                                        <td>${escapeHtml(item.item_name || '-')}</td>
                                        <td><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(item.status || '-')}</span></td>
                                        <td>${escapeHtml(formatDate(item.created_at || item.tanggal_masuk))}</td>
                                        <td>${escapeHtml(item.tanggal_selesai ? formatDate(item.tanggal_selesai) : '-')}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="6"><div class="admin-empty-state">Tidak ada riwayat pekerjaan.</div></td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            navigateTo('page-status');
        }
const SIKELING_SUDAH_KELUAR_APP_ROWS = [["","BBM Pertamax","91","Kupon"],["","Pelumas Semprot WD-40","4","Kaleng"],["","Amplas Roll Grit 100","10","Meter"],["","Amplas Roll Grit 400","10","Meter"],["","Batu gerinda ukuran 4''","5","Box"],["","Elektronik Tenol 0.8 mm Elektronik Tenol","1","Buah"],["","Mata gerinda mesin gerinda - flap disc","4","Box"],["","StainClean Gel Pembersih Stainlessteel","2","Botol"],["","Sikat Kawat Sikat Kawat Kuningan Halus 6 Baris / 6B","6","Buah"],["","Elemen Pemanas Sealer Ukuran 20 cm","20","Buah"],["","Elemen Pemanas Sealer Ukuran 30 cm","20","Buah"],["","Elemen Pemanas Sealer Ukuran 40 cm","20","Buah"],["","Lapisan Sealer Dengan Perekat","2","Roll"],["","Selang Kompor Gas Selang LPG","20","Meter"],["","Regulator LPG Regulator Kompor High Pressure","2","Buah"],["","Tabung Gas LPG Tabung Gas LPG 5.5 kg dengan Isi","2","Buah"],["","Klem Selang Pengunci Kupu Kupu","37","Buah"],["","Potensiometer Mono Mono","20","Buah"],["","Mata bor HSS ukuran 1-13 mm","1","Set"],["","Mur Baut 10 mm","2","Buah"],["","Bearing 6201 RS Bearing Diameter as 12 mm","40","Buah"],["","Ballpoint Standard AE-7","11","Buah"],["","Lakban Lakban Kertas","1","Buah"],["","Spidol besar JUMBO 850 WHITEBOARD","6","Buah"],["","Stopmap biola","11","Buah"],["","Kertas HVS 70 gsm (fotocopy) Kwarto","3","Rim"],["","Kabel Listrik NYAF LMK warna Hitam (1x0,75 mm² Standar)","4","Roll"],["","Kabel Listrik NYY ukuran 2x1,5","90","Meter"],["","Steker Steker 1 Phase 220v","20","Buah"],["","isolasi bakar 4 mm","20","Meter"],["","Saklar On/Off Saklar Switch On/Off dengan Lampu","19","Buah"],["","Jumlah","",""]];
const SIKELING_BON_TOTAL_1_ROWS = [["","BBM Pertamax","155","Kupon","64"],["","BBM Solar Industri","162","Kupon","162"],["","Oli Pelumas -","40","Liter","40"],["","Pelumas Semprot WD-40","20","Kaleng","20"],["","Amplas Roll Grit 100","10","Meter","8"],["","Amplas Roll Grit 400","10","Meter","0"],["","Batu gerinda ukuran 4''","5","Box","5"],["","Elektronik Tenol 0.8 mm Elektronik Tenol","1","Buah","0"],["","Mata gerinda mesin gerinda - flap disc","4","Box","4"],["","StainClean Gel Pembersih Stainlessteel","2","Botol","2"],["","Sikat Kawat Sikat Kawat Kuningan Halus 6 Baris / 6B","6","Buah","6"],["","Kain Pulp/majun kain","25","Kg","25"],["","Elemen Pemanas Sealer Ukuran 20 cm","20","Buah","17"],["","Elemen Pemanas Sealer Ukuran 30 cm","20","Buah","20"],["","Elemen Pemanas Sealer Ukuran 40 cm","20","Buah","18"],["","Lapisan Sealer Dengan Perekat","2","Roll","1"],["","Selang Kompor Gas Selang LPG","20","Meter","20"],["","Regulator LPG Regulator Kompor High Pressure","2","Buah","2"],["","Tabung Gas LPG Tabung Gas LPG 5.5 kg dengan Isi","2","Buah","2"],["","Klem Selang Pengunci Kupu Kupu","37","Buah","30"],["","Potensiometer Mono Mono","20","Buah","0"],["","Mata bor HSS ukuran 1-13 mm","1","Set","1"],["","Mur Baut 10 mm","2","Buah","2"],["","Bearing 6201 RS Bearing Diameter as 12 mm","40","Buah","40"],["","Ballpoint Standard AE-7","11","Buah","11"],["","Lakban Lakban Kertas","1","Buah","0"],["","Spidol besar JUMBO 850 WHITEBOARD","6","Buah","0"],["","Stopmap biola","11","Buah","11"],["","Kertas HVS 70 gsm (fotocopy) Kwarto","3","Rim","3"],["","Kabel Listrik NYAF LMK warna Hitam (1x0,75 mm² Standar)","4","Roll","2"],["","Kabel Listrik NYY ukuran 2x1,5","90","Meter","45"],["","Steker Steker 1 Phase 220v","20","Buah","15"],["","isolasi bakar 4 mm","20","Meter","10"],["","Saklar On/Off Saklar Switch On/Off dengan Lampu","19","Buah","15"],["","Penggandaan HVS 70 gram","231","Lembar","-"],["","Jilid lakban","3","Buku","-"],["","Jumlah","","",""]];
const SIKELING_BON_TOTAL_ROWS = [["5.1.02.01.001.00004","Belanja Bahan-Bahan Bakar dan Pelumas","","","","Rp0","Rp0","Rp0","Rp13.960.000","Rp0","Rp0","Rp0","Rp7.760.000","Rp0","Rp0","Rp0","Rp0","Rp0","Rp21.720.000"],["","[ # ] Layanan SI KELING","","","","","","","","","","","","","","","","",""],["","[ - ] BPTTG","","","","","","","","","","","","","","","","",""],["","BBM Pertamax","84 Kupon","Rp14.000","Rp7.910.000","","","","Rp4.200.000","","","","Rp3.710.000","","","","","Rp0","Rp7.910.000"],["","BBM Solar Industri","81 Kupon","Rp18.000","Rp8.100.000","","","","Rp4.050.000","","","","Rp4.050.000","","","","","Rp0","Rp8.100.000"],["","Oli Pelumas -","40 Liter","Rp75.000","Rp3.000.000","","","","Rp3.000.000","","","","","","","","","Rp0","Rp3.000.000"],["","Pelumas Semprot WD-40","20 Kaleng","Rp135.500","Rp2.710.000","","","","Rp2.710.000","","","","","","","","","Rp0","Rp2.710.000"],["5.1.02.01.001.00012","Belanja Bahan-Bahan Lainnya","","","","Rp0","Rp0","Rp0","Rp9.631.000","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp9.631.000"],["","[ # ] Layanan SI KELING","","","","","","","","","","","","","","","","",""],["","[ - ] BPTTG","","","","","","","","","","","","","","","","",""],["","Amplas Roll Grit 100","10 Meter","Rp19.000","Rp190.000","","","","Rp190.000","","","","","","","","","Rp0","Rp190.000"],["","Amplas Roll Grit 400","10 Meter","Rp16.000","Rp160.000","","","","Rp160.000","","","","","","","","","Rp0","Rp160.000"],["","Batu gerinda ukuran 4''","5 Box","Rp287.500","Rp1.437.500","","","","Rp1.437.500","","","","","","","","","Rp0","Rp1.437.500"],["","Elektronik Tenol 0.8 mm Elektronik Tenol","1 Buah","Rp116.500","Rp116.500","","","","Rp116.500","","","","","","","","","Rp0","Rp116.500"],["","Mata gerinda mesin gerinda - flap disc","4 Box","Rp258.500","Rp1.034.000","","","","Rp1.034.000","","","","","","","","","Rp0","Rp1.034.000"],["","StainClean Gel Pembersih Stainlessteel","2 Botol","Rp327.000","Rp654.000","","","","Rp654.000","","","","","","","","","Rp0","Rp654.000"],["","Sikat Kawat Sikat Kawat Kuningan Halus 6 Baris / 6B","6 Buah","Rp31.000","Rp186.000","","","","Rp186.000","","","","","","","","","Rp0","Rp186.000"],["","Kain Pulp/majun kain","25 Kg","Rp46.000","Rp1.150.000","","","","Rp1.150.000","","","","","","","","","Rp0","Rp1.150.000"],["","Elemen Pemanas Sealer Ukuran 20 cm","20 Buah","Rp20.000","Rp400.000","","","","Rp400.000","","","","","","","","","Rp0","Rp400.000"],["","Elemen Pemanas Sealer Ukuran 30 cm","20 Buah","Rp20.000","Rp400.000","","","","Rp400.000","","","","","","","","","Rp0","Rp400.000"],["","Elemen Pemanas Sealer Ukuran 40 cm","20 Buah","Rp20.000","Rp400.000","","","","Rp400.000","","","","","","","","","Rp0","Rp400.000"],["","Lapisan Sealer Dengan Perekat","2 Roll","Rp50.000","Rp100.000","","","","Rp100.000","","","","","","","","","Rp0","Rp100.000"],["","Selang Kompor Gas Selang LPG","20 Meter","Rp20.000","Rp400.000","","","","Rp400.000","","","","","","","","","Rp0","Rp400.000"],["","Regulator LPG Regulator Kompor High Pressure","2 Buah","Rp125.000","Rp250.000","","","","Rp250.000","","","","","","","","","Rp0","Rp250.000"],["","Tabung Gas LPG Tabung Gas LPG 5.5 kg dengan Isi","2 Buah","Rp450.000","Rp900.000","","","","Rp900.000","","","","","","","","","Rp0","Rp900.000"],["","Klem Selang Pengunci Kupu Kupu","37 Buah","Rp2.000","Rp74.000","","","","Rp74.000","","","","","","","","","Rp0","Rp74.000"],["","Potensiometer Mono Mono","20 Buah","Rp7.000","Rp140.000","","","","Rp140.000","","","","","","","","","Rp0","Rp140.000"],["","Mata bor HSS ukuran 1-13 mm","1 Set","Rp1.639.000","Rp1.639.000","","","","Rp1.639.000","","","","","","","","","Rp0","Rp1.639.000"],["5.1.02.01.001.00020","Belanja Suku Cadang-Suku Cadang Alat Bengkel","","","","Rp0","Rp0","Rp0","Rp813.100","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp813.100"],["","[ # ] Layanan SI KELING","","","","","","","","","","","","","","","","",""],["","[ - ] BPTTG","","","","","","","","","","","","","","","","",""],["","Mur Baut 10 mm","2 Buah","Rp6.550","Rp13.100","","","","Rp13.100","","","","","","","","","Rp0","Rp13.100"],["","Bearing 6201 RS Bearing Diameter as 12 mm","40 Buah","Rp20.000","Rp800.000","","","","Rp800.000","","","","","","","","","Rp0","Rp800.000"],["5.1.02.01.001.00024","Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor","","","","Rp0","Rp0","Rp0","Rp206.050","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp206.050"],["","[ # ] Layanan SI KELING","","","","","","","","","","","","","","","","",""],["","[ - ] BPTTG","","","","","","","","","","","","","","","","",""],["","Ballpoint Standard AE-7","11 Buah","Rp3.600","Rp39.600","","","","Rp39.600","","","","","","","","","Rp0","Rp39.600"],["","Lakban Lakban Kertas","1 Buah","Rp20.000","Rp20.000","","","","Rp20.000","","","","","","","","","Rp0","Rp20.000"],["","Spidol besar JUMBO 850 WHITEBOARD","6 Buah","Rp19.000","Rp114.000","","","","Rp114.000","","","","","","","","","Rp0","Rp114.000"],["","Stopmap biola","11 Buah","Rp2.950","Rp32.450","","","","Rp32.450","","","","","","","","","Rp0","Rp32.450"],["5.1.02.01.001.00025","Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover","","","","Rp0","Rp0","Rp0","Rp171.000","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp171.000"],["","[ # ] Layanan SI KELING","","","","","","","","","","","","","","","","",""],["","[ - ] BPTTG","","","","","","","","","","","","","","","","",""],["","Kertas HVS 70 gsm (fotocopy) Kwarto","3 Rim","Rp57.000","Rp171.000","","","","Rp171.000","","","","","","","","","Rp0","Rp171.000"],["5.1.02.01.001.00026","Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Cetak","","","","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp113.850","Rp0","Rp0","Rp113.850"],["","[ # ] Layanan SI KELING","","","","","","","","","","","","","","","","",""],["","[ - ] BPTTG","","","","","","","","","","","","","","","","",""],["","Penggandaan HVS 70 gram","231 Lembar","Rp350","Rp80.850","","","","","","","","","Rp80.850","","","","Rp0","Rp80.850"],["","Jilid lakban","3 Buku","Rp11.000","Rp33.000","","","","","","","","","Rp33.000","","","","Rp0","Rp33.000"],["5.1.02.01.001.00031","Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Listrik","","","","Rp0","Rp0","Rp0","Rp4.392.000","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp0","Rp4.392.000"],["","[ # ] Layanan SI KELING","","","","","","","","","","","","","","","","",""],["","[ - ] BPTTG","","","","","","","","","","","","","","","","",""],["","Kabel Listrik NYAF LMK warna Hitam (1x0,75 mm² Standar)","4 Roll","Rp292.000","Rp1.168.000","","","","Rp1.168.000","","","","","","","","","Rp0","Rp1.168.000"],["","Kabel Listrik NYY ukuran 2x1,5","90 Meter","Rp18.000","Rp1.620.000","","","","Rp1.620.000","","","","","","","","","Rp0","Rp1.620.000"],["","Steker Steker 1 Phase 220v","20 Buah","Rp39.000","Rp780.000","","","","Rp780.000","","","","","","","","","Rp0","Rp780.000"],["","isolasi bakar 4 mm","20 Meter","Rp4.700","Rp94.000","","","","Rp94.000","","","","","","","","","Rp0","Rp94.000"],["","Saklar On/Off Saklar Switch On/Off dengan Lampu","19 Buah","Rp10.000","Rp190.000","","","","Rp190.000","","","","","","","","","Rp0","Rp190.000"],["","Roll Kabel Outdoor Roll Kabel 25M, 4 Colokan Stop Kontak, Rangka Besi","1 Buah","Rp540.000","Rp540.000","","","","Rp540.000","","","","","","","","","Rp0","Rp540.000"],["","Jumlah","","","","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!","#REF!"]];


function renderLegacyStockPage() {
            const stock = getStockRecords();
            const isLoading = Boolean(window.__STOCK_LOADING__);
            const safe = stock.filter(item => item.status === 'AMAN').length;
            const low = stock.filter(item => item.status === 'MENIPIS').length;
            const empty = stock.filter(item => item.status === 'HABIS').length;
            const rows = stock.map(item => `
                <tr>
                    <td>${escapeHtml(item.code || '-')}</td>
                    <td>${escapeHtml(item.name || '-')}</td>
                    <td>${escapeHtml(item.category || '-')}</td>
                    <td>${escapeHtml(item.merk || '-')}</td>
                    <td>${escapeHtml(item.satuan || '-')}</td>
                    <td>${Number(item.stokAwal || 0)}</td>
                    <td>${Number(item.masuk || 0)}</td>
                    <td>${Number(item.keluar || 0)}</td>
                    <td><strong>${Number(item.stokSaatIni || 0)}</strong></td>
                    <td>${Number(item.minimum || 0)}</td>
                    <td><span class="status-badge ${item.status === 'AMAN' ? 'done' : item.status === 'MENIPIS' ? 'waiting-part' : 'cancelled'}">${escapeHtml(item.status || '-')}</span></td>
                </tr>
            `).join('');
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <div>
                            <h3>Stock Flow / Persediaan SIKELING</h3>
                            <p class="section-sub-text" style="margin:5px 0 0;">Tampilan hanya-baca. Tambah, edit, dan transaksi stok dilakukan di Google Spreadsheet; web akan mengikuti data terbaru secara otomatis.</p>
                        </div>
                        <span class="admin-user-chip" aria-live="polite">${isLoading ? 'Memuat data…' : 'Tersinkron dari Spreadsheet'}</span>
                    </div>
                    <div class="admin-stat-grid-8" style="margin:16px 0;">
                        <div class="admin-stat-mini"><span class="label">Total Item</span><span class="value">${stock.length}</span></div>
                        <div class="admin-stat-mini"><span class="label">Aman</span><span class="value">${safe}</span></div>
                        <div class="admin-stat-mini"><span class="label">Menipis</span><span class="value">${low}</span></div>
                        <div class="admin-stat-mini"><span class="label">Habis</span><span class="value">${empty}</span></div>
                    </div>
                    <div class="admin-table-wrap">
                        <table class="admin-table">
                            <thead><tr><th>Kode</th><th>Nama Barang</th><th>Kategori</th><th>Merek</th><th>Satuan</th><th>Stok Awal</th><th>Masuk</th><th>Keluar</th><th>Stok Saat Ini</th><th>Minimum</th><th>Status</th></tr></thead>
                            <tbody>${rows || `<tr><td colspan="11"><div class="admin-empty-state">${isLoading ? 'Memuat daftar stok dari Spreadsheet…' : 'Belum ada data stok dari Spreadsheet.'}</div></td></tr>`}</tbody>
                        </table>
                    </div>
                </div>
            `;
            const legacyStock = getStockRecords();
            const inventoryRows = legacyStock.map(item => `
                <tr>
                    <td>${escapeHtml(item.code)}</td>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.category || 'Umum')}</td>
                    <td>${escapeHtml(item.merk || '-')}</td>
                    <td>${escapeHtml(item.satuan || 'pcs')}</td>
                    <td>${Number(item.stokAwal || 0)}</td>
                    <td>${Number(item.masuk || 0)}</td>
                    <td>${Number(item.keluar || 0)}</td>
                    <td>${Number(item.stokSaatIni || 0)}</td>
                    <td>${Number(item.minimum || 0)}</td>
                    <td><span class="status-badge ${item.status === 'AMAN' ? 'done' : item.status === 'MENIPIS' ? 'waiting-part' : 'cancelled'}">${escapeHtml(item.status)}</span></td>
                    <td>
                        <div class="admin-action-stack">
                            <button class="btn-secondary small" type="button" data-stock-action="detail" data-stock-code="${escapeHtml(item.code)}">Detail</button>
                            <button class="save-status-btn" type="button" data-stock-action="in" data-stock-code="${escapeHtml(item.code)}">Stock In</button>
                        </div>
                    </td>
                </tr>
            `).join('');
            const bonTotalRows = SIKELING_BON_TOTAL_ROWS.map(row => {
                const isGroup = row[0] === '' && (/^\[ # \]/.test(row[1] || '') || /^\[ - \]/.test(row[1] || ''));
                const isTotal = (row[1] || '') === 'Jumlah';
                const cells = row.map(value => {
                    const safe = escapeHtml(value || '');
                    return `<td>${safe === '' ? '&nbsp;' : safe}</td>`;
                }).join('');
                return `<tr class="${isGroup ? 'bon-total-group-row' : ''}${isTotal ? ' bon-total-summary-row' : ''}">${cells}</tr>`;
            }).join('');
            const bonTotal1Rows = SIKELING_BON_TOTAL_1_ROWS.map(row => {
                const isTotal = (row[1] || '') === 'Jumlah';
                const cells = row.map(value => {
                    const safe = escapeHtml(value || '');
                    return `<td>${safe === '' ? '&nbsp;' : safe}</td>`;
                }).join('');
                return `<tr class="${isTotal ? ' bon-total-summary-row' : ''}">${cells}</tr>`;
            }).join('');
            const historyRows = SIKELING_SUDAH_KELUAR_APP_ROWS.map(row => {
                const isTotal = (row[1] || '') === 'Jumlah';
                return `<tr class="${isTotal ? 'bon-total-summary-row' : ''}">${row.map(value => {
                    const safe = escapeHtml(value || '');
                    return `<td>${safe === '' ? '&nbsp;' : safe}</td>`;
                }).join('')}</tr>`;
            }).join('');
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>Stock Flow / Persediaan SIKELING</h3>
                        <button class="btn-primary" type="button" data-stock-action="add">+ Tambah Barang</button>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0;">
                        <button class="btn-secondary stock-source-tab active" type="button" data-stock-tab="bon-total">Bon Total</button>
                        <button class="btn-secondary stock-source-tab" type="button" data-stock-tab="bon-total-1">Bon Total (2)</button>
                        <button class="btn-secondary stock-source-tab" type="button" data-stock-tab="keluar">Sudah Keluar APP</button>
                    </div>
                    <div class="admin-table-wrap stock-source-panel bon-total-panel" data-stock-panel="bon-total" style="margin-top:16px;">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
                            <div>
                                <strong style="font-size:16px;color:#0f172a;">Rincian Anggaran Belanja Langsung (APBD)</strong>
                                <div style="font-size:13px;color:#64748b;margin-top:3px;">Sub Kegiatan Implementasi Budaya Pemerintahan · Tahun Anggaran 2026 · Layanan SI KELING</div>
                            </div>
                        </div>
                        <div class="bon-total-table-scroll">
                            <table class="admin-table bon-total-table">
                                <thead><tr><th>Kode Rekening</th><th>Uraian</th><th>Koefisien</th><th>Harga @</th><th>Harga Tot</th><th>JANUARI</th><th>FEBRUARI</th><th>MARET</th><th>APRIL</th><th>MEI</th><th>JUNI</th><th>JULI</th><th>AGUSTUS</th><th>SEPTEMBER</th><th>OKTOBER</th><th>NOVEMBER</th><th>DESEMBER</th><th>Tunai</th><th>Non Tunai</th></tr></thead>
                                <tbody>${bonTotalRows}</tbody>
                            </table>
                        </div>
                    </div>
                    <div class="admin-table-wrap stock-source-panel" data-stock-panel="bon-total-1" style="display:none;margin-top:16px;">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
                            <div>
                                <strong style="font-size:16px;color:#0f172a;">Bon Total 1</strong>
                                <div style="font-size:13px;color:#64748b;margin-top:3px;">Rincian Persediaan SIKELING per 1 September 2026</div>
                            </div>
                        </div>
                        <div class="bon-total-table-scroll">
                            <table class="admin-table bon-total-table bon-total-1-table">
                                <thead><tr><th>Kode Rekening</th><th>Uraian</th><th>Koef</th><th>Satuan</th><th>Jumlah per 1 September</th></tr></thead>
                                <tbody>${bonTotal1Rows}</tbody>
                            </table>
                        </div>
                    </div>
                    <div class="admin-table-wrap stock-source-panel" data-stock-panel="keluar" style="display:none;margin-top:16px;">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
                            <div>
                                <strong style="font-size:16px;color:#0f172a;">PERSEDIAAN SIKELING 2026 SUDAH KELUAR APLIKASI</strong>
                                <div style="font-size:13px;color:#64748b;margin-top:3px;">Daftar barang yang sudah keluar aplikasi</div>
                            </div>
                        </div>
                        <div class="bon-total-table-scroll">
                            <table class="admin-table bon-total-table bon-total-1-table">
                                <thead><tr><th>Kode Rekening</th><th>Uraian</th><th>Koef</th><th>Satuan</th></tr></thead>
                                <tbody>${historyRows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }
const STOCK_SHEET_ID = '1gbF7uxYLEh_KlA2VE8Evfn51KCQnk6HTxrxVc6AjfMA';
const STOCK_SHEETS = [
    { key: 'bon-total', label: 'Bon Total', gid: '568228051' },
    { key: 'bon-total-1', label: 'Bon Total (2)', gid: '1912766031' },
    { key: 'keluar', label: 'Sudah Keluar APP', gid: '1784317408' }
];


function parseStockSheetCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (character === '"') {
            if (inQuotes && text[index + 1] === '"') {
                cell += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (character === ',' && !inQuotes) {
            row.push(cell.trim());
            cell = '';
        } else if ((character === '\n' || character === '\r') && !inQuotes) {
            if (character === '\r' && text[index + 1] === '\n') index += 1;
            row.push(cell.trim());
            if (row.some(value => value !== '')) rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += character;
        }
    }
    if (cell || row.length) {
        row.push(cell.trim());
        if (row.some(value => value !== '')) rows.push(row);
    }
    const normalized = value => String(value || '').trim().toLowerCase();
    const headerIndex = rows.findIndex(cells => {
        const values = cells.map(normalized);
        const hasUraian = values.some(value => /uraian|nama barang|barang|item/.test(value));
        const hasQuantity = values.some(value => /koef|koefisien|jumlah|qty|kuantitas|satuan|volume/.test(value));
        const hasCode = values.some(value => /kode rekening|kode|rekening/.test(value));
        return hasUraian && hasQuantity && (hasCode || values.length >= 3);
    });
    if (headerIndex < 0) throw new Error('Header kolom spreadsheet tidak ditemukan.');
    const headers = rows[headerIndex].map((value, index) => String(value || '').trim() || `Kolom ${index + 1}`);
    return {
        headers,
        rows: rows.slice(headerIndex + 1).filter(cells => cells.some(value => String(value || '').trim() !== ''))
    };
}


function parseServiceSpreadsheetCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (character === '"') {
            if (inQuotes && text[index + 1] === '"') {
                cell += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (character === ',' && !inQuotes) {
            row.push(cell.trim());
            cell = '';
        } else if ((character === '\n' || character === '\r') && !inQuotes) {
            if (character === '\r' && text[index + 1] === '\n') index += 1;
            row.push(cell.trim());
            if (row.some(value => value !== '')) rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += character;
        }
    }
    if (cell || row.length) {
        row.push(cell.trim());
        if (row.some(value => value !== '')) rows.push(row);
    }
    const headerIndex = rows.findIndex(cells =>
        cells.some(value => /timestamp/i.test(value)) &&
        cells.some(value => /nama/i.test(value)) &&
        cells.some(value => /whatsapp/i.test(value)) &&
        cells.some(value => /google maps/i.test(value))
    );
    if (headerIndex < 0) throw new Error('Kolom nama, WhatsApp, dan Google Maps tidak ditemukan di Spreadsheet servis.');
    const headers = rows[headerIndex].map(value => value.toLowerCase().trim());
    const findColumn = expression => headers.findIndex(value => expression.test(value));
    const timestampIndex = findColumn(/^timestamp$/i);
    const nameIndex = findColumn(/^nama$/i);
    const phoneIndex = findColumn(/whatsapp/i);
    const mapsIndex = findColumn(/google maps/i);
    return rows.slice(headerIndex + 1)
        .filter(cells => cells.some(value => value !== ''))
        .map(cells => ({
            timestamp: cells[timestampIndex] || '',
            name: String(cells[nameIndex] || '').trim().toLowerCase().replace(/\s+/g, ' '),
            phone: normalizeCustomerPhone(cells[phoneIndex] || ''),
            maps: String(cells[mapsIndex] || '').trim()
        }))
        .filter(row => row.phone && row.maps && row.maps !== '-');
}


async function refreshCustomerSpreadsheetMaps(force = false) {
    const cache = window.__CUSTOMER_SPREADSHEET_CACHE__ || { updatedAt: 0 };
    if (window.__CUSTOMER_SPREADSHEET_REQUEST__) return window.__CUSTOMER_SPREADSHEET_REQUEST__;
    if (!force && Date.now() - cache.updatedAt < 60000) return window.__CUSTOMER_SPREADSHEET_MAPS__ || [];
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SERVICE_SPREADSHEET_ID}/export?format=csv&gid=${CONFIG.SERVICE_SPREADSHEET_GID}&_=${Date.now()}`;
    const request = (async () => {
        try {
            const response = await fetch(spreadsheetUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Spreadsheet servis gagal dimuat (${response.status}).`);
            const rows = parseServiceSpreadsheetCsv(await response.text());
            window.__CUSTOMER_SPREADSHEET_MAPS__ = rows;
            window.__CUSTOMER_SPREADSHEET_CACHE__ = { updatedAt: Date.now() };
            window.__CUSTOMER_SPREADSHEET_ERROR__ = '';
            return rows;
        } catch (error) {
            window.__CUSTOMER_SPREADSHEET_ERROR__ = error?.message || 'Spreadsheet servis gagal dimuat.';
            window.__CUSTOMER_SPREADSHEET_CACHE__ = { ...cache, updatedAt: Date.now() };
            console.warn('Gagal memuat data Google Maps dari Spreadsheet servis:', error);
            throw error;
        }
    })();
    window.__CUSTOMER_SPREADSHEET_REQUEST__ = request;
    try {
        return await request;
    } finally {
        if (window.__CUSTOMER_SPREADSHEET_REQUEST__ === request) {
            window.__CUSTOMER_SPREADSHEET_REQUEST__ = null;
        }
    }
}


function getEmbeddedStockSheetFallback(sheetKey) {
    const fallbackMap = {
        'bon-total': {
            headers: ['Kode Rekening', 'Uraian', 'Koefisien', 'Harga @', 'Harga Tot', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER', 'Tunai', 'Non Tunai'],
            rows: SIKELING_BON_TOTAL_ROWS
        },
        'bon-total-1': {
            headers: ['Kode Rekening', 'Uraian', 'Koef', 'Satuan', 'Jumlah per 1 September'],
            rows: SIKELING_BON_TOTAL_1_ROWS
        },
        'keluar': {
            headers: ['Kode Rekening', 'Uraian', 'Koef', 'Satuan'],
            rows: SIKELING_SUDAH_KELUAR_APP_ROWS
        }
    };
    return fallbackMap[sheetKey] || null;
}


async function refreshStockSheetsFromGoogle(force = false) {
    const current = window.__STOCK_SHEETS_CACHE__ || { sheets: {}, errors: [], updatedAt: 0 };
    if (window.__STOCK_SHEETS_REQUEST__) return window.__STOCK_SHEETS_REQUEST__;
    if (!force && Date.now() - current.updatedAt < 60000) return current;
    window.__STOCK_SHEETS_LOADING__ = true;
    window.__STOCK_SHEETS_REQUEST__ = Promise.all(STOCK_SHEETS.map(async sheet => {
        const url = `https://docs.google.com/spreadsheets/d/${STOCK_SHEET_ID}/export?format=csv&gid=${sheet.gid}&_=${Date.now()}`;
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Gagal memuat ${sheet.label} (${response.status}).`);
            const data = parseStockSheetCsv(await response.text());
            return { key: sheet.key, data, error: '' };
        } catch (error) {
            const fallback = getEmbeddedStockSheetFallback(sheet.key);
            return {
                key: sheet.key,
                data: fallback,
                error: fallback ? `${sheet.label}: memakai data cadangan karena spreadsheet tidak dapat dimuat.` : `${sheet.label}: ${error?.message || 'gagal dimuat'}`
            };
        }
    })).then(results => {
        const sheets = {};
        const errors = [];
        results.forEach(result => {
            if (result.data) sheets[result.key] = result.data;
            if (result.error) errors.push(result.error);
        });
        window.__STOCK_SHEETS_CACHE__ = { sheets, errors, updatedAt: Date.now() };
        return window.__STOCK_SHEETS_CACHE__;
    }).catch(error => {
        const fallbackSheets = {};
        STOCK_SHEETS.forEach(sheet => {
            const fallback = getEmbeddedStockSheetFallback(sheet.key);
            if (fallback) fallbackSheets[sheet.key] = fallback;
        });
        window.__STOCK_SHEETS_CACHE__ = { ...current, sheets: fallbackSheets, errors: [error?.message || 'Data stock gagal dimuat.'], updatedAt: Date.now() };
        return window.__STOCK_SHEETS_CACHE__;
    }).finally(() => {
        window.__STOCK_SHEETS_LOADING__ = false;
        window.__STOCK_SHEETS_REQUEST__ = null;
        if (window.__ADMIN_CURRENT_PAGE__ === 'stock' && checkAdminSession()) {
            showAdminPage('stock', { fromBack: true, skipStockRefresh: true });
        }
    });
    return window.__STOCK_SHEETS_REQUEST__;
}


function renderStockSheetTable(sheet, cache) {
    const data = cache.sheets[sheet.key];
    if (!data) {
        const message = window.__STOCK_SHEETS_LOADING__
            ? 'Memuat data dari Google Spreadsheet…'
            : (cache.errors.find(error => error.startsWith(`${sheet.label}:`)) || 'Data spreadsheet belum tersedia.');
        return `<div class="admin-empty-state">${escapeHtml(message)}</div>`;
    }
    const headers = data.headers.map(value => `<th>${escapeHtml(value || '-')}</th>`).join('');
    const rows = data.rows.map(cells => {
        const isGroup = cells.some(value => /^\[\s*[#-]\s*\]/.test(value));
        const isTotal = cells.some(value => value.trim().toLowerCase() === 'jumlah');
        const columns = data.headers.map((_, index) => {
            const value = cells[index] || '';
            return `<td>${value ? escapeHtml(value) : '&nbsp;'}</td>`;
        }).join('');
        return `<tr class="${isGroup ? 'bon-total-group-row' : ''}${isTotal ? ' bon-total-summary-row' : ''}">${columns}</tr>`;
    }).join('');
    return `<div class="bon-total-table-scroll"><table class="admin-table bon-total-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}


function renderStockPage() {
    const cache = window.__STOCK_SHEETS_CACHE__ || { sheets: {}, errors: [], updatedAt: 0 };
    const activeStockTab = STOCK_SHEETS.some(sheet => sheet.key === window.__ACTIVE_STOCK_TAB__)
        ? window.__ACTIVE_STOCK_TAB__
        : 'bon-total';
    window.__ACTIVE_STOCK_TAB__ = activeStockTab;
    const updated = cache.updatedAt ? new Date(cache.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    const status = window.__STOCK_SHEETS_LOADING__ ? 'Memuat spreadsheet…' : cache.errors.length ? 'Sebagian data gagal dimuat' : updated ? `Diperbarui ${updated}` : 'Menghubungkan…';
    return `
        <div class="admin-card" data-stock-flow-root>
            <div class="admin-card-header">
                <div>
                    <h3>Stock Flow / Persediaan SIKELING</h3>
                    <p class="section-sub-text" style="margin:5px 0 0;">Daftar mengikuti Google Spreadsheet. Tambah dan edit data dilakukan di spreadsheet.</p>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="admin-user-chip" aria-live="polite">${escapeHtml(status)}</span>
                    <button class="btn-secondary" type="button" data-stock-sheet-refresh ${window.__STOCK_SHEETS_LOADING__ ? 'disabled' : ''}>↻ Muat ulang</button>
                    <a class="btn-secondary" href="https://docs.google.com/spreadsheets/d/${STOCK_SHEET_ID}/edit" target="_blank" rel="noopener noreferrer">Buka Spreadsheet ↗</a>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0;">
                ${STOCK_SHEETS.map(sheet => `<button class="btn-secondary stock-source-tab ${sheet.key === activeStockTab ? 'active' : ''}" type="button" data-stock-tab="${sheet.key}" aria-selected="${sheet.key === activeStockTab ? 'true' : 'false'}">${escapeHtml(sheet.label)}</button>`).join('')}
            </div>
            ${(() => {
                const activeSheet = STOCK_SHEETS.find(sheet => sheet.key === activeStockTab) || STOCK_SHEETS[0];
                return `
                    <section class="admin-table-wrap stock-source-panel ${activeSheet.key === 'bon-total' ? 'bon-total-panel' : ''}" data-stock-panel="${activeSheet.key}" style="margin-top:16px;">
                        ${renderStockSheetTable(activeSheet, cache)}
                    </section>
                `;
            })()}
        </div>
    `;
}


function getCustomerServiceRevenue(item) {
            const normalizedCost = normalizeServiceCost(item);
            if (normalizedCost.nominal !== null) return normalizedCost.nominal;
            const value = item.biaya ?? item.BIAYA ?? item.biaya_nominal ?? item.BIAYA_NOMINAL ?? item.total_biaya ?? item.TOTAL_BIAYA ?? '';
            if (/gratis/i.test(String(value))) return 0;
            const amount = Number(String(value).replace(/[^0-9]/g, ''));
            return Number.isFinite(amount) ? amount : 0;
        }


function getReportStatus(item) {
            const raw = String(item.status ?? item.STATUS ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
            if (['selesai', 'siap diambil', 'sudah diambil'].includes(raw)) return 'Selesai';
            if (['baru', 'new', 'servis baru', 'servis masuk', 'baru masuk'].includes(raw)) return 'Baru';
            return 'Sedang Diproses';
        }


function getReportFilters() {
            return window.__REPORT_FILTERS__ || (window.__REPORT_FILTERS__ = { period: 'all', from: '', to: '', technician: 'all', status: 'all', keyword: '' });
        }


function getReportFilteredRecords() {
            const filters = getReportFilters();
            const all = loadServiceRecords();
            if (filters.period === 'custom' && filters.from && filters.to && filters.from > filters.to) return [];
            return applyPeriodFilter(all, filters.period, 'created_at', filters.from, filters.to).filter(item => {
                const fields = getServiceFormFields(item);
                const status = getReportStatus(item);
                const technician = String(fields.teknisi && fields.teknisi !== '-' ? fields.teknisi : item.technician || 'Belum ada').trim();
                const haystack = [item.id, fields.nama, item.customer_name, fields.whatsapp, item.phone].join(' ').toLowerCase();
                return (filters.status === 'all' || filters.status === status)
                    && (filters.technician === 'all' || filters.technician.toLowerCase() === technician.toLowerCase())
                    && (!filters.keyword || haystack.includes(filters.keyword.trim().toLowerCase()));
            }).sort((a, b) => (Date.parse(b.created_at || b.tanggal_masuk || '') || 0) - (Date.parse(a.created_at || a.tanggal_masuk || '') || 0));
        }


function getReportCostLabel(item) {
            const normalized = normalizeServiceCost(item);
            if (normalized.nominal !== null) return normalized.label;
            const raw = item.biaya ?? item.BIAYA ?? item.biaya_nominal ?? item.BIAYA_NOMINAL;
            if (raw === undefined || raw === null || String(raw).trim() === '' || /belum|belum ditentukan/i.test(String(raw))) return '-';
            if (/gratis/i.test(String(raw))) return 'Gratis';
            const amount = Number(String(raw).replace(/[^0-9]/g, ''));
            return Number.isFinite(amount) ? formatRupiah(amount) : '-';
        }


function exportFilteredReportCsv(records) {
            const headers = ['Tanggal', 'ID Servis', 'Customer', 'No. WhatsApp', 'Barang', 'Keluhan', 'Teknisi', 'Status', 'Biaya'];
            const rows = records.map(item => {
                const fields = getServiceFormFields(item);
                return [fields.tanggal && fields.tanggal !== '-' ? fields.tanggal : item.created_at || item.tanggal_masuk || '', item.id || '', fields.nama && fields.nama !== '-' ? fields.nama : item.customer_name || '', fields.whatsapp && fields.whatsapp !== '-' ? fields.whatsapp : item.phone || '', fields.barang && fields.barang !== '-' ? fields.barang : item.item_name || '', fields.keluhan || item.keluhan || '', fields.teknisi && fields.teknisi !== '-' ? fields.teknisi : item.technician || 'Belum ada', getReportStatus(item), getReportCostLabel(item)];
            });
            const csvRows = [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
            const blob = new Blob(['\ufeff', csvRows], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'laporan-servis.csv';
            link.click();
            URL.revokeObjectURL(link.href);
            showToast('File laporan CSV berhasil diunduh.', 'success');
        }


function openReportServiceDetail(serviceId) {
            const item = loadServiceRecords().find(record => String(record.id) === String(serviceId));
            if (!item) { showToast('Data servis tidak ditemukan.', 'error'); return; }
            const fields = getServiceFormFields(item);
            const maps = safeExternalUrl(fields.google_maps || item.google_maps || item.maps || '');
            let modal = document.getElementById('adminCustomerProfileModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'adminCustomerProfileModal';
                modal.className = 'admin-customer-profile-modal';
                modal.innerHTML = '<section class="admin-customer-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="adminCustomerProfileTitle"><header><div><h2 id="adminCustomerProfileTitle">Detail Servis</h2><p class="admin-customer-profile-subtitle"></p></div><button type="button" class="admin-customer-profile-close" aria-label="Tutup" data-customer-profile-close>×</button></header><div class="admin-customer-profile-body"></div></section>';
                document.body.appendChild(modal);
                modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-customer-profile-close]')) modal.classList.remove('open'); });
                document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.isConnected) modal.classList.remove('open'); });
            }
            modal.querySelector('#adminCustomerProfileTitle').textContent = fields.nama && fields.nama !== '-' ? fields.nama : (item.customer_name || 'Detail Servis');
            modal.querySelector('.admin-customer-profile-subtitle').textContent = `${item.id || '-'} · ${fields.whatsapp && fields.whatsapp !== '-' ? fields.whatsapp : item.phone || '-'}`;
            modal.querySelector('.admin-customer-profile-body').innerHTML = `<article class="admin-customer-history-card"><div class="admin-customer-history-heading"><div><strong>${escapeHtml(item.id || '-')}</strong><span>${escapeHtml(formatDate(fields.tanggal && fields.tanggal !== '-' ? fields.tanggal : item.created_at || item.tanggal_masuk))}</span></div><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getReportStatus(item))}</span></div><div class="admin-customer-history-grid"><div><small>No. WhatsApp</small><strong>${escapeHtml(fields.whatsapp || item.phone || '-')}</strong></div><div><small>Barang</small><strong>${escapeHtml(fields.barang || item.item_name || '-')}</strong></div><div><small>Keluhan</small><strong>${escapeHtml(fields.keluhan || item.keluhan || '-')}</strong></div><div><small>Alamat</small><strong>${escapeHtml(fields.alamat || item.alamat || '-')}</strong></div><div><small>Teknisi</small><strong>${escapeHtml(fields.teknisi && fields.teknisi !== '-' ? fields.teknisi : item.technician || 'Belum ada')}</strong></div><div><small>Biaya</small><strong>${escapeHtml(getReportCostLabel(item))}</strong></div><div><small>Google Maps</small><span>${maps ? `<a class="admin-customer-map-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Buka Maps</a>` : '<span class="admin-customer-muted">-</span>'}</span></div><div><small>Media Customer</small><span>${fields.media_customer.length ? `<button type="button" class="btn-secondary small" data-tech-customer-media="${escapeHtml(item.id || '')}">Lihat Media</button>` : '<span class="admin-customer-muted">Belum Ada</span>'}</span></div><div><small>Update Terakhir</small><strong>${escapeHtml(formatDateTimeValue(item.timestamp_update || item.updated_at || item.created_at || ''))}</strong></div></div></article>`;
            modal.classList.add('open');
        }


function getReportDateParts(item) {
            const date = parseDateValue(item.created_at || item.tanggal_masuk || item.timestamp || '');
            if (!date) return null;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return { date, key };
        }


function getReportVolumeBuckets(records, filters) {
            if (!records.length) return [];
            const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            const buckets = [];
            const addDays = (date, days) => { const result = new Date(date); result.setDate(result.getDate() + days); return result; };
            const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const countBy = new Map();
            if (filters.period === 'today') {
                for (let hour = 0; hour < 24; hour++) buckets.push({ key: `${dateKey(now)}-${String(hour).padStart(2, '0')}`, label: `${String(hour).padStart(2, '0')}.00` });
                records.forEach(item => { const date = getReportDateParts(item)?.date; if (date && dateKey(date) === dateKey(now)) { const key = `${dateKey(date)}-${String(date.getHours()).padStart(2, '0')}`; countBy.set(key, (countBy.get(key) || 0) + 1); } });
            } else if (filters.period === 'this_week') {
                const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); start.setHours(0, 0, 0, 0);
                for (let day = 0; day < 7; day++) { const date = addDays(start, day); buckets.push({ key: dateKey(date), label: date.toLocaleDateString('id-ID', { weekday: 'short' }) }); }
                records.forEach(item => { const date = getReportDateParts(item)?.date; if (date) countBy.set(dateKey(date), (countBy.get(dateKey(date)) || 0) + 1); });
            } else if (filters.period === '1_month' || (filters.period === 'custom' && filters.from && filters.to && (new Date(filters.to) - new Date(filters.from)) / 86400000 <= 35)) {
                let start = filters.period === 'custom' && filters.from ? new Date(`${filters.from}T00:00:00`) : new Date(now);
                if (filters.period !== 'custom') {
                    const targetMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1);
                    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
                    start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(start.getDate(), lastDay));
                    start.setHours(0, 0, 0, 0);
                }
                else start.setHours(0, 0, 0, 0);
                let end = filters.period === 'custom' && filters.to ? new Date(`${filters.to}T23:59:59`) : now;
                const count = Math.max(1, Math.ceil((end - start + 1) / (7 * 86400000)));
                for (let week = 0; week < count; week++) {
                    const fromDate = addDays(start, week * 7), toDate = new Date(Math.min(end.getTime(), addDays(fromDate, 7).getTime() - 1));
                    const label = filters.period === '1_month' ? `Minggu ${week + 1}` : `Minggu ${week + 1} · ${fromDate.getDate()}–${toDate.getDate()}`;
                    buckets.push({ key: `week-${week}`, label, from: fromDate.getTime(), to: toDate.getTime() });
                }
                records.forEach(item => { const date = getReportDateParts(item)?.date; if (date) { const index = Math.floor((date - start) / (7 * 86400000)); const key = `week-${index}`; countBy.set(key, (countBy.get(key) || 0) + 1); } });
            } else {
                records.forEach(item => {
                    const date = getReportDateParts(item)?.date;
                    if (!date) return;
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    countBy.set(key, (countBy.get(key) || 0) + 1);
                });
                [...countBy.keys()].sort().forEach(key => {
                    const [year, month] = key.split('-').map(Number);
                    buckets.push({ key, label: new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) });
                });
            }
            return buckets.map(bucket => ({ ...bucket, count: countBy.get(bucket.key) || 0 }));
        }


function renderReportsPage() {
            const filters = getReportFilters();
            const allRecords = loadServiceRecords();
            const records = getReportFilteredRecords();
            const statuses = [...new Set(allRecords.map(getReportStatus))];
            const technicians = [...new Set(allRecords.map(item => { const field = getServiceFormFields(item).teknisi; return String(field && field !== '-' ? field : item.technician || 'Belum ada').trim(); }).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
            const hasTechnicianAssignments = technicians.some(name => !/^(belum ada|-|belum ditentukan)$/i.test(name));
            const hasNewStatus = statuses.includes('Baru');
            const done = records.filter(item => getReportStatus(item) === 'Selesai').length;
            const newlyReceived = records.filter(item => getReportStatus(item) === 'Baru').length;
            const active = records.filter(item => getReportStatus(item) !== 'Selesai').length;
            const inProgress = records.filter(item => getReportStatus(item) === 'Sedang Diproses').length;
            const totalCost = records.reduce((sum, item) => sum + getCustomerServiceRevenue(item), 0);
            const invalidRange = filters.period === 'custom' && filters.from && filters.to && filters.from > filters.to;
            const volume = getReportVolumeBuckets(records, filters);
            const maxVolume = Math.max(1, ...volume.map(item => item.count));
            const statusCounts = [...new Set(records.map(getReportStatus))].map(status => ({ label: status, count: records.filter(item => getReportStatus(item) === status).length }));
            const technicianCounts = [...new Set(records.map(item => { const f = getServiceFormFields(item).teknisi; return String(f && f !== '-' ? f : item.technician || 'Belum ada').trim(); }))].map(name => ({ label: name, count: records.filter(item => { const f = getServiceFormFields(item).teknisi; return String(f && f !== '-' ? f : item.technician || 'Belum ada').trim() === name; }).length })).sort((a, b) => b.count - a.count);
            const itemGroups = new Map();
            records.forEach(item => {
                const fields = getServiceFormFields(item);
                const label = String(fields.barang && fields.barang !== '-' ? fields.barang : item.item_name || 'Barang belum diisi').trim() || 'Barang belum diisi';
                const key = label.toLocaleLowerCase('id');
                const current = itemGroups.get(key) || { label, count: 0 };
                current.count += 1;
                itemGroups.set(key, current);
            });
            const itemCounts = [...itemGroups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'id'));
            const displayedItems = itemCounts.length > 6 ? [...itemCounts.slice(0, 5), { label: 'Lainnya', count: itemCounts.slice(5).reduce((sum, item) => sum + item.count, 0) }] : itemCounts;
            const assignedTechnicianCounts = technicianCounts.filter(item => !/^(belum ada|-|belum ditentukan)$/i.test(item.label));
            const maxStatus = Math.max(1, ...statusCounts.map(item => item.count));
            const maxTechnician = Math.max(1, ...assignedTechnicianCounts.map(item => item.count));
            const maxItem = Math.max(1, ...displayedItems.map(item => item.count));
            const reportFilters = `<div class="admin-report-filters"><label class="admin-report-filter"><span>Periode</span><select id="reportPeriod"><option value="today" ${filters.period === 'today' ? 'selected' : ''}>Hari Ini</option><option value="this_week" ${filters.period === 'this_week' ? 'selected' : ''}>1 Minggu</option><option value="1_month" ${filters.period === '1_month' ? 'selected' : ''}>1 Bulan</option><option value="6_month" ${filters.period === '6_month' ? 'selected' : ''}>6 Bulan</option><option value="1_year" ${filters.period === '1_year' ? 'selected' : ''}>1 Tahun</option><option value="all" ${filters.period === 'all' ? 'selected' : ''}>Semua</option><option value="custom" ${filters.period === 'custom' ? 'selected' : ''}>Custom</option></select></label>${filters.period === 'custom' ? `<label class="admin-report-filter"><span>Dari</span><input type="date" id="reportDateFrom" value="${escapeHtml(filters.from)}"></label><label class="admin-report-filter"><span>Sampai</span><input type="date" id="reportDateTo" value="${escapeHtml(filters.to)}"></label>` : ''}<label class="admin-report-filter"><span>Teknisi</span><select id="reportTechnician"><option value="all">Semua Teknisi</option>${technicians.map(name => `<option value="${escapeHtml(name)}" ${filters.technician === name ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label><label class="admin-report-filter"><span>Status</span><select id="reportStatus"><option value="all">Semua Status</option>${statuses.map(status => `<option value="${escapeHtml(status)}" ${filters.status === status ? 'selected' : ''}>${escapeHtml(status)}</option>`).join('')}</select></label><label class="admin-report-filter admin-report-search"><span>Cari servis</span><input type="search" id="reportSearch" placeholder="ID servis atau customer" value="${escapeHtml(filters.keyword)}"></label></div>`;
            const summaryCards = `<div class="admin-report-summary-grid"><div class="admin-stat-mini"><span class="label">Total Servis</span><span class="value">${records.length}</span></div>${hasNewStatus ? `<div class="admin-stat-mini"><span class="label">Servis Baru</span><span class="value">${newlyReceived}</span></div><div class="admin-stat-mini"><span class="label">Sedang Diproses</span><span class="value">${inProgress}</span></div>` : `<div class="admin-stat-mini"><span class="label">Servis Aktif</span><span class="value">${active}</span></div>`}<div class="admin-stat-mini"><span class="label">Selesai</span><span class="value">${done}</span></div><div class="admin-stat-mini admin-report-cost-card"><span class="label">Total Biaya Tercatat</span><span class="value">${escapeHtml(formatRupiah(totalCost))}</span></div></div>`;
            const volumeChart = volume.length ? `<div class="admin-report-volume-scroll"><div class="admin-report-volume-chart">${volume.map(item => `<div class="admin-report-volume-item" title="${escapeHtml(item.label)}: ${item.count} servis"><strong>${item.count}</strong><div class="admin-report-volume-bar"><i style="height:${Math.max(item.count ? 8 : 2, Math.round(item.count / maxVolume * 100))}%"></i></div><span>${escapeHtml(item.label)}</span></div>`).join('')}</div></div>` : '<div class="admin-report-empty-chart">Belum ada data servis pada filter ini.</div>';
            const distributionChart = statusCounts.length ? statusCounts.map(item => { const statusClass = item.label === 'Selesai' ? 'is-done' : item.label === 'Baru' ? 'is-new' : item.label === 'Sedang Diproses' ? 'is-progress' : 'is-other'; return `<div class="admin-report-meter-row"><span>${escapeHtml(item.label)}</span><div class="admin-report-meter"><i class="${statusClass}" style="width:${item.count / maxStatus * 100}%"></i></div><strong>${item.count}</strong></div>`; }).join('') : '<div class="admin-report-empty-chart">Belum ada data status.</div>';
            const technicianChart = hasTechnicianAssignments && assignedTechnicianCounts.length ? assignedTechnicianCounts.map(item => `<div class="admin-report-meter-row"><span>${escapeHtml(item.label)}</span><div class="admin-report-meter admin-report-tech-meter"><i style="width:${item.count / maxTechnician * 100}%"></i></div><strong>${item.count}</strong></div>`).join('') : '<div class="admin-report-empty-chart">Data penugasan teknisi belum tersedia pada filter ini.</div>';
            const itemChart = displayedItems.length ? displayedItems.map(item => `<div class="admin-report-meter-row"><span>${escapeHtml(item.label)}</span><div class="admin-report-meter admin-report-item-meter"><i style="width:${item.count / maxItem * 100}%"></i></div><strong>${item.count}</strong></div>`).join('') : '<div class="admin-report-empty-chart">Belum ada data jenis barang.</div>';
            const tableRows = records.map(item => {
                const fields = getServiceFormFields(item);
                const date = fields.tanggal && fields.tanggal !== '-' ? fields.tanggal : item.created_at || item.tanggal_masuk;
                const technician = fields.teknisi && fields.teknisi !== '-' ? fields.teknisi : item.technician || 'Belum ada';
                return `<tr><td>${escapeHtml(formatDate(date))}</td><td class="id-cell">${escapeHtml(item.id || '-')}</td><td>${escapeHtml(fields.nama && fields.nama !== '-' ? fields.nama : item.customer_name || '-')}</td><td>${escapeHtml(fields.barang && fields.barang !== '-' ? fields.barang : item.item_name || '-')}</td><td>${escapeHtml(technician)}</td><td><span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getReportStatus(item))}</span></td><td>${escapeHtml(getReportCostLabel(item))}</td><td><button class="btn-secondary small" type="button" data-report-service-detail="${escapeHtml(item.id || '')}">Detail</button></td></tr>`;
            }).join('');
            return `<div class="admin-card admin-report-page"><div class="admin-card-header admin-report-header"><div><h3>Laporan Operasional</h3><p class="section-sub-text">Ringkasan dan rincian servis berdasarkan filter yang dipilih.</p></div><button class="btn-primary" type="button" data-export-csv="true">Export CSV</button></div>${reportFilters}${invalidRange ? '<div class="admin-empty-state admin-report-error">Tanggal Dari tidak boleh melewati tanggal Sampai.</div>' : ''}${summaryCards}<div class="admin-report-charts"><section class="admin-report-chart-card admin-report-volume-card"><div class="admin-report-chart-heading"><h4>Volume Servis</h4><span>Jumlah servis sesuai periode</span></div>${volumeChart}</section><section class="admin-report-chart-card admin-report-status-card"><div class="admin-report-chart-heading"><h4>Distribusi Status</h4><span>Status servis aktual</span></div><div class="admin-report-meter-list">${distributionChart}</div></section><section class="admin-report-chart-card admin-report-technician-card"><div class="admin-report-chart-heading"><h4>Servis per Teknisi</h4><span>Jumlah servis sesuai filter</span></div><div class="admin-report-meter-list">${technicianChart}</div></section><section class="admin-report-chart-card admin-report-item-card"><div class="admin-report-chart-heading"><h4>Servis per Jenis Barang</h4><span>Jumlah servis sesuai filter</span></div><div class="admin-report-meter-list">${itemChart}</div></section></div><section class="admin-report-details"><div class="admin-report-details-heading"><div><h4>Rincian Servis</h4><span>${records.length} servis ditemukan</span></div></div><div class="admin-table-wrap admin-report-table-wrap"><table class="admin-table admin-report-table"><thead><tr><th>Tanggal</th><th>ID Servis</th><th>Customer</th><th>Barang</th><th>Teknisi</th><th>Status</th><th>Biaya</th><th>Aksi</th></tr></thead><tbody>${tableRows || `<tr><td colspan="8"><div class="admin-empty-state">${filters.keyword ? 'Tidak ada servis yang cocok dengan pencarian.' : 'Tidak ada data servis untuk filter yang dipilih.'}</div></td></tr>`}</tbody></table></div></section></div>`;
        }


        function getApiStatusDescriptor(status) {
            if (status === 'connected') return { label: 'Terhubung', className: 'success', message: 'Koneksi ke Google Apps Script berhasil.' };
            if (status === 'partial') return { label: 'Sebagian Tersedia', className: 'warning', message: 'Sebagian endpoint backend masih dalam pengembangan.' };
            if (status === 'development') return { label: 'Development Mode', className: 'warning', message: 'Backend sedang dalam tahap pengembangan.' };
            if (status === 'checking') return { label: 'Memeriksa', className: 'warning', message: 'Memeriksa koneksi ke Google Apps Script...' };
            if (status === 'disconnected') return { label: 'Tidak Terhubung', className: 'danger', message: 'Tidak dapat terhubung ke Google Apps Script.' };
            return { label: 'Belum Dikonfigurasi', className: 'neutral', message: 'API Google Apps Script belum dikonfigurasi.' };
        }


        function getGoogleStatusDescriptor(status) {
            if (status === 'connected') return { label: 'Terhubung', className: 'success' };
            if (status === 'warning' || status === 'checking') return { label: 'Memeriksa', className: 'warning' };
            return { label: 'Tidak Terhubung', className: 'danger' };
        }


        function updateGoogleIntegrationStatus(service, status) {
            const statuses = window.__GOOGLE_INTEGRATION_STATUS__ || (window.__GOOGLE_INTEGRATION_STATUS__ = {});
            statuses[service] = status;
            const element = document.querySelector(`[data-google-integration="${service}"]`);
            if (!element) return;
            const descriptor = getGoogleStatusDescriptor(status);
            element.className = `settings-google-state ${descriptor.className}`;
            element.innerHTML = `<span class="settings-status-dot"></span>${descriptor.label}`;
        }


        async function refreshGoogleIntegrationStatus() {
            if (window.__GOOGLE_INTEGRATION_REQUEST__) return window.__GOOGLE_INTEGRATION_REQUEST__;
            const formUrl = CONFIG.FORM_URL || '';
            const formConfigured = !!(formUrl && formUrl !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL');
            const apiConfigured = isApiConfigured();
            updateGoogleIntegrationStatus('form', formConfigured ? 'connected' : 'disconnected');
            updateGoogleIntegrationStatus('spreadsheet', apiConfigured ? 'checking' : 'disconnected');
            const request = Promise.all([
                Promise.resolve(formConfigured ? 'connected' : 'disconnected'),
                (async () => {
                    if (!apiConfigured) return 'disconnected';
                    try {
                        await apiRequest('getServices', {});
                        return 'connected';
                    } catch (error) {
                        console.warn('Pemeriksaan koneksi Google Spreadsheet gagal:', error);
                        return 'disconnected';
                    }
                })()
            ]).then(([formStatus, spreadsheetStatus]) => {
                updateGoogleIntegrationStatus('form', formStatus);
                updateGoogleIntegrationStatus('spreadsheet', spreadsheetStatus);
                return { form: formStatus, spreadsheet: spreadsheetStatus };
            }).finally(() => {
                window.__GOOGLE_INTEGRATION_REQUEST__ = null;
            });
            window.__GOOGLE_INTEGRATION_REQUEST__ = request;
            return request;
        }


        async function copyApiUrl() {
            const value = CONFIG.API_URL || 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(value);
                } else {
                    const helper = document.createElement('textarea');
                    helper.value = value;
                    document.body.appendChild(helper);
                    helper.select();
                    document.execCommand('copy');
                    helper.remove();
                }
                showToast('API URL berhasil disalin.', 'success');
                return true;
            } catch (error) {
                console.warn('Unable to copy API URL:', error);
                showToast('API URL gagal disalin.', 'error');
                return false;
            }
        }


        async function testApiConnection() {
            const apiUrl = CONFIG.API_URL || '';
            if (!apiUrl || apiUrl === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
                window.__API_CONNECTION_STATUS__ = { status: 'unconfigured', message: 'API Google Apps Script belum dikonfigurasi.' };
                const testButton = document.querySelector('[data-test-connection]');
                if (testButton) {
                    testButton.disabled = true;
                    testButton.textContent = 'Tes Koneksi';
                }
                return window.__API_CONNECTION_STATUS__;
            }
            const testButton = document.querySelector('[data-test-connection]');
            if (testButton) {
                testButton.disabled = true;
                testButton.textContent = 'Memeriksa...';
            }
            window.__API_CONNECTION_STATUS__ = { status: 'checking', message: 'Memeriksa koneksi ke Google Apps Script...' };
            try {
                const response = await apiRequest('healthCheck', {});
                const success = !!(response && response.success);
                const status = success ? 'connected' : 'disconnected';
                const message = success ? 'Koneksi ke Google Apps Script berhasil.' : (response && response.message) || 'Tidak dapat terhubung ke Google Apps Script.';
                window.__API_CONNECTION_STATUS__ = { status, message };
                if (testButton) {
                    testButton.disabled = false;
                    testButton.textContent = 'Tes Koneksi';
                }
                showToast(success ? 'Tes koneksi berhasil.' : 'Tes koneksi gagal.', success ? 'success' : 'error');
                return window.__API_CONNECTION_STATUS__;
            } catch (error) {
                window.__API_CONNECTION_STATUS__ = { status: 'disconnected', message: 'Tidak dapat terhubung ke Google Apps Script.' };
                if (testButton) {
                    testButton.disabled = false;
                    testButton.textContent = 'Tes Koneksi';
                }
                showToast('Tes koneksi gagal.', 'error');
                return window.__API_CONNECTION_STATUS__;
            }
        }


        function renderSettingsPage() {
            const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.adminSession) || '{}');
            const apiUrl = CONFIG.API_URL || 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
            const apiStatus = window.__API_CONNECTION_STATUS__ || getApiStatusDescriptor(
                (!CONFIG.API_URL || CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') ? 'unconfigured' : 'checking'
            );
            const apiDisplayStatus = typeof apiStatus === 'string' ? getApiStatusDescriptor(apiStatus) : apiStatus;
            const apiConfigured = !!(CONFIG.API_URL && CONFIG.API_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL');
            const formConfigured = !!(CONFIG.FORM_URL && CONFIG.FORM_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL');
            const integrationStatus = window.__GOOGLE_INTEGRATION_STATUS__ || {};
            const formState = integrationStatus.form || (formConfigured ? 'checking' : 'disconnected');
            const sheetState = integrationStatus.spreadsheet || (apiConfigured ? 'checking' : 'disconnected');
            const formStatus = getGoogleStatusDescriptor(formState);
            const sheetStatus = getGoogleStatusDescriptor(sheetState);
            return `
                <div class="settings-page">
                    <section class="settings-card">
                        <div class="settings-card-header">
                            <div class="settings-card-title-wrap">
                                <div class="settings-card-icon">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.82-.33 1.7 1.7 0 0 0-1 1.54V20a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9.8 18.4a1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9.8 5.6a1.7 1.7 0 0 0 1-1.54V4a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 14.2 5.6a1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.38.38.94.49 1.54 1H21a2 2 0 1 1 0 4h-.09c-.6.51-1.16.62-1.54 1Z"></path></svg>
                                </div>
                                <div>
                                    <h3 class="settings-card-title">Profil Sistem</h3>
                                </div>
                            </div>
                        </div>
                        <p class="settings-card-subtitle">Informasi dasar tentang sistem aplikasi.</p>
                        <div class="settings-card-body">
                            <div class="settings-form-grid">
                                <div class="settings-field">
                                    <label>Nama Sistem</label>
                                    <input type="text" value="LERESSAE" readonly>
                                </div>
                                <div class="settings-field">
                                    <label>Instansi</label>
                                    <input type="text" value="BPTI Disperindag DIY" readonly>
                                </div>
                                <div class="settings-field" style="grid-column: 1 / -1;">
                                    <label>Timezone</label>
                                    <select aria-label="Timezone">
                                        <option selected>Asia/Jakarta</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section class="settings-card">
                        <div class="settings-card-header">
                            <div class="settings-card-title-wrap">
                                <div class="settings-card-icon">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12h8"></path><path d="M12 8v8"></path><path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"></path></svg>
                                </div>
                                <div>
                                    <h3 class="settings-card-title">Koneksi Sistem</h3>
                                </div>
                            </div>
                        </div>
                        <p class="settings-card-subtitle">Pengaturan koneksi dengan Google Apps Script.</p>
                        <div class="settings-card-body">
                            <div class="settings-field" style="margin-bottom: 14px;">
                                <label>API URL</label>
                                <div class="settings-api-row">
                                    <input class="settings-api-input" type="text" value="${escapeHtml(apiUrl)}" readonly>
                                    <button type="button" class="settings-copy-btn" data-copy-api-url="${escapeHtml(apiUrl)}">Salin</button>
                                </div>
                            </div>
                            <div class="settings-status-row">
                                <span class="settings-status-badge ${apiDisplayStatus.className}">
                                    <span class="settings-status-dot"></span>
                                    ${apiDisplayStatus.label}
                                </span>
                                <button type="button" class="settings-test-btn" data-test-connection="true" ${apiConfigured ? '' : 'disabled'}>${apiDisplayStatus.status === 'checking' ? 'Memeriksa...' : 'Tes Koneksi'}</button>
                            </div>
                            <p class="settings-status-note">${escapeHtml(apiDisplayStatus.message || 'API Google Apps Script belum dikonfigurasi.')}</p>
                        </div>
                    </section>
                    <section class="settings-card">
                        <div class="settings-card-header">
                            <div class="settings-card-title-wrap">
                                <div class="settings-card-icon">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 7V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3"></path><path d="M11 7h8"></path><path d="M11 12h8"></path><path d="M11 17h8"></path></svg>
                                </div>
                                <div>
                                    <h3 class="settings-card-title">Google Integration</h3>
                                </div>
                            </div>
                        </div>
                        <p class="settings-card-subtitle">Status integrasi dengan layanan Google.</p>
                        <div class="settings-card-body">
                            <div class="settings-integration-list">
                                <div class="settings-integration-item">
                                    <div class="settings-google-icon form">G</div>
                                    <div class="settings-google-meta">
                                        <p class="settings-google-name">Google Form</p>
                                        <p class="settings-google-sub">Formulir pendaftaran servis pelanggan.</p>
                                    </div>
                                    <div class="settings-google-state ${formStatus.className}" data-google-integration="form">
                                        <span class="settings-status-dot"></span>
                                        ${formStatus.label}
                                    </div>
                                </div>
                                <div class="settings-integration-item">
                                    <div class="settings-google-icon sheet">S</div>
                                    <div class="settings-google-meta">
                                        <p class="settings-google-name">Google Spreadsheet</p>
                                        <p class="settings-google-sub">Penyimpanan data servis dan master data. <a href="${escapeHtml(CONFIG.SERVICE_SPREADSHEET_URL)}" target="_blank" rel="noopener noreferrer">Buka Spreadsheet</a></p>
                                    </div>
                                    <div class="settings-google-state ${sheetStatus.className}" data-google-integration="spreadsheet">
                                        <span class="settings-status-dot"></span>
                                        ${sheetStatus.label}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            `;
        }


        function showAdminPage(page, options = {}) {
            if (!checkAdminSession()) {
                renderAdminLoginGate();
                return;
            }
            const pages = {
                dashboard: renderAdminDashboardPage,
                services: renderServicesPage,
                running: renderRunningServicesPage,
                completed: renderCompletedServicesPage,
                customers: renderCustomersPage,
                technicians: renderTechniciansPage,
                stock: renderStockPage,
                locations: renderLocationsPage,
                media: renderMediaPage,
                news: renderNewsPage,
                reports: renderReportsPage,
                settings: renderSettingsPage
            };
            const history = window.__LERESSAE_ADMIN_HISTORY || (window.__LERESSAE_ADMIN_HISTORY = ['dashboard']);
            if (options.resetHistory) {
                history.length = 0;
                history.push(page);
            } else if (!options.fromBack && history[history.length - 1] !== page) {
                history.push(page);
            }
            if (page === 'news' && isApiConfigured() && !options.skipNewsRefresh) {
                window.__NEWS_LOADING__ = true;
                window.__NEWS_LOAD_ERROR__ = '';
            }
            const handler = pages[page] || renderAdminDashboardPage;
            renderAdminAppShell(page, handler());
            window.__ADMIN_CURRENT_PAGE__ = page;
            saveRolePage('admin', page);
            if (['dashboard', 'services', 'running', 'completed', 'customers'].includes(page) && !options.skipCustomerSpreadsheetRefresh) {
                refreshCustomerSpreadsheetMaps().then(() => {
                    if (window.__ADMIN_CURRENT_PAGE__ === page) {
                        showAdminPage(page, { fromBack: true, skipCustomerSpreadsheetRefresh: true });
                    }
                }).catch(error => {
                    if (window.__ADMIN_CURRENT_PAGE__ === page) {
                        showToast(error?.message || 'Data Google Maps dari Spreadsheet gagal dimuat.', 'error');
                    }
                });
            }
            if (page === 'settings' && !options.skipIntegrationCheck) {
                refreshGoogleIntegrationStatus();
            }
            if (page === 'stock') {
                refreshStockSheetsFromGoogle();
                if (!options.skipStockRefresh) refreshStockInBackground();
            }
            if (page === 'news' && isApiConfigured() && !options.skipNewsRefresh) {
                apiRequest('getNews').then(response => {
                    window.__NEWS_CACHE__ = Array.isArray(response?.data) ? response.data : [];
                    window.__NEWS_LOADING__ = false;
                    window.__NEWS_LOAD_ERROR__ = '';
                    if (window.__ADMIN_CURRENT_PAGE__ === 'news') {
                        showAdminPage('news', { fromBack: true, skipNewsRefresh: true });
                    }
                }).catch(error => {
                    window.__NEWS_LOADING__ = false;
                    window.__NEWS_LOAD_ERROR__ = error?.message || 'Berita gagal dimuat dari Spreadsheet.';
                    if (window.__ADMIN_CURRENT_PAGE__ === 'news') {
                        showAdminPage('news', { fromBack: true, skipNewsRefresh: true });
                        showToast('Berita gagal dimuat dari Spreadsheet.', 'error');
                    }
                });
            }
            if (page === 'media' && isApiConfigured() && !options.skipMediaRefresh) {
                loadMediaFromApi({ stayOnAdminMedia: false }).then(function(loaded) {
                    if (
                        loaded &&
                        window.__ADMIN_CURRENT_PAGE__ === 'media' &&
                        !isMediaAdminEditing()
                    ) {
                        showAdminPage('media', { fromBack: true, skipMediaRefresh: true });
                    }
                });
            }
            if (page === 'technicians' && isApiConfigured() && !options.skipTechnicianRefresh) {
                Promise.all([refreshTechniciansFromBackend(), refreshServiceCacheFromApi()]).then(() => {
                    window.__TECHNICIAN_LOAD_ERROR__ = '';
                    if (window.__ADMIN_CURRENT_PAGE__ === 'technicians') {
                        showAdminPage('technicians', { fromBack: true, skipTechnicianRefresh: true });
                    }
                }).catch(error => {
                    if (handleTechnicianAuthError(error)) return;
                    window.__TECHNICIAN_LOAD_ERROR__ = error?.message || 'Data teknisi tidak dapat dimuat. Periksa koneksi lalu coba lagi.';
                    if (window.__ADMIN_CURRENT_PAGE__ === 'technicians') showAdminPage('technicians', { fromBack: true, skipTechnicianRefresh: true });
                    console.warn('Gagal memuat akun Teknisi dari spreadsheet:', error);
                });
            }
            const adminContent = document.querySelector('.admin-content');
            if (adminContent) {
                adminContent.querySelectorAll(':scope > .leressae-back-row').forEach(el => el.remove());
            }
        }


        function renderAdminDashboard() {
            const accessNotice = document.getElementById('adminAccessNotice');
            const dashboard = document.getElementById('adminDashboardContent');
            const loginGate = document.getElementById('adminLoginGate');
            if (!accessNotice || !dashboard || !loginGate) return;
            const loggedIn = checkAdminSession();
            accessNotice.classList.toggle('hidden', loggedIn);
            dashboard.classList.toggle('hidden', !loggedIn);
            loginGate.classList.toggle('hidden', loggedIn);
            if (!loggedIn) {
                renderAdminLoginGate();
                return;
            }
            const saved = getSavedRolePage('admin');
            const allowed = ['dashboard', 'services', 'running', 'completed', 'customers', 'technicians', 'stock', 'locations', 'media', 'news', 'reports', 'settings'];
            const targetPage = allowed.includes(saved) ? saved : 'dashboard';
            showAdminPage(targetPage, { resetHistory: true });
        }


        function computeReportTotal(records) {
            return records.reduce((sum, item) => {
                const value = Number(String(item.biaya || '0').replace(/[^0-9]/g, '')) || 0;
                return sum + value;
            }, 0).toLocaleString('id-ID');
        }


        async function handleStockTransaction() {
            const stockId = document.getElementById('stockCodeInput')?.value.trim();
            const stockName = document.getElementById('stockNameInput')?.value.trim();
            const unit = document.getElementById('stockSatuanInput')?.value.trim() || 'pcs';
            const stock = Number(document.getElementById('stockAwalInput')?.value || 0);
            const minStock = Number(document.getElementById('stockMinInput')?.value || 0);
            const source = stockModal.dataset.source || 'utama';
            if (!stockId || !stockName) {
                showToast('ID barang dan nama barang wajib diisi.', 'error');
                return;
            }
            try {
                await apiRequest('addStock', {
                    id: stockId,
                    name: stockName,
                    unit,
                    stock,
                    min_stock: minStock,
                    source
                });
                showToast('Master barang berhasil disimpan.', 'success');
                await refreshStockDataFromApi();
                renderAdminDashboard();
            } catch (err) {
                console.error('addStock error', err);
                showToast(err.message || 'Gagal menyimpan master barang.', 'error');
            }
        }


        function setLoginRole(role = 'admin') {
            currentLoginRole = (role === 'technician') ? 'technician' : 'admin';
            const loginTitle = loginModal.querySelector('#loginTitle');
            const loginSubtitle = loginModal.querySelector('#loginSubtitle');
            if (loginTitle) loginTitle.textContent = currentLoginRole === 'technician' ? 'Login TEKNISI' : 'Login ADMIN';
            if (loginSubtitle) loginSubtitle.textContent = currentLoginRole === 'technician' ? 'Akses panel teknisi' : 'Akses panel administrasi';
        }


        function openLogin(role = 'admin') {
            try {
                const selectedRole = (role === 'technician') ? 'technician' : 'admin';
                if (loginMenu) {
                    loginMenu.classList.remove('show');
                }
                const loginDropdown =
                    loginToggle
                        ? loginToggle.closest('.login-dropdown')
                        : null;
                if (loginDropdown) {
                    loginDropdown.classList.remove('open');
                }
                setLoginRole(selectedRole);
                if (!loginModal) {
                    console.error(
                        '[LERESSAE] loginModal tidak ditemukan.'
                    );
                    return false;
                }
                loginModal.style.display = 'flex';
                loginModal.classList.add('show');
                loginModal.setAttribute(
                    'aria-hidden',
                    'false'
                );
                document.body.classList.add('login-modal-open');
                const firstInput =
                    loginModal.querySelector(
                        'input'
                    );
                if (firstInput) {
                    setTimeout(function() {
                        try {
                            firstInput.focus();
                        } catch (focusError) {
                            console.warn(
                                'Login input focus gagal:',
                                focusError
                            );
                        }
                    }, 80);
                }
                return false;
            } catch (error) {
                console.error(
                    '[LERESSAE] Gagal membuka Login:',
                    error
                );
                return false;
            }
        }


        function closeLogin() {
            if (!loginModal) return;
            loginModal.classList.remove('show');
            loginModal.setAttribute(
                'aria-hidden',
                'true'
            );
            loginModal.style.display = '';
            document.body.classList.remove(
                'login-modal-open'
            );
        }


        async function handleLoginSubmit(event) {
            event.preventDefault();
            const submitButton = document.getElementById('submitLogin');
            if (submitButton.disabled) return;
            const emailField = document.getElementById('loginEmail');
            const passwordField = document.getElementById('loginPassword');
            const username = (emailField ? emailField.value : '').trim();
            const password = (passwordField ? passwordField.value : '').trim();
            submitButton.disabled = true;
            try {
                if (currentLoginRole === 'admin') {
                    const result = await loginAdmin(username, password);
                    if (result.success) {
                        closeLogin();
                        syncRoleNavbar();
                        navigateTo('page-admin');
                        renderAdminDashboard();
                        startAdminSyncLoop();
                        showToast('Login admin berhasil.', 'success');
                    } else {
                        showToast(result.message, 'error');
                    }
                    return;
                }
                if (currentLoginRole === 'technician') {
                    const result = await loginTechnician(username, password);
                    if (result.success) {
                        closeLogin();
                        syncRoleNavbar();
                        const techPanel = document.getElementById('technicianPanelContent');
                        if (techPanel) {
                            renderTechnicianPanelPage();
                        } else {
                            try {
                                if (window.renderTechnicianPanelPage) window.renderTechnicianPanelPage();
                            } catch (error) {
                                console.warn('renderTechnicianPanelPage gagal:', error);
                            }
                        }
                        navigateTo('page-technician');
                        showToast('Login teknisi berhasil.', 'success');
                    } else {
                        showToast(result.message, 'error');
                    }
                    return;
                }
                showToast('Silakan pilih role login yang valid.', 'error');
            } finally {
                submitButton.disabled = false;
            }
        }


        function handleLogout() {
            if (isAdminLoggedIn()) {
                setAdminSession(false);
                renderAdminDashboard();
            } else if (isClientLoggedIn()) {
                logoutClient();
            }
            syncRoleNavbar();
            navigateTo('page-dashboard');
            syncRoleNavbar();
            showToast('Logout berhasil. Kembali ke Dashboard publik.', 'success');
        }


        function bindStatusLookup() {
            const statusForm = document.getElementById('statusForm');
            if (!statusForm) return;
            statusForm.addEventListener('submit', async function (event) {
                event.preventDefault();
                const phoneInput = document.getElementById('statusPhone');
                const phoneValue = phoneInput ? phoneInput.value : '';
                const records = await getServiceStatus(phoneValue);
                renderStatusResults(records);
            });
        }


        function bindAdminActions() {
            const logoutBtn = document.getElementById('logoutAdminButton');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
            document.addEventListener('click', async function (event) {
                const target = event.target;
                const navTarget = target.closest('.admin-nav-item');
                if (navTarget && navTarget.dataset.adminPage) {
                    if (navTarget.dataset.adminPage === 'locations') {
                        showAdminPage('locations');
                        refreshLocationsInBackground();
                        if (window.innerWidth <= 767) closeAdminMenu();
                        return;
                    }
                    if (navTarget.dataset.adminPage === 'completed') {
                        showAdminPage('completed');
                        refreshServiceCacheFromApi().then(() => {
                            if (window.__ADMIN_CURRENT_PAGE__ === 'completed') showAdminPage('completed');
                        }).catch(error => console.warn('Gagal menyegarkan servis selesai:', error));
                        if (window.innerWidth <= 767) closeAdminMenu();
                        return;
                    }
                    showAdminPage(navTarget.dataset.adminPage);
                    if (window.innerWidth <= 767) closeAdminMenu();
                    return;
                }
                const genericPageButton = target.closest('[data-admin-page]');
                if (genericPageButton && genericPageButton.dataset.adminPage) {
                    showAdminPage(genericPageButton.dataset.adminPage);
                    return;
                }
                const techDetail = target.closest('[data-tech-detail]');
                if (techDetail) {
                    renderTechnicianDetail(techDetail.dataset.techDetail);
                    return;
                }
                const techEdit = target.closest('[data-tech-edit]');
                if (techEdit) {
                    openTechnicianModal('edit', techEdit.dataset.techEdit);
                    return;
                }
                const techToggle = target.closest('[data-tech-toggle]');
                if (techToggle) {
                    const users = getTechnicianUsers();
                    const match = users.find(user => String(user.USERNAME || '').toLowerCase() === String(techToggle.dataset.techToggle || '').toLowerCase());
                    if (!match) { showToast('Teknisi tidak ditemukan.', 'error'); return; }
                    const nextStatus = String(match.STATUS || 'AKTIF').toUpperCase() === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
                    try {
                        techToggle.disabled = true;
                        await saveTechnicianToBackend({ ...match, status: nextStatus }, match.USERNAME, match.PASSWORD || match.PASSWORD_HASH || '');
                        await refreshTechniciansFromBackend();
                    } catch (error) {
                        if (handleTechnicianAuthError(error)) return;
                        showToast(error.message || 'Status Teknisi gagal diperbarui di server.', 'error');
                        return;
                    }
                    showAdminPage('technicians');
                    showToast('Status teknisi berhasil diperbarui.', 'success');
                    return;
                }
                const techAdd = target.closest('[data-tech-action="add"]');
                if (techAdd) {
                    openTechnicianModal('add');
                    return;
                }
                const techRetry = target.closest('[data-tech-action="retry"]');
                if (techRetry) {
                    window.__TECHNICIAN_LOAD_ERROR__ = '';
                    showAdminPage('technicians');
                    return;
                }
                const techSync = target.closest('[data-tech-action="sync-local"]');
                if (techSync) {
                    techSync.disabled = true;
                    try {
                        const response = await syncLocalTechniciansToBackend();
                        await Promise.all([refreshTechniciansFromBackend(), refreshServiceCacheFromApi()]);
                        showAdminPage('technicians', { fromBack: true, skipTechnicianRefresh: true });
                        showToast((response.count || 0) + ' akun Teknisi lama berhasil disinkronkan ke server.', 'success');
                    } catch (error) {
                        if (handleTechnicianAuthError(error)) return;
                        showToast(error.message || 'Sinkronisasi akun Teknisi gagal.', 'error');
                    } finally {
                        techSync.disabled = false;
                    }
                    return;
                }
                const techJobDetail = target.closest('[data-tech-job-detail]');
                if (techJobDetail) {
                    const serviceId = techJobDetail.dataset.techJobDetail;
                    const item = loadServiceRecords().find(entry => entry.id === serviceId);
                    if (!item) { showToast('Data servis tidak ditemukan.', 'error'); return; }
                    const detailWrap = document.getElementById('technicianDetailContent');
                    if (detailWrap) {
                        detailWrap.innerHTML = `
                            <div class="service-status-card">
                                <div class="service-status-header">
                                    <h3>${escapeHtml(item.item_name || '-')}</h3>
                                    <span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span>
                                </div>
                                <div class="service-meta">
                                    <div><strong>ID Servis:</strong> ${escapeHtml(item.id)}</div>
                                    <div><strong>Nama Pelanggan:</strong> ${escapeHtml(item.customer_name || '-')}</div>
                                    <div><strong>No. WhatsApp:</strong> ${escapeHtml(item.phone || '-')}</div>
                                    <div><strong>Barang:</strong> ${escapeHtml(item.item_name || '-')}</div>
                                    <div><strong>Merek:</strong> ${escapeHtml(item.merk || '-')}</div>
                                    <div><strong>Jenis:</strong> ${escapeHtml(item.jenis || item.tipe || '-')}</div>
                                    <div><strong>Keluhan:</strong> ${escapeHtml(item.keluhan || '-')}</div>
                                    <div><strong>Tanggal Masuk:</strong> ${escapeHtml(formatDate(item.created_at || item.tanggal_masuk))}</div>
                                    <div><strong>Teknisi:</strong> ${escapeHtml(item.technician || '-')}</div>
                                    <div><strong>Status:</strong> ${escapeHtml(item.status || '-')}</div>
                                </div>
                                <div style="margin-top:16px;">
                                    <label style="display:block;font-weight:700;margin-bottom:8px;">Ubah Status</label>
                                    <select id="techStatusUpdate" style="width:100%;padding:10px;border-radius:8px;border:1px solid #dbe4ef;">
                                        ${APP_CONFIG.statusOptions.map(status => `<option value="${status}" ${getServiceDisplayStatus(item.status) === status ? 'selected' : ''}>${status}</option>`).join('')}
                                    </select>
                                </div>
                                <div style="margin-top:12px;">
                                    <label style="display:block;font-weight:700;margin-bottom:8px;">Catatan Teknisi</label>
                                    <textarea id="techStatusNote" rows="3" style="width:100%; padding:10px; border-radius:8px; border:1px solid #dbe4ef;">${escapeHtml(item.notes || '')}</textarea>
                                </div>
                                <div style="margin-top:12px;">
                                    <button class="btn-primary" type="button" id="techFinishBtn">Update Status</button>
                                </div>
                            </div>
                        `;
                        const finishBtn = document.getElementById('techFinishBtn');
                        if (finishBtn) finishBtn.onclick = () => {
                            const newStatus = document.getElementById('techStatusUpdate')?.value || item.status;
                            const notes = document.getElementById('techStatusNote')?.value || '';
                            const records = loadServiceRecords();
                            const index = records.findIndex(row => row.id === item.id);
                            if (index === -1) return;
                            const oldStatus = records[index].status;
                            const can = canTechnicianUpdateStatus(oldStatus, newStatus);
                            if (!can) { showToast('Perubahan status tidak valid untuk alur teknisi.', 'error'); return; }
                            records[index] = { ...records[index], status: newStatus, notes, technician: records[index].technician || (JSON.parse(localStorage.getItem('leressae_technician_session') || '{}').name || 'Teknisi'), timestamp_update: new Date().toISOString(), admin_update: 'TEKNISI' };
                            if (newStatus === 'Selesai') {
                                records[index].tanggal_selesai = new Date().toISOString().slice(0, 10);
                            }
                            setServiceCache(records);
                            recordTechnicianHistory(item.id, oldStatus, newStatus, JSON.parse(localStorage.getItem('leressae_technician_session') || '{}').name || 'Teknisi', notes);
                            showToast('Status teknisi berhasil diperbarui.', 'success');
                            renderTechnicianPanelPage();
                            showAdminPage('dashboard');
                        };
                    }
                    return;
                }
                const adminCompleteButton = target.closest('[data-admin-complete]');
                if (adminCompleteButton) {
                    const id = adminCompleteButton.dataset.adminComplete;
                    if (!id || adminCompleteButton.disabled) return;
                    const records = loadServiceRecords();
                    const index = records.findIndex(item => String(item.id) === String(id));
                    if (index === -1) {
                        showToast('Data servis tidak ditemukan.', 'error');
                        return;
                    }
                    const item = records[index];
                    if (getServiceDisplayStatus(item.status) !== 'Selesai') {
                        showToast('Servis belum selesai. Menunggu Teknisi mengubah status menjadi Selesai.', 'error');
                        return;
                    }
                    if (isAdminCompleted(item)) {
                        showToast('Servis ini sudah dikonfirmasi Admin.', 'info');
                        showAdminPage('completed');
                        return;
                    }
                    const updatedRow = {
                        ...item,
                        admin_completed: true,
                        admin_completed_at: new Date().toISOString(),
                        admin_update: 'ADMIN_1',
                        timestamp_update: new Date().toISOString()
                    };
                    setAdminCompleted(id, true);
                    setServiceCache(records.map((row, idx) => idx === index ? updatedRow : row));
                    if (isApiConfigured()) {
                        try {
                            const response = await apiRequest('updateServiceStatus', {
                                serviceId: id,
                                status: 'Selesai',
                                admin_completed: true,
                                admin_completed_at: updatedRow.admin_completed_at,
                                admin_update: 'ADMIN_1',
                                data: updatedRow,
                                reason: 'admin-confirm-service-completed'
                            });
                            if (!response || response.success !== false) {
                                await refreshServiceCacheFromApi();
                            }
                        } catch (error) {
                            console.warn('Konfirmasi selesai ke API gagal; penanda lokal tetap dipakai:', error);
                        }
                    }
                    showToast('Servis dikonfirmasi selesai dan dipindahkan ke Servis Selesai.', 'success');
                    showAdminPage('running');
                    return;
                }
                const customerDetailButton = target.closest('[data-customer-detail]');
                if (customerDetailButton) {
                    renderCustomerProfile(customerDetailButton.dataset.customerDetail);
                    return;
                }
                const reportDetailButton = target.closest('[data-report-service-detail]');
                if (reportDetailButton) {
                    openReportServiceDetail(reportDetailButton.dataset.reportServiceDetail);
                    return;
                }
                const detailButton = target.closest('[data-open-detail]');
                if (detailButton) {
                    const serviceId = detailButton.dataset.openDetail;
                    const records = loadServiceRecords();
                    const item = records.find(entry => entry.id === serviceId) || records.find(entry => normalizePhone(entry.phone) === normalizePhone(serviceId));
                    if (item) {
                        openServiceDetail(item.id);
                    } else {
                        showToast('Data detail tidak ditemukan.', 'error');
                    }
                    return;
                }
                const techButton = target.closest('[data-open-tech]');
                if (techButton) {
                    const techName = techButton.dataset.openTech;
                    const records = loadServiceRecords().filter(item => (item.technician || 'Belum Ditentukan') === techName);
                    if (!records.length) {
                        showToast('Tidak ada riwayat teknisi yang ditemukan.', 'error');
                        return;
                    }
                    const listHtml = records.map(item => `
                        <div class="service-status-card" style="margin-bottom:12px;">
                            <div class="service-status-header">
                                <h3>${escapeHtml(item.item_name || '-')}</h3>
                                <span class="status-badge ${getStatusClass(item.status)}">${escapeHtml(getServiceDisplayStatus(item.status))}</span>
                            </div>
                            <div class="service-meta">
                                <div><strong>ID:</strong> ${escapeHtml(item.id)}</div>
                                <div><strong>Pelanggan:</strong> ${escapeHtml(item.customer_name)}</div>
                                <div><strong>Barang:</strong> ${escapeHtml(item.item_name)}</div>
                                <div><strong>Teknisi:</strong> ${escapeHtml(item.technician || 'Belum Ditentukan')}</div>
                            </div>
                        </div>
                    `).join('');
                    const statusResult = document.getElementById('statusResult');
                    if (statusResult) {
                        statusResult.innerHTML = listHtml;
                        navigateTo('page-status');
                    }
                    showToast('Riwayat teknisi ditampilkan.', 'success');
                    return;
                }
                const copyApiButton = target.closest('[data-copy-api-url]');
                if (copyApiButton) {
                    copyApiUrl();
                    return;
                }
                const testConnectionButton = target.closest('[data-test-connection]');
                if (testConnectionButton) {
                    await testApiConnection();
                    await refreshGoogleIntegrationStatus();
                    const activePage = document.querySelector('.admin-nav-item.active')?.dataset.adminPage || 'dashboard';
                    if (activePage === 'settings') {
                        showAdminPage('settings', { skipIntegrationCheck: true });
                    }
                    return;
                }
                const stockTab = target.closest('[data-stock-tab]');
                if (stockTab) {
                    const stockRoot = stockTab.closest('[data-stock-flow-root]') || stockTab.closest('.admin-card');
                    const selectedTab = stockTab.dataset.stockTab;
                    if (!stockRoot || !STOCK_SHEETS.some(sheet => sheet.key === selectedTab)) return;
                    window.__ACTIVE_STOCK_TAB__ = selectedTab;
                    stockRoot.querySelectorAll('[data-stock-tab]').forEach(tab => {
                        const isActive = tab.dataset.stockTab === selectedTab;
                        tab.classList.toggle('active', isActive);
                        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                    });
                    const currentStockRoot = stockRoot;
                    currentStockRoot.outerHTML = renderStockPage();
                    return;
                }
                const refreshStockSheetButton = target.closest('[data-stock-sheet-refresh]');
                if (refreshStockSheetButton) {
                    refreshStockSheetsFromGoogle(true);
                    showAdminPage('stock', { fromBack: true });
                    return;
                }
                const stockButton = target.closest('[data-stock-action]');
                if (stockButton) {
                    const action = stockButton.dataset.stockAction;
                    const code = stockButton.dataset.stockCode;
                    if (action === 'add') {
                        openStockModal('add', '', stockButton.dataset.stockSource || 'utama');
                    } else if (action === 'detail') {
                        openStockModal('detail', code);
                    } else if (action === 'in' || action === 'out') {
                        openStockModal(action, code);
                    }
                    return;
                }
                const exportCsvButton = target.closest('[data-export-csv]');
                if (exportCsvButton) {
                    exportFilteredReportCsv(getReportFilteredRecords());
                    return;
                }
            }, true);
            document.addEventListener('input', function (event) {
                const target = event.target;
                if (target && target.id === 'reportSearch') {
                    getReportFilters().keyword = target.value || '';
                    const cursor = target.selectionStart;
                    showAdminPage('reports');
                    const search = document.getElementById('reportSearch');
                    if (search) { search.focus(); if (cursor !== null) search.setSelectionRange(cursor, cursor); }
                    return;
                }
                if (target && target.id === 'adminSearchInput') {
                    const activePage = document.querySelector('.admin-nav-item.active')?.dataset.adminPage || 'services';
                    if (activePage === 'services') {
                        showAdminPage('services');
                    }
                }
                if (target && (target.id === 'runningSearchInput' || target.id === 'completedSearchInput')) {
                    const page = document.querySelector('.admin-nav-item.active')?.dataset.adminPage || 'services';
                    if (page === 'running' || page === 'completed' || page === 'dashboard') {
                        if (page === 'running') {
                            window.__RUNNING_FILTER__ = target.value || '';
                        } else if (page === 'completed') {
                            window.__COMPLETED_FILTER__ = target.value || '';
                        }
                        showAdminPage(page);
                    }
                }
                if (target && (target.id === 'techSearchInput' || target.id === 'techStatusFilter')) {
                    window.__TECHNICIAN_FILTERS__ = {
                        query: target.id === 'techSearchInput' ? target.value : (window.__TECHNICIAN_FILTERS__?.query || ''),
                        status: target.id === 'techStatusFilter' ? target.value : (window.__TECHNICIAN_FILTERS__?.status || 'all')
                    };
                    showAdminPage('technicians', { skipTechnicianRefresh: true });
                }
                if (target && (target.id === 'runningDateFrom' || target.id === 'runningDateTo')) {
                    const value = target.value || '';
                    if (target.id === 'runningDateFrom') window.__RUNNING_FILTER_CUSTOM_FROM__ = value;
                    if (target.id === 'runningDateTo') window.__RUNNING_FILTER_CUSTOM_TO__ = value;
                    if (window.__RUNNING_FILTER_PERIOD__ !== 'custom') window.__RUNNING_FILTER_PERIOD__ = 'custom';
                    showAdminPage('running');
                }
                if (target && (target.id === 'completedDateFrom' || target.id === 'completedDateTo')) {
                    const value = target.value || '';
                    if (target.id === 'completedDateFrom') window.__COMPLETED_FILTER_CUSTOM_FROM__ = value;
                    if (target.id === 'completedDateTo') window.__COMPLETED_FILTER_CUSTOM_TO__ = value;
                    if (window.__COMPLETED_FILTER_PERIOD__ !== 'custom') window.__COMPLETED_FILTER_PERIOD__ = 'custom';
                    showAdminPage('completed');
                }
                if (target && (target.id === 'reportDateFrom' || target.id === 'reportDateTo')) {
                    const filters = getReportFilters();
                    filters.period = 'custom';
                    if (target.id === 'reportDateFrom') filters.from = target.value || '';
                    else filters.to = target.value || '';
                    showAdminPage('reports');
                }
            });
            document.addEventListener('change', function (event) {
                const target = event.target;
                if ((target && target.id === 'adminFilterStatus') || (target && target.id === 'adminFilterDate')) {
                    const activePage = document.querySelector('.admin-nav-item.active')?.dataset.adminPage || 'services';
                    if (activePage === 'services') {
                        showAdminPage('services');
                    }
                }
                if (target && (target.id === 'runningPeriodFilter' || target.id === 'completedPeriodFilter')) {
                    const page = target.id === 'runningPeriodFilter' ? 'running' : 'completed';
                    const value = target.value || 'all';
                    if (page === 'running') {
                        window.__RUNNING_FILTER_PERIOD__ = value;
                        if (value !== 'custom') {
                            window.__RUNNING_FILTER_CUSTOM_FROM__ = '';
                            window.__RUNNING_FILTER_CUSTOM_TO__ = '';
                        }
                    } else {
                        window.__COMPLETED_FILTER_PERIOD__ = value;
                        if (value !== 'custom') {
                            window.__COMPLETED_FILTER_CUSTOM_FROM__ = '';
                            window.__COMPLETED_FILTER_CUSTOM_TO__ = '';
                        }
                    }
                    const activePage = document.querySelector('.admin-nav-item.active')?.dataset.adminPage || 'services';
                    if (activePage === page || activePage === 'dashboard') {
                        showAdminPage(page);
                    }
                }
                if (target && ['reportPeriod', 'reportTechnician', 'reportStatus'].includes(target.id)) {
                    const filters = getReportFilters();
                    if (target.id === 'reportPeriod') {
                        filters.period = target.value || 'all';
                        if (filters.period !== 'custom') { filters.from = ''; filters.to = ''; }
                    } else if (target.id === 'reportTechnician') filters.technician = target.value || 'all';
                    else filters.status = target.value || 'all';
                    showAdminPage('reports');
                }
            });
        }
        const navToggle = document.getElementById('navToggle');
        const navbar = document.querySelector('.navbar');


        function setMobileNav(isOpen) {
            if (!navbar || !navToggle) return;
            navbar.classList.toggle('nav-open', isOpen);
            navToggle.setAttribute('aria-expanded', String(isOpen));
            navToggle.setAttribute(
                'aria-label',
                isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'
            );
            navToggle.textContent = isOpen ? '×' : '☰';
            if (!isOpen) {
                closeAllNavDropdowns();
            }
        }
        if (navToggle && navbar) {
            navToggle.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                setMobileNav(!navbar.classList.contains('nav-open'));
            });
            window.addEventListener('resize', function() {
                if (window.innerWidth > 900) {
                    setMobileNav(false);
                }
            });
        }


        function closeAllNavDropdowns() {
            const layananDropdown = layananToggle.closest('.dropdown');
            const loginDropdown = loginToggle.closest('.login-dropdown');
            layananMenu.classList.remove('show');
            layananDropdown.classList.remove('open');
            loginMenu.classList.remove('show');
            loginDropdown.classList.remove('open');
        }
        layananToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const layananDropdown = layananToggle.closest('.dropdown');
            const loginDropdown = loginToggle.closest('.login-dropdown');
            const isOpen = layananMenu.classList.contains('show');
            loginMenu.classList.remove('show');
            loginDropdown.classList.remove('open');
            layananMenu.classList.toggle('show', !isOpen);
            layananDropdown.classList.toggle('open', !isOpen);
        });
        document.addEventListener('click', function(e) {
            const link = e.target.closest('#layananMenu a[data-nav-page]');
            if (!link) return;
            e.preventDefault();
            e.stopPropagation();
            const pageId = link.getAttribute('data-nav-page');
            if (!pageId) return;
            if (typeof navigateTo === 'function') {
                navigateTo(pageId, {fromNavbar:true});
            }
            if (layananMenu) layananMenu.classList.remove('show');
            const layananDropdown = layananToggle ? layananToggle.closest('.dropdown') : null;
            if (layananDropdown) layananDropdown.classList.remove('open');
            if (window.innerWidth <= 900 && typeof setMobileNav === 'function') {
                setMobileNav(false);
            }
        }, true);
        if (loginToggle && loginMenu) {
            loginToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (isAdminLoggedIn() || isTechnicianLoggedIn()) {
                    if (isTechnicianLoggedIn()) {
                        if (typeof window.renderTechnicianPanelPage === 'function') {
                            window.renderTechnicianPanelPage();
                        }
                        navigateTo('page-technician');
                        showToast('Panel Teknisi dibuka. Logout tersedia di panel.', 'info');
                    } else {
                        navigateTo('page-admin');
                        renderAdminDashboard();
                        startAdminSyncLoop();
                        showToast('Panel Admin dibuka. Logout tersedia di panel.', 'info');
                    }
                    return;
                }
                const loginDropdown = loginToggle.closest('.login-dropdown');
                const layananDropdown = layananToggle
                    ? layananToggle.closest('.dropdown')
                    : null;
                const isOpen = loginMenu.classList.contains('show');
                if (layananMenu) layananMenu.classList.remove('show');
                if (layananDropdown) layananDropdown.classList.remove('open');
                if (isOpen) {
                    loginMenu.classList.remove('show');
                    if (loginDropdown) loginDropdown.classList.remove('open');
                } else {
                    loginMenu.classList.add('show');
                    if (loginDropdown) loginDropdown.classList.add('open');
                }
            });
        }


        function syncRoleNavbar() {
            if (!navbar) return;
            const adminPageActive = !!document.getElementById('page-admin')?.classList.contains('active');
            const technicianPageActive = !!document.getElementById('page-technician')?.classList.contains('active');
            const roleActive = adminPageActive || technicianPageActive;
            const loginDropdown = loginToggle ? loginToggle.closest('.login-dropdown') : null;
            const layananDropdown = layananToggle ? layananToggle.closest('.dropdown') : null;
            if (roleActive) {
                navbar.classList.add('role-session-navbar-hidden');
                navbar.setAttribute('hidden', 'hidden');
                navbar.classList.remove('nav-open');
                navbar.style.setProperty('display', 'none', 'important');
                navbar.style.setProperty('visibility', 'hidden', 'important');
                navbar.style.setProperty('pointer-events', 'none', 'important');
                if (loginMenu) loginMenu.classList.remove('show');
                if (loginDropdown) loginDropdown.classList.remove('open');
                if (layananMenu) layananMenu.classList.remove('show');
                if (layananDropdown) layananDropdown.classList.remove('open');
            } else {
                navbar.classList.remove('role-session-navbar-hidden');
                navbar.removeAttribute('hidden');
                navbar.style.removeProperty('display');
                navbar.style.removeProperty('visibility');
                navbar.style.removeProperty('pointer-events');
            }
        }
        document.addEventListener('click', function(e) {
            const loginDropdown = loginToggle
                ? loginToggle.closest('.login-dropdown')
                : null;
            const layananDropdown = layananToggle
                ? layananToggle.closest('.dropdown')
                : null;
            if (layananDropdown && !layananDropdown.contains(e.target)) {
                if (layananMenu) layananMenu.classList.remove('show');
                layananDropdown.classList.remove('open');
            }
            if (loginDropdown && !loginDropdown.contains(e.target)) {
                if (loginMenu) loginMenu.classList.remove('show');
                loginDropdown.classList.remove('open');
            }
            if (
                navbar &&
                window.innerWidth <= 900 &&
                navbar.classList.contains('nav-open') &&
                !navbar.contains(e.target)
            ) {
                setMobileNav(false);
            }
            const adminShell = document.querySelector('.admin-shell');
            const adminSidebar = document.querySelector('.admin-sidebar');
            const adminMenuButton = document.querySelector('.admin-menu-toggle');
            if (
                window.innerWidth <= 767 &&
                adminShell &&
                adminShell.classList.contains('admin-menu-open') &&
                adminSidebar &&
                !adminSidebar.contains(e.target) &&
                !(adminMenuButton && adminMenuButton.contains(e.target))
            ) {
                closeAdminMenu();
            }
        });
        window.__LERESSAE_PUBLIC_HISTORY = window.__LERESSAE_PUBLIC_HISTORY || ['page-dashboard'];
        window.__LERESSAE_ADMIN_HISTORY = window.__LERESSAE_ADMIN_HISTORY || ['dashboard'];


        function addBackButton(container, kind, currentKey) {
            if (!container) return;
            const existing = container.querySelector(':scope > .leressae-back-row');
            if (existing) existing.remove();
            const row = document.createElement('div');
            row.className = 'leressae-back-row';
            row.innerHTML = `<button type="button" class="leressae-back-btn" data-leressae-back="${escapeHtml(kind)}" aria-label="Kembali ke halaman sebelumnya"><span class="leressae-back-icon" aria-hidden="true">←</span><span>Kembali</span></button>`;
            container.insertBefore(row, container.firstChild);
        }


        function appBack() {
            const techShell = document.getElementById('technicianShell');
            if (techShell && isTechnicianLoggedIn()) {
                const stack = window.__LERESSAE_TECH_HISTORY || ['dashboard'];
                if (stack.length > 1) stack.pop();
                renderTechView(stack[stack.length - 1] || 'dashboard', { fromBack: true });
                return;
            }
            if (isAdminLoggedIn() && document.querySelector('.admin-shell')) {
                const stack = window.__LERESSAE_ADMIN_HISTORY || ['dashboard'];
                if (stack.length > 1) stack.pop();
                showAdminPage(stack[stack.length - 1] || 'dashboard', { fromBack: true });
                return;
            }
            const stack = window.__LERESSAE_PUBLIC_HISTORY || ['page-dashboard'];
            if (stack.length > 1) stack.pop();
            navigateTo(stack[stack.length - 1] || 'page-dashboard', { fromBack: true });
        }
        document.addEventListener('click', function(e) {
            const detailBack = e.target.closest('[data-service-detail-back]');
            if (detailBack) {
                e.preventDefault();
                const context = window.__LERESSAE_DETAIL_RETURN_CONTEXT__ || {
                    kind: window.__LERESSAE_DETAIL_RETURN_KIND__ || 'public',
                    page: window.__LERESSAE_DETAIL_RETURN_PAGE__ || 'page-status',
                    scroll: Number(window.__LERESSAE_DETAIL_RETURN_SCROLL__ || 0)
                };
                const returnPage = context.page || 'page-status';
                const returnScroll = Number(context.scroll || 0);
                if (context.kind === 'tech' && isTechnicianLoggedIn()) {
                    const techHistory = window.__LERESSAE_TECH_HISTORY || ['dashboard'];
                    const targetPage = techHistory.includes(returnPage) ? returnPage : (techHistory[techHistory.length - 1] || 'dashboard');
                    renderTechView(targetPage, { fromBack: true });
                    const shell = document.getElementById('technicianShell');
                    if (shell) shell.dataset.techPage = targetPage;
                } else if (context.kind === 'admin' && isAdminLoggedIn()) {
                    const adminHistory = window.__LERESSAE_ADMIN_HISTORY || ['dashboard'];
                    const targetPage = adminHistory.includes(returnPage)
                        ? returnPage
                        : (adminHistory[adminHistory.length - 1] || 'dashboard');
                    showAdminPage(targetPage, { fromBack: true });
                    requestAnimationFrame(() => {
                        window.scrollTo({ top: returnScroll, behavior: 'auto' });
                    });
                } else {
                    if (returnPage === 'page-status') {
                        navigateTo('page-status', { fromBack: true });
                        const cached = window.__LERESSAE_STATUS_RESULTS_CACHE__;
                        if (Array.isArray(cached) && cached.length) renderStatusResults(cached);
                    } else if (returnPage === 'page-client') {
                        navigateTo('page-client', { fromBack: true });
                        if (typeof renderClientDashboard === 'function') renderClientDashboard();
                    } else {
                        navigateTo(returnPage, { fromBack: true });
                    }
                }
                window.__LERESSAE_DETAIL_RETURN_CONTEXT__ = null;
                window.__LERESSAE_DETAIL_RETURN_PAGE__ = null;
                window.__LERESSAE_DETAIL_RETURN_KIND__ = null;
                window.__LERESSAE_DETAIL_RETURN_SCROLL__ = 0;
                requestAnimationFrame(() => window.scrollTo({ top: returnScroll, behavior: 'smooth' }));
                return;
            }
            const back = e.target.closest('[data-leressae-back]');
            if (!back) return;
            e.preventDefault();
            appBack();
        });


        function navigateTo(pageId, options = {}) {
            const history = window.__LERESSAE_PUBLIC_HISTORY || (window.__LERESSAE_PUBLIC_HISTORY = ['page-dashboard']);
            if (options.fromNavbar) {
                history.length = 0;
                history.push('page-dashboard');
                if (pageId !== 'page-dashboard') history.push(pageId);
            } else if (options.resetHistory) {
                history.length = 0;
                history.push(pageId);
            } else if (!options.fromBack && history[history.length - 1] !== pageId) {
                history.push(pageId);
            }
            const pages = document.querySelectorAll('.page-view');
            pages.forEach(page => page.classList.remove('active'));
            const selectedPage = document.getElementById(pageId);
            if (selectedPage) {
                selectedPage.classList.add('active');
            }
            if (pageId === 'page-media') {
                migrateMediaTitleDescriptionCache();
        renderPublicMediaGallery();
                loadMediaFromApi({ stayOnAdminMedia: false }).catch(error => console.warn('Media Drive belum termuat:', error));
            }
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => item.classList.remove('active'));
            if (pageId === 'page-dashboard') {
                const navDashboard = document.getElementById('nav-dashboard');
                if (navDashboard) navDashboard.classList.add('active');
            } else if (pageId === 'page-media') {
                const navMedia = document.getElementById('nav-media');
                if (navMedia) navMedia.classList.add('active');
            } else if (pageId === 'page-status') {
                const navStatus = document.getElementById('nav-status');
                if (navStatus) navStatus.classList.add('active');
            } else if (pageId === 'page-client') {
                const navClient = document.getElementById('nav-client');
                if (navClient) navClient.classList.add('active');
            } else if (pageId === 'page-kontak') {
                const navKontak = document.getElementById('nav-kontak');
                if (navKontak) navKontak.classList.add('active');
            }
            layananMenu.classList.remove('show');
            if (navbar && window.innerWidth <= 900) {
                setMobileNav(false);
            }
            const currentPublicPage = document.getElementById(pageId);
            if (currentPublicPage && pageId !== 'page-dashboard' && pageId !== 'page-admin' && !isAdminLoggedIn()) {
                addBackButton(currentPublicPage, 'public', pageId);
            }
            if (pageId === 'page-admin') {
                currentPublicPage?.querySelectorAll('.leressae-back-row').forEach(el => el.remove());
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            syncRoleNavbar();
        }
        const loginModal = document.createElement('div');
        loginModal.className = 'login-modal';
        loginModal.setAttribute('aria-hidden', 'true');
        loginModal.innerHTML = `
            <div class="login-panel" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
                <div class="login-panel-header">
                    <button class="login-close" type="button" aria-label="Tutup login">×</button>
                    <h3 id="loginTitle">Masuk ke Sistem</h3>
                    <p id="loginSubtitle">Pilih akun yang sesuai</p>
                </div>
                <div class="login-body">
                    <form class="login-form" id="loginForm">
                        <div class="login-field">
                            <label for="loginEmail">Username</label>
                            <input id="loginEmail" type="text" placeholder="Masukkan username" autocomplete="username" />
                        </div>
                        <div class="login-field">
                            <label for="loginPassword">Password</label>
                            <div class="password-row" style="position:relative;">
                                <input id="loginPassword" type="password" placeholder="Masukkan password" autocomplete="current-password" style="width:100%; padding-right:40px;" />
                                <button type="button" class="toggle-password" data-toggle-target="loginPassword" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); border:none; background:transparent; color:#64748b; font-weight:700; cursor:pointer;">Show</button>
                            </div>
                        </div>
                        <div class="login-actions">
                            <button type="button" class="login-btn-secondary" id="cancelLogin">Batal</button>
                            <button type="submit" class="login-btn-primary" id="submitLogin">Masuk</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(loginModal);
        const loginClose = loginModal.querySelector('.login-close');
        const cancelLogin = loginModal.querySelector('#cancelLogin');
        const loginForm = loginModal.querySelector('#loginForm');
        loginClose.addEventListener('click', closeLogin);
        cancelLogin.addEventListener('click', closeLogin);
        loginModal.addEventListener('click', function(e) {
            if (e.target === loginModal) closeLogin();
        });
        document.addEventListener('click', function(event) {
            const target = event.target;
            if (target && target.matches('.toggle-password')) {
                const pwd = document.getElementById(target.dataset.toggleTarget);
                if (!pwd) return;
                const isPassword = pwd.type === 'password';
                pwd.type = isPassword ? 'text' : 'password';
                target.textContent = isPassword ? 'Hide' : 'Show';
            }
        });
        loginForm.addEventListener('keydown', event => {
            if (event.key === 'Enter' && event.target.matches('input')) {
                event.preventDefault();
                loginForm.requestSubmit(loginForm.querySelector('[type="submit"]'));
            }
        });
        loginForm.addEventListener('submit', handleLoginSubmit);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && loginModal.classList.contains('show')) {
                closeLogin();
            }
        });
        const stockModal = document.createElement('div');
        stockModal.className = 'stock-modal';
        stockModal.setAttribute('aria-hidden', 'true');
        stockModal.innerHTML = `
            <div class="stock-panel" role="dialog" aria-modal="true" aria-labelledby="stockTitle">
                <div class="stock-panel-header">
                    <button class="stock-close" type="button" aria-label="Tutup">×</button>
                    <h3 id="stockTitle">Manajemen Stok</h3>
                </div>
                <div class="stock-body">

                    <form id="stockForm">
                        <div class="field-row"><label>Kode Barang</label><input id="stockCodeInput" type="text" required /></div>
                        <div class="field-row"><label>Nama Barang</label><input id="stockNameInput" type="text" required /></div>
                        <div class="field-row"><label>Satuan</label><input id="stockSatuanInput" type="text" placeholder="pcs / unit" required /></div>
                        <div class="field-row"><label>Stok Awal</label><input id="stockAwalInput" type="number" min="0" value="0" required /></div>
                        <div class="field-row"><label>Minimum Stok</label><input id="stockMinInput" type="number" min="0" value="0" required /></div>
                        <div class="field-row"><label>Keterangan</label><textarea id="stockKeteranganInput"></textarea></div>
                        <div class="stock-actions">
                            <button type="button" class="btn-secondary" id="cancelStock">Batal</button>
                            <button type="submit" class="btn-primary" id="submitStock">Simpan</button>
                        </div>
                    </form>
                    <div id="stockDetailView" style="display:none; margin-top:12px;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(stockModal);
        const stockClose = stockModal.querySelector('.stock-close');
        const cancelStock = stockModal.querySelector('#cancelStock');
        const stockForm = stockModal.querySelector('#stockForm');
        const stockDetailView = stockModal.querySelector('#stockDetailView');


        function openStockModal(mode, code, source = 'utama') {
            stockModal.classList.add('show');
            stockModal.setAttribute('aria-hidden', 'false');
            stockModal.dataset.source = source;
            stockDetailView.style.display = 'none';
            const title = stockModal.querySelector('#stockTitle');
            const codeInput = stockModal.querySelector('#stockCodeInput');
            const nameInput = stockModal.querySelector('#stockNameInput');
            const qtyInput = stockModal.querySelector('#stockQtyInput');
            const noteInput = stockModal.querySelector('#stockNoteInput');
            const satuanInput = stockModal.querySelector('#stockSatuanInput');
            const stokAwalInput = stockModal.querySelector('#stockAwalInput');
            const stokMinInput = stockModal.querySelector('#stockMinInput');
            const keteranganInput = stockModal.querySelector('#stockKeteranganInput');
            if (mode === 'add') {
                title.textContent = '+ Tambah Barang';
                codeInput.value = '';
                nameInput.value = '';
                satuanInput.value = 'pcs';
                stokAwalInput.value = 0;
                stokMinInput.value = 0;
                keteranganInput.value = '';
                codeInput.removeAttribute('readonly');
                stockForm.style.display = '';
            } else if (mode === 'detail') {
                title.textContent = 'Detail Barang';
                const stock = getStockRecords().find(item => String(item.code).toUpperCase() === String(code || '').toUpperCase());
                if (stock) {
                    stockForm.style.display = 'none';
                    stockDetailView.style.display = '';
                    stockDetailView.innerHTML = `
                        <div><strong>Kode:</strong> ${escapeHtml(stock.code)}</div>
                        <div><strong>Nama:</strong> ${escapeHtml(stock.name)}</div>
                        <div><strong>Satuan:</strong> ${escapeHtml(stock.satuan || 'pcs')}</div>
                        <div><strong>Stok Awal:</strong> ${Number(stock.stokAwal || 0)}</div>
                        <div><strong>Total Masuk:</strong> ${Number(stock.masuk || 0)}</div>
                        <div><strong>Total Keluar:</strong> ${Number(stock.keluar || 0)}</div>
                        <div><strong>Stok Saat Ini:</strong> ${Number(stock.stokSaatIni || 0)}</div>
                        <div style="margin-top:8px;"><button class="btn-secondary" type="button" data-stock-action="in" data-stock-code="${escapeHtml(stock.code)}">Barang Masuk</button>
                        <button class="btn-secondary" type="button" data-stock-action="out" data-stock-code="${escapeHtml(stock.code)}">Barang Keluar</button></div>
                        `;
                } else {
                    stockDetailView.innerHTML = '<div class="admin-empty-state">Barang tidak ditemukan.</div>';
                    stockDetailView.style.display = '';
                }
            } else if (mode === 'in' || mode === 'out') {
                openStockInOutModal(mode, code);
            }
        }


        function closeStockModal() {
            stockModal.classList.remove('show');
            stockModal.setAttribute('aria-hidden', 'true');
        }
        stockClose.addEventListener('click', closeStockModal);
        cancelStock.addEventListener('click', closeStockModal);
        stockModal.addEventListener('click', function(e) { if (e.target === stockModal) closeStockModal(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && stockModal.classList.contains('show')) closeStockModal(); });
        stockForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitButton = stockForm.querySelector('[type="submit"]');
            if (submitButton?.disabled) return;
            if (submitButton) submitButton.disabled = true;
            try {
                const saved = await handleStockTransaction();
                if (saved) closeStockModal();
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
        const stockInOutModal = document.createElement('div');
        stockInOutModal.className = 'stock-modal';
        stockInOutModal.setAttribute('aria-hidden', 'true');
        stockInOutModal.innerHTML = `
            <div class="stock-panel" role="dialog" aria-modal="true" aria-labelledby="stockIOTitle">
                <div class="stock-panel-header">
                    <button class="stock-close-io" type="button" aria-label="Tutup">×</button>
                    <h3 id="stockIOTitle">Transaksi Stok</h3>
                </div>
                <div class="stock-body">
                    <form id="stockIOForm">
                        <div class="field-row"><label>Barang</label><select id="stockIOKodeSelect"></select></div>
                        <div class="field-row"><label>Jumlah</label><input id="stockIOQty" type="number" min="1" value="1" required /></div>
                        <div class="field-row"><label>Tanggal</label><input id="stockIODate" type="datetime-local" /></div>
                        <div class="field-row"><label>Supplier / Keperluan</label><input id="stockIOSupplier" type="text" /></div>
                        <div class="field-row"><label>Petugas</label><input id="stockIOPetugas" type="text" value="ADMIN" /></div>
                        <div class="field-row"><label>Catatan</label><textarea id="stockIOCatatan"></textarea></div>
                        <div class="stock-actions">
                            <button type="button" class="btn-secondary" id="cancelStockIO">Batal</button>
                            <button type="submit" class="btn-primary" id="submitStockIO">Simpan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(stockInOutModal);
        const stockCloseIO = stockInOutModal.querySelector('.stock-close-io');
        const cancelStockIO = stockInOutModal.querySelector('#cancelStockIO');
        const stockIOForm = stockInOutModal.querySelector('#stockIOForm');
        const stockIOKodeSelect = stockInOutModal.querySelector('#stockIOKodeSelect');


        function openStockInOutModal(mode, code) {
            stockInOutModal.classList.add('show');
            stockInOutModal.setAttribute('aria-hidden', 'false');
            const title = stockInOutModal.querySelector('#stockIOTitle');
            title.textContent = mode === 'in' ? 'Barang Masuk' : 'Barang Keluar';
            const stockList = getStockRecords();
            stockIOKodeSelect.innerHTML = stockList.map(i => `<option value="${escapeHtml(i.code)}">${escapeHtml(i.code)} — ${escapeHtml(i.name)}</option>`).join('');
            if (code) stockIOKodeSelect.value = String(code).toUpperCase();
            stockInOutModal.dataset.mode = mode;
            const dateInput = stockInOutModal.querySelector('#stockIODate');
            dateInput.value = new Date().toISOString().slice(0,16);
        }


        function closeStockInOutModal() {
            stockInOutModal.classList.remove('show');
            stockInOutModal.setAttribute('aria-hidden', 'true');
        }
        stockCloseIO.addEventListener('click', closeStockInOutModal);
        cancelStockIO.addEventListener('click', closeStockInOutModal);
        stockInOutModal.addEventListener('click', function(e) { if (e.target === stockInOutModal) closeStockInOutModal(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && stockInOutModal.classList.contains('show')) closeStockInOutModal(); });
        stockIOForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const mode = stockInOutModal.dataset.mode || 'in';
            const kode = stockIOKodeSelect.value;
            const jumlah = Number(stockInOutModal.querySelector('#stockIOQty').value || 0);
            const tanggal = stockInOutModal.querySelector('#stockIODate').value || new Date().toISOString();
            const supplier = stockInOutModal.querySelector('#stockIOSupplier').value.trim() || '';
            const petugas = stockInOutModal.querySelector('#stockIOPetugas').value.trim() || 'ADMIN';
            const catatan = stockInOutModal.querySelector('#stockIOCatatan').value.trim() || '';
            if (!kode || jumlah <= 0) { showToast('Pilih barang dan masukkan jumlah yang valid.', 'error'); return; }
            try {
                const resp = await apiRequest('getStockDetail', { kode });
                const current = resp && resp.data ? Number(resp.data.stokSaatIni || resp.data.STOK_SAAT_INI || 0) : null;
                if (mode === 'out' && current !== null && jumlah > current) {
                    if (!confirm('Jumlah keluar melebihi stok saat ini. Lanjutkan dan biarkan stok menjadi negatif?')) {
                        return;
                    }
                }
                const action = mode === 'in' ? 'stockIn' : 'stockOut';
                await apiRequest(action, { kode, jumlah, keperluan: supplier || catatan, petugas, tanggal, catatan });
                showToast('Transaksi tercatat di server.', 'success');
                await refreshStockDataFromApi();
                renderAdminDashboard();
                closeStockInOutModal();
            } catch (err) {
                console.error('stockIO error', err);
                showToast('Gagal menyimpan transaksi. Periksa koneksi API.', 'error');
            }
        });
        document.addEventListener('click', function(event) {
            const roleItem =
                event.target.closest
                    ? event.target.closest('[data-login-role]')
                    : null;
            if (!roleItem) return;
            event.preventDefault();
            event.stopPropagation();
            const role =
                roleItem.getAttribute('data-login-role') === 'admin'
                    ? 'admin'
                    : 'technician';
            openLogin(role);
            return false;
        }, true);
        document.querySelectorAll('[data-login-role]').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const role =
                    this.getAttribute('data-login-role') === 'admin'
                        ? 'admin'
                        : 'technician';
                openLogin(role);
            });
        });
        document.getElementById('logoutClientButton')?.addEventListener('click', function() {
            logoutClient();
            navigateTo('page-dashboard');
        });


        async function refreshCurrentAdminData() {
            if (!checkAdminSession()) return;
            if (!CONFIG.API_URL || CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
                window.__ADMIN_SYNC_STATE__ = { label: 'Unconfigured', text: 'API URL belum dikonfigurasi' };
                renderAdminDashboard();
                return;
            }
            window.__ADMIN_SYNC_STATE__ = { label: 'Syncing...', text: 'Mengambil data terbaru...' };
            try {
                await refreshServiceCacheFromApi();
                window.__ADMIN_SYNC_STATE__ = window.__SERVICE_CACHE_ERROR__
                    ? { label: 'Connection Error', text: 'Gagal mengambil data terbaru' }
                    : { label: 'Connected', text: 'Data tersinkronisasi' };
            } catch (error) {
                window.__ADMIN_SYNC_STATE__ = { label: 'Connection Error', text: 'Gagal mengambil data terbaru' };
                console.warn('Admin sync failed:', error);
            }
            const activePage = document.querySelector('.admin-nav-item.active')?.dataset.adminPage || 'dashboard';
            if (activePage === 'media' && isMediaAdminEditing()) {
                return;
            }
            showAdminPage(activePage, { skipStockRefresh: activePage === 'stock' });
        }


        function startAdminSyncLoop() {
            if (!isApiConfigured()) {
                window.__ADMIN_SYNC_STATE__ = { label: 'Unconfigured', text: 'Backend belum diatur.' };
                renderAdminDashboard();
                return;
            }
            refreshCurrentAdminData();
            if (window.__ADMIN_SYNC_INTERVAL__) {
                clearInterval(window.__ADMIN_SYNC_INTERVAL__);
            }
            window.__ADMIN_SYNC_INTERVAL__ = setInterval(() => {
                refreshCurrentAdminData();
            }, 60000);
        }


        function handleAdminRouteGuard() {
            const url = new URL(window.location.href);
            const params = url.searchParams;
            const directAdminHit = params.has('admin') || params.has('dashboard');
            if (isAdminLoggedIn()) {
                const saved = getSavedRolePage('admin');
                const allowed = ['dashboard', 'services', 'running', 'completed', 'customers', 'technicians', 'stock', 'locations', 'media', 'news', 'reports', 'settings'];
                if (directAdminHit || !document.querySelector('.admin-shell')) {
                    const target = allowed.includes(saved) ? saved : 'dashboard';
                    window.__LERESSAE_ADMIN_HISTORY = [target];
                    showAdminPage(target, { resetHistory: true });
                }
                return;
            }
            if (directAdminHit) {
                openLogin('admin');
            }
        }
        bindStatusLookup();
        bindAdminActions();
        renderAdminDashboard();
        renderClientDashboard();
        handleAdminRouteGuard();
        if (checkAdminSession()) {
            startAdminSyncLoop();
        }
        document.addEventListener('DOMContentLoaded', function(){
            document.querySelectorAll('.media-item .play-overlay').forEach(function(overlay){
                overlay.addEventListener('click', function(e){
                    e.stopPropagation();
                    const parentFigure = overlay.closest('.media-item');
                    if (parentFigure) parentFigure.click();
                });
            });
        });
        (function(){


            function initMediaLightbox(){
                const lightbox = document.getElementById('lightbox');
                const lightboxImg = document.getElementById('lightboxImg');
                const lightboxCaption = document.getElementById('lightboxCaption');
                const btnClose = document.getElementById('lightboxClose');
                const btnPrev = document.getElementById('lightboxPrev');
                const btnNext = document.getElementById('lightboxNext');
                if (!lightbox || !lightboxImg || !lightboxCaption) return;
                let items = [];
                let current = 0;
                let previousFocus = null;


                function getMediaItems(){
                    return Array.from(document.querySelectorAll('#publicMediaPhotoGrid .media-item, #publicMediaVideoGrid .media-item')).map(function(card){
                        const img = card.querySelector('img');
                        const vid = card.querySelector('video');
                        const frame = card.querySelector('.video-player iframe, iframe');
                        const source = vid ? (vid.currentSrc || vid.getAttribute('src') || (vid.querySelector('source') && vid.querySelector('source').getAttribute('src')) || '') : (frame ? (frame.getAttribute('src') || '') : '');
                        const isVideo = !!(vid || frame || card.classList.contains('media-video'));
                        const titleEl = card.querySelector('.title');
                        const descEl = card.querySelector('.desc');
                        return {
                            element: card,
                            type: isVideo ? 'video' : 'image',
                            src: isVideo ? source : (img ? (img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || '') : ''),
                            poster: vid ? (vid.getAttribute('poster') || '') : '',
                            alt: img ? (img.getAttribute('alt') || '') : '',
                            title: titleEl ? titleEl.textContent.trim() : '',
                            short: descEl ? descEl.textContent.trim() : '',
                            full: card.dataset.fullDesc || ''
                        };
                    }).filter(item => item.src);
                }


                function openAt(index){
                    items = getMediaItems();
                    if (!items.length) return;
                    current = (index + items.length) % items.length;
                    const item = items[current];
                    if (lightbox.getAttribute('aria-hidden') === 'true') previousFocus = document.activeElement;
                    const oldVideo = document.getElementById('lightboxVideo');
                    if (oldVideo) { try { oldVideo.pause(); } catch(e){} oldVideo.remove(); }
                    if (item.type === 'image'){
                        lightboxImg.style.display = 'block';
                        lightboxImg.src = item.src;
                        lightboxImg.alt = item.alt || item.title || 'Foto media';
                    } else {
                        document.querySelectorAll('.media-item video').forEach(video => { try { video.pause(); } catch(e){} });
                        lightboxImg.style.display = 'none';
                        const content = lightbox.querySelector('.lightbox-content');
                        const videoFrame = document.createElement('iframe');
                        videoFrame.id = 'lightboxVideo';
                        videoFrame.className = 'lightbox-video lightbox-video-frame';
                        videoFrame.src = item.src;
                        videoFrame.title = item.title || 'Video dokumentasi';
                        videoFrame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
                        videoFrame.setAttribute('allowfullscreen', '');
                        videoFrame.setAttribute('loading', 'eager');
                        videoFrame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
                        content.insertBefore(videoFrame, lightboxCaption);
                    }
                    lightboxCaption.replaceChildren();
                    const title = document.createElement('strong');
                    title.textContent = item.title || (item.type === 'video' ? 'Video' : 'Foto');
                    lightboxCaption.appendChild(title);
                    const description = item.full || item.short;
                    if (description){
                        const p = document.createElement('p');
                        p.textContent = description;
                        p.style.marginTop = '6px';
                        lightboxCaption.appendChild(p);
                    }
                    lightbox.style.display = 'flex';
                    lightbox.setAttribute('aria-hidden', 'false');
                    document.body.classList.add('leressae-lightbox-open');
                    if (btnClose) btnClose.focus({preventScroll:true});
                }


                function close(){
                    const video = document.getElementById('lightboxVideo');
                    if (video){ try { video.pause(); } catch(e){} video.removeAttribute('src'); video.load(); video.remove(); }
                    lightbox.style.display = 'none';
                    lightbox.setAttribute('aria-hidden', 'true');
                    document.body.classList.remove('leressae-lightbox-open');
                    lightboxImg.removeAttribute('src');
                    lightboxImg.style.display = '';
                    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus({preventScroll:true});
                }
                document.addEventListener('click', function(event){
                    const card = event.target.closest && event.target.closest('.media-item');
                    if (!card || !card.querySelector('img, video')) return;
                    if (event.target.closest('video') && !event.target.closest('video').paused) return;
                    const currentItems = getMediaItems();
                    const index = currentItems.findIndex(item => item.element === card);
                    if (index >= 0){ event.preventDefault(); openAt(index); }
                });
                if (btnClose) btnClose.addEventListener('click', close);
                if (btnPrev) btnPrev.addEventListener('click', function(){ openAt(current - 1); });
                if (btnNext) btnNext.addEventListener('click', function(){ openAt(current + 1); });
                lightbox.addEventListener('click', function(event){ if (event.target === lightbox) close(); });
                document.addEventListener('keydown', function(event){
                    if (lightbox.getAttribute('aria-hidden') === 'true') return;
                    if (event.key === 'Escape') close();
                    if (event.key === 'ArrowLeft') openAt(current - 1);
                    if (event.key === 'ArrowRight') openAt(current + 1);
                });
            }
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMediaLightbox);
            else initMediaLightbox();
        })();


        async function deprecatedApiRequestOverride(action, payload = {}) {
            if (!CONFIG.API_URL || CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') throw new Error('Koneksi ke server gagal. API_URL belum diatur.');
            const protectedActions = ['updateService', 'updateServiceStatus', 'addStock', 'updateStock', 'stockIn', 'stockOut', 'getLocations', 'getLocationDetail', 'uploadNewsImage', 'addNews', 'updateNews', 'deleteNews', 'publishNews'];
            const requestPayload = { ...payload };
            if (protectedActions.includes(action) && !requestPayload.token) requestPayload.token = getAdminToken();
            if (action === 'getNews' && isAdminLoggedIn() && !requestPayload.token) requestPayload.token = getAdminToken();
            const response = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ action, ...requestPayload }) });
            if (!response.ok) throw new Error('HTTP error: ' + response.status);
            const data = await response.json().catch(() => { throw new Error('Response server bukan JSON valid.'); });
            if (!data || data.success === false) throw new Error(data && data.message ? data.message : 'Request gagal.');
            return data;
        }


        async function deprecatedLoginAdminViaAPIOverride(username, password) {
            try {
                const response = await apiRequest('loginAdmin', { username: String(username || '').trim(), password: String(password || '').trim() });
                const result = response.data || {};
                if (!result.token) return { success: false, message: response.message || 'Login admin gagal.' };
                setAdminSession(true, result.username || username, result.token);
                return { success: true, message: response.message || 'Login admin berhasil.', token: result.token };
            } catch (error) { return { success: false, message: error.message || 'Gagal terhubung ke server.' }; }
        }


        async function deprecatedLoginAdminOverride(username, password) { return loginAdminViaAPI(username, password); }


        function serviceDateValue(value) {
            if (!value) return null;
            const safe = String(value).replace(' ', 'T');
            const date = new Date(safe);
            return Number.isNaN(date.getTime()) ? null : date;
        }


        function deprecatedApplyPeriodFilterOverride(records, period, dateField, customStart, customEnd) {
            if (period === 'all' || !period) return records;
            const now = new Date(); let start;
            if (period === 'custom') {
                start = serviceDateValue(customStart); const end = serviceDateValue(customEnd);
                return records.filter(item => { const d = serviceDateValue(item[dateField]); return d && (!start || d >= start) && (!end || d <= end); });
            }
            start = new Date(now); start.setHours(0, 0, 0, 0);
            if (period === 'this_week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
            if (period === '1_month') start.setMonth(start.getMonth() - 1);
            if (period === '6_month') start.setMonth(start.getMonth() - 6);
            if (period === '1_year') start.setFullYear(start.getFullYear() - 1);
            return records.filter(item => { const d = serviceDateValue(item[dateField]); return d && d >= start && d <= now; });
        }


        function deprecatedGetAdminMenuMetaOverride() {
            const menu = {
                dashboard: { label: 'Dashboard', iconSvg: '▦' }, services: { label: 'Data Servis', iconSvg: '☷' }, running: { label: 'Servis Berjalan', iconSvg: '◷' }, completed: { label: 'Servis Selesai', iconSvg: '✓' }, customers: { label: 'Pelanggan', iconSvg: '♙' }, stock: { label: 'Stock Flow', iconSvg: '▣' }, locations: { label: 'Lokasi Servis', iconSvg: '⌖' }, news: { label: 'Update Berita', iconSvg: '▤' }, reports: { label: 'Laporan', iconSvg: '▥' }, settings: { label: 'Pengaturan', iconSvg: '⚙' }
            };
            Object.values(menu).forEach(item => item.iconSvg = '<span class="admin-nav-icon" aria-hidden="true">' + item.iconSvg + '</span>');
            return menu;
        }


        function parseLocationDateValue(value) {
            if (!value) return null;
            const raw = String(value).trim();
            if (!raw) return null;
            const localMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
            if (localMatch) {
                const [, day, month, year, hour = '0', minute = '0', second = '0'] = localMatch;
                return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
            }
            const normalized = raw.includes('T') || raw.includes(' ') ? raw : raw + 'T00:00:00+07:00';
            const date = new Date(normalized);
            if (Number.isNaN(date.getTime())) return null;
            return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        }


        function applyLocationDateFilter(records, period, customStart = '', customEnd = '') {
            if (!Array.isArray(records)) return [];
            if (!period || period === 'all') return records;
            const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            if (period === 'custom') {
                const startDate = customStart ? new Date(customStart + 'T00:00:00+07:00') : null;
                const endDate = customEnd ? new Date(customEnd + 'T23:59:59+07:00') : null;
                return records.filter(item => {
                    const itemDate = parseLocationDateValue(item.date || item.created_at || item.tanggal || item.timestamp || item.createdAt);
                    if (!itemDate) return false;
                    const meetsStart = !startDate || itemDate >= startDate;
                    const meetsEnd = !endDate || itemDate <= endDate;
                    return meetsStart && meetsEnd;
                });
            }
            const start = new Date(nowJakarta);
            if (period === 'today') {
                start.setHours(0, 0, 0, 0);
            } else if (period === 'this_week') {
                const day = (nowJakarta.getDay() + 6) % 7;
                start.setDate(nowJakarta.getDate() - day);
                start.setHours(0, 0, 0, 0);
            } else if (period === '1_month') {
                start.setMonth(nowJakarta.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
            } else if (period === '6_month') {
                start.setMonth(nowJakarta.getMonth() - 6);
                start.setHours(0, 0, 0, 0);
            } else if (period === '1_year') {
                start.setFullYear(nowJakarta.getFullYear() - 1);
                start.setHours(0, 0, 0, 0);
            } else {
                return records;
            }
            return records.filter(item => {
                const itemDate = parseLocationDateValue(item.date || item.created_at || item.tanggal || item.timestamp || item.createdAt);
                if (!itemDate) return false;
                return itemDate >= start && itemDate <= nowJakarta;
            });
        }


        function renderLocationsPage() {
            const all = Array.isArray(window.__LOCATIONS_CACHE__) ? window.__LOCATIONS_CACHE__ : [];
            const isLoading = Boolean(window.__LOCATIONS_LOADING__);
            const period = window.__LOCATION_FILTER_PERIOD__ || 'all';
            const keyword = (window.__LOCATION_FILTER__ || '').trim().toLowerCase();
            const customFrom = window.__LOCATION_FILTER_CUSTOM_FROM__ || '';
            const customTo = window.__LOCATION_FILTER_CUSTOM_TO__ || '';
            const filteredByPeriod = applyLocationDateFilter(all, period, customFrom, customTo);
            const rows = filteredByPeriod.filter(x => !keyword || [x.name, x.address, x.phone].some(v => String(v || '').toLowerCase().includes(keyword)));
            const customVisible = period === 'custom';
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>Lokasi Servis</h3>
                        ${isLoading ? '<span class="admin-user-chip" aria-live="polite">Memuat lokasi…</span>' : ''}
                    </div>
                    <div class="admin-service-filter-bar" style="margin-bottom:12px;">
                        <div class="admin-service-filter-group">
                            <label style="font-weight:700; white-space:nowrap;">Periode:</label>
                            <select id="locationDateFilter" class="admin-service-period-select" aria-label="Filter tanggal lokasi servis">
                                <option value="all" ${period === 'all' ? 'selected' : ''}>Semua</option>
                                <option value="today" ${period === 'today' ? 'selected' : ''}>Hari Ini</option>
                                <option value="this_week" ${period === 'this_week' ? 'selected' : ''}>1 Minggu</option>
                                <option value="1_month" ${period === '1_month' ? 'selected' : ''}>1 Bulan</option>
                                <option value="6_month" ${period === '6_month' ? 'selected' : ''}>6 Bulan</option>
                                <option value="1_year" ${period === '1_year' ? 'selected' : ''}>1 Tahun</option>
                                <option value="custom" ${period === 'custom' ? 'selected' : ''}>Custom</option>
                            </select>
                        </div>
                        <input id="locationSearch" class="admin-service-search-input" placeholder="Cari nama, alamat, WhatsApp" value="${escapeHtml(window.__LOCATION_FILTER__ || '')}" />
                        <span class="admin-user-chip admin-service-total">Total: ${rows.length}</span>
                    </div>
                    ${customVisible ? `
                        <div class="admin-service-filter-bar" style="margin-bottom:16px; gap:12px; flex-wrap:wrap;">
                            <div class="admin-service-filter-group" style="flex:1 1 180px; min-width:180px;">
                                <label style="font-weight:700; white-space:nowrap;">Dari:</label>
                                <input id="locationDateFrom" type="date" class="admin-service-period-select" value="${escapeHtml(customFrom)}" style="width:100%; min-width:150px;" />
                            </div>
                            <div class="admin-service-filter-group" style="flex:1 1 180px; min-width:180px;">
                                <label style="font-weight:700; white-space:nowrap;">Sampai:</label>
                                <input id="locationDateTo" type="date" class="admin-service-period-select" value="${escapeHtml(customTo)}" style="width:100%; min-width:150px;" />
                            </div>
                        </div>
                    ` : ''}
                    <div class="admin-table-wrap" style="margin-top:16px">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>WhatsApp</th>
                                    <th>Nama</th>
                                    <th>Alamat</th>
                                    <th>Google Maps</th>
                                    <th>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.length ? rows.map(x => `
                                    <tr>
                                        <td>${escapeHtml(formatDate(x.date))}</td>
                                        <td>${escapeHtml(x.phone)}</td>
                                        <td>${escapeHtml(x.name)}</td>
                                        <td>${escapeHtml(x.address)}</td>
                                        <td>${x.mapsUrl ? `<a href="${escapeHtml(x.mapsUrl)}" target="_blank" rel="noopener noreferrer">Buka peta</a>` : '-'}</td>
                                        <td>${escapeHtml(x.notes || '-')}</td>
                                    </tr>
                                `).join('') : `<tr><td colspan="6"><div class="admin-empty-state">${isLoading ? 'Memuat data lokasi servis…' : 'Belum ada data lokasi servis pada periode ini.'}</div></td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }


        function getMediaFallbackRecords() {
            return [];
        }


        function readFileAsDataUrl(file) {
            return new Promise((resolve, reject) => {
                if (!file) {
                    reject(new Error('File tidak dipilih.'));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('File gagal dibaca oleh browser.'));
                reader.readAsDataURL(file);
            });
        }


        async function uploadLeressaeFileToDrive(file, purpose, mediaType, metadata = {}) {
            if (!file || !file.size) {
                throw new Error('File tidak dipilih.');
            }
            const maxBytes = purpose === 'MEDIA' && String(mediaType).toUpperCase() === 'VIDEO'
                ? 25 * 1024 * 1024
                : 10 * 1024 * 1024;
            if (file.size > maxBytes) {
                const maxMb = Math.round(maxBytes / (1024 * 1024));
                throw new Error(`Ukuran file terlalu besar. Maksimal ${maxMb} MB untuk ${String(mediaType || 'file').toLowerCase()}.`);
            }
            const dataUrl = await readFileAsDataUrl(file);
            const response = await apiRequest('uploadFileToDrive', {
                purpose: purpose,
                mediaType: mediaType,
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                dataUrl: dataUrl,
                JUDUL: String(metadata.JUDUL || metadata.judul || '').trim(),
                DESKRIPSI: String(metadata.DESKRIPSI || metadata.deskripsi || '').trim(),
                rootFolderId: CONFIG.GOOGLE_DRIVE_ROOT_FOLDER_ID,
                token: getAdminToken()
            });
            const result = response && response.data ? response.data : {};
            const fileUrl = result.fileUrl || result.imageUrl || result.webViewUrl || '';
            const thumbnailUrl = result.thumbnailUrl || fileUrl;
            if (!fileUrl) {
                throw new Error('Upload berhasil diproses, tetapi URL Google Drive tidak dikembalikan oleh server.');
            }
            return {
                fileId: result.fileId || '',
                fileName: result.fileName || file.name,
                fileUrl: fileUrl,
                thumbnailUrl: thumbnailUrl,
                mimeType: result.mimeType || file.type || '',
                folderId: result.folderId || ''
            };
        }
        const MEDIA_META_MARKER = '[[LERESSAE_MEDIA_V2]]';


        function encodeMediaLegacyMetadata(judul, deskripsi) {
            return MEDIA_META_MARKER + JSON.stringify({
                judul: String(judul || '').trim(),
                deskripsi: String(deskripsi || '').trim()
            });
        }


        function decodeMediaLegacyMetadata(value) {
            const text = String(value || '');
            const index = text.indexOf(MEDIA_META_MARKER);
            if (index === -1) return null;
            try {
                const parsed = JSON.parse(text.slice(index + MEDIA_META_MARKER.length));
                if (!parsed || typeof parsed !== 'object') return null;
                return {
                    judul: String(parsed.judul || '').trim(),
                    deskripsi: String(parsed.deskripsi || '').trim()
                };
            } catch (error) {
                return null;
            }
        }


        function normalizeMediaResponseRows(headers, rows) {
            if (!Array.isArray(headers) || !Array.isArray(rows)) return [];
            const normalizedHeaders = headers.map(h => String(h ?? '').trim());
            return rows.filter(row => Array.isArray(row)).map(row => {
                const obj = {};
                normalizedHeaders.forEach((header, index) => {
                    if (header) obj[header] = row[index] ?? '';
                });
                return obj;
            });
        }


        function extractMediaRecordsFromResponse(response) {
            const data = response && response.data !== undefined ? response.data : response;
            const candidates = [
                data, data && data.records, data && data.media, data && data.items,
                data && data.data, data && data.result, response && response.records,
                response && response.media, response && response.items
            ];
            for (const candidate of candidates) {
                if (Array.isArray(candidate)) return candidate.filter(Boolean);
                if (candidate && typeof candidate === 'object') {
                    const headers = candidate.headers || candidate.header || candidate.columns;
                    const rows = candidate.rows || candidate.values;
                    if (Array.isArray(headers) && Array.isArray(rows)) {
                        return normalizeMediaResponseRows(headers, rows);
                    }
                }
            }
            const headers = response?.headers || response?.header || response?.columns;
            const rows = response?.rows || response?.values;
            if (Array.isArray(headers) && Array.isArray(rows)) {
                return normalizeMediaResponseRows(headers, rows);
            }
            return [];
        }


        function normalizeMediaRecord(raw, fallback = {}) {
            const item = raw && typeof raw === 'object' ? raw : {};
            const fileUrl = item.FILE_URL || item.fileUrl || item.imageUrl || item.url || fallback.FILE_URL || '';
            const fileId = item.FILE_ID || item.fileId || item.file_id || fallback.FILE_ID || extractDriveFileIdFromUrl(fileUrl);
            const rawKeterangan = item.KETERANGAN ?? item.keterangan ?? fallback.KETERANGAN ?? '';
            const legacyMeta = decodeMediaLegacyMetadata(rawKeterangan);
            const explicitJudul = item.JUDUL ?? item.judul ?? item.TITLE ?? item.title ?? item.MEDIA_TITLE ?? item.media_title;
            const explicitDeskripsi = item.DESKRIPSI ?? item.deskripsi ?? item.DESCRIPTION ?? item.description ?? item.MEDIA_DESCRIPTION ?? item.media_description;
            const judulValue = explicitJudul != null && String(explicitJudul).trim() !== ''
                ? String(explicitJudul).trim()
                : (legacyMeta?.judul || String(fallback.JUDUL || '').trim());
            const deskripsiValue = explicitDeskripsi != null && String(explicitDeskripsi).trim() !== ''
                ? String(explicitDeskripsi).trim()
                : (legacyMeta?.deskripsi || String(fallback.DESKRIPSI || '').trim());
            return {
                ...fallback,
                ...item,
                ID_MEDIA: item.ID_MEDIA || item.id_media || item.id || fallback.ID_MEDIA || '',
                TYPE: String(item.TYPE || item.type || fallback.TYPE || 'FOTO').toUpperCase(),
                FILE_ID: fileId,
                FILE_URL: fileUrl,
                THUMBNAIL_URL: item.THUMBNAIL_URL || item.thumbnailUrl || item.thumbnail_url || fallback.THUMBNAIL_URL ||
                    (fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200` : fileUrl),
                JUDUL: judulValue,
                DESKRIPSI: deskripsiValue,
                KETERANGAN: legacyMeta ? legacyMeta.deskripsi : String(rawKeterangan || '').trim(),
                STATUS: String(item.STATUS || item.status || fallback.STATUS || 'AKTIF').toUpperCase(),
                CREATED_AT: item.CREATED_AT || item.createdAt || item.created_at || fallback.CREATED_AT || new Date().toISOString(),
                UPDATED_AT: item.UPDATED_AT || item.updatedAt || item.updated_at || fallback.UPDATED_AT || new Date().toISOString(),
                FILE_NAME: item.FILE_NAME || item.fileName || item.file_name || fallback.FILE_NAME || '',
                MIME_TYPE: item.MIME_TYPE || item.mimeType || item.mime_type || fallback.MIME_TYPE || ''
            };
        }


        function extractDriveFileIdFromUrl(url) {
            const value = String(url || '').trim();
            if (!value) return '';
            const match = value.match(/(?:\/d\/|[?&]id=|\/file\/d\/)([a-zA-Z0-9_-]{10,})/);
            return match ? match[1] : '';
        }


        function mediaImageViewUrl(item) {
            if (!item) return '';
            const fileUrl = item.FILE_URL || item.fileUrl || item.file_url || item.URL || item.url || item.LINK || item.link || '';
            const thumbnail = item.THUMBNAIL_URL || item.thumbnailUrl || item.thumbnail_url || item.IMAGE_URL || item.imageUrl || item.image_url || '';
            const fileId = String(item.FILE_ID || item.fileId || item.file_id || item.ID_FILE || item.idFile || extractDriveFileIdFromUrl(fileUrl) || extractDriveFileIdFromUrl(thumbnail) || '').trim();
            if (fileId) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1600';
            return String(thumbnail || fileUrl || '');
        }


        function mediaDrivePreviewUrl(item) {
            const fileUrl = item && (item.FILE_URL || item.fileUrl || item.file_url || item.URL || item.url || item.LINK || item.link) || '';
            const fileId = String(item && (item.FILE_ID || item.fileId || item.file_id || item.ID_FILE || item.idFile) || extractDriveFileIdFromUrl(fileUrl) || '').trim();
            return fileId
                ? 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/preview'
                : String(fileUrl || '');
        }


        function mountMediaFormToBody(form) {
            if (!form) return;
            if (!form.__mediaOriginalParent) {
                form.__mediaOriginalParent = form.parentNode;
                form.__mediaOriginalNextSibling = form.nextSibling;
            }
            if (form.parentNode !== document.body) {
                document.body.appendChild(form);
            }
        }


        function restoreMediaForm(form) {
            if (!form) return;
            const parent = form.__mediaOriginalParent;
            const next = form.__mediaOriginalNextSibling;
            if (parent && parent.isConnected) {
                if (next && next.parentNode === parent) parent.insertBefore(form, next);
                else parent.appendChild(form);
            }
            form.__mediaOriginalParent = null;
            form.__mediaOriginalNextSibling = null;
        }


        function removeMediaFormFromBody(form) {
            if (!form) return;
            if (form.parentNode === document.body) form.remove();
            form.__mediaOriginalParent = null;
            form.__mediaOriginalNextSibling = null;
        }


        function isMediaAdminEditing() {
            if (window.__ADMIN_MEDIA_FORM_BUSY__) return true;
            const forms = document.querySelectorAll('.media-admin-form');
            for (const form of forms) {
                const visible = form && getComputedStyle(form).display !== 'none';
                if (visible && (
                    form.dataset.mode === 'edit' ||
                    form.dataset.mode === 'add' ||
                    form.querySelector('input[name="judul"]')?.value ||
                    form.querySelector('textarea[name="deskripsi"]')?.value
                )) {
                    return true;
                }
            }
            return false;
        }


        async function loadMediaFromApi(options = {}) {
            if (!isApiConfigured()) return false;
            const stayOnAdminMedia = options.stayOnAdminMedia !== false;
            try {
                const response = await apiRequest('getMedia');
                const previousRecords = getMediaRecords();
                const previousById = new Map(previousRecords.map(item => [String(item.ID_MEDIA || ''), item]));
                const records = extractMediaRecordsFromResponse(response).map(item => {
                    const previous = previousById.get(String(item.ID_MEDIA || item.id_media || item.id || ''));
                    const normalized = normalizeMediaRecord(item, previous || {});
                    const hasExplicitTitle = ['JUDUL','judul','TITLE','title','MEDIA_TITLE','media_title']
                        .some(key => Object.prototype.hasOwnProperty.call(item, key) && String(item[key] ?? '').trim() !== '');
                    const hasExplicitDescription = ['DESKRIPSI','deskripsi','DESCRIPTION','description','MEDIA_DESCRIPTION','media_description']
                        .some(key => Object.prototype.hasOwnProperty.call(item, key) && String(item[key] ?? '').trim() !== '');
                    if (previous) {
                        if (!hasExplicitTitle && previous.JUDUL) normalized.JUDUL = previous.JUDUL;
                        if (!hasExplicitDescription && previous.DESKRIPSI) normalized.DESKRIPSI = previous.DESKRIPSI;
                    }
                    return normalized;
                });
                if (records.length || response?.success === true) {
                    saveMediaRecords(records);
                    renderPublicMediaGallery();
                    if (
                        stayOnAdminMedia &&
                        isAdminLoggedIn() &&
                        window.__ADMIN_CURRENT_PAGE__ === 'media' &&
                        !isMediaAdminEditing()
                    ) {
                        showAdminPage('media');
                    }
                    return true;
                }
                return false;
            } catch (error) {
                console.warn('Gagal memuat media dari backend:', error);
                return false;
            }
        }


        async function refreshMediaFromBackend() {
            const response = await apiRequest('getMedia');
            const previousRecords = getMediaRecords();
            const previousById = new Map(previousRecords.map(item => [String(item.ID_MEDIA || ''), item]));
            const records = extractMediaRecordsFromResponse(response).map(item => {
                const previous = previousById.get(String(item.ID_MEDIA || item.id_media || item.id || ''));
                const normalized = normalizeMediaRecord(item, previous || {});
                const hasExplicitTitle = ['JUDUL','judul','TITLE','title','MEDIA_TITLE','media_title']
                    .some(key => Object.prototype.hasOwnProperty.call(item, key) && String(item[key] ?? '').trim() !== '');
                const hasExplicitDescription = ['DESKRIPSI','deskripsi','DESCRIPTION','description','MEDIA_DESCRIPTION','media_description']
                    .some(key => Object.prototype.hasOwnProperty.call(item, key) && String(item[key] ?? '').trim() !== '');
                if (previous) {
                    if (!hasExplicitTitle && previous.JUDUL) normalized.JUDUL = previous.JUDUL;
                    if (!hasExplicitDescription && previous.DESKRIPSI) normalized.DESKRIPSI = previous.DESKRIPSI;
                }
                return normalized;
            });
            saveMediaRecords(records);
            renderPublicMediaGallery();
            return records;
        }


        function getMediaRecords() {
            const saved = localStorage.getItem(STORAGE_KEYS.media);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length) {
                        window.__MEDIA_CACHE__ = parsed;
                        return parsed;
                    }
                } catch (error) {
                    console.warn('Media cache invalid:', error);
                }
            }
            const empty = [];
            saveMediaRecords(empty);
            return empty;
        }


        function saveMediaRecords(records) {
            const value = Array.isArray(records) ? records : [];
            window.__MEDIA_CACHE__ = value;
            try {
                localStorage.setItem(STORAGE_KEYS.media, JSON.stringify(value));
            } catch (error) {
                console.warn('Local media storage unavailable:', error);
            }
            return value;
        }


        function migrateMediaTitleDescriptionCache() {
            const saved = localStorage.getItem(STORAGE_KEYS.media);
            if (!saved) return;
            try {
                const records = JSON.parse(saved);
                if (!Array.isArray(records)) return;
                const migrated = records.map(item => {
                    const copy = { ...item };
                    const legacyMeta = decodeMediaLegacyMetadata(copy.KETERANGAN);
                    if (!copy.JUDUL) copy.JUDUL = legacyMeta?.judul || '';
                    if (!copy.DESKRIPSI) copy.DESKRIPSI = legacyMeta?.deskripsi || '';
                    if (legacyMeta) copy.KETERANGAN = legacyMeta.deskripsi;
                    return copy;
                });
                saveMediaRecords(migrated);
            } catch (error) {
                console.warn('Media title/description migration skipped:', error);
            }
        }


        function renderPublicMediaGallery() {
            const all = getMediaRecords();
            const photos = all.filter(item => String(item.TYPE || '').toUpperCase() === 'FOTO' && String(item.STATUS || '').toUpperCase() === 'AKTIF');
            const videos = all.filter(item => String(item.TYPE || '').toUpperCase() === 'VIDEO' && String(item.STATUS || '').toUpperCase() === 'AKTIF');
            const photoHost = document.getElementById('publicMediaPhotoGrid');
            const videoHost = document.getElementById('publicMediaVideoGrid');
            if (photoHost) {
                photoHost.innerHTML = photos.length ? photos.map(item => `
                    <figure class="media-item" data-full-desc="${escapeHtml(item.DESKRIPSI || '')}">
                        <img src="${escapeHtml(mediaImageViewUrl(item))}" data-fallback="${escapeHtml(item.THUMBNAIL_URL || '')}" alt="${escapeHtml(item.JUDUL || 'Dokumentasi foto')}" onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback}else{this.style.display='none'}" />
                        <figcaption>
                            <div class="title">${escapeHtml(item.JUDUL || 'Judul belum diisi')}</div>
                            <div class="desc">${escapeHtml(item.DESKRIPSI || 'Deskripsi belum diisi')}</div>
                        </figcaption>
                    </figure>
                `).join('') : '<div class="admin-empty-state">Dokumentasi foto belum tersedia.</div>';
            }
            if (videoHost) {
                videoHost.innerHTML = videos.length ? videos.map(item => `
                    <figure class="media-item media-video" data-full-desc="${escapeHtml(item.DESKRIPSI || '')}">
                        <div class="video-player" style="width:100%; aspect-ratio:16 / 9;">
                            <iframe src="${escapeHtml(mediaDrivePreviewUrl(item))}" title="${escapeHtml(item.JUDUL || item.FILE_NAME || 'Video dokumentasi')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" style="width:100%; height:100%; border:0; border-radius:12px; background:#111827;"></iframe>
                        </div>
                        <figcaption>
                            <div class="title">${escapeHtml(item.JUDUL || 'Judul belum diisi')}</div>
                            <div class="desc">${escapeHtml(item.DESKRIPSI || 'Deskripsi belum diisi')}</div>
                        </figcaption>
                    </figure>
                `).join('') : '<div class="admin-empty-state">Dokumentasi video belum tersedia.</div>';
            }
            renderHomeMediaSlideshow();
        }
        let homeMediaTimer = null;


        function renderHomeMediaSlideshow() {
            const section = document.getElementById('homeMediaSpotlight');
            const host = section && section.querySelector('.home-media-content');
            if (!host) return;
            if (homeMediaTimer) { clearInterval(homeMediaTimer); homeMediaTimer = null; }
            if (section.__cleanupMedia) { section.__cleanupMedia(); section.__cleanupMedia = null; }
            let photos = [];
            try { photos = getMediaRecords().filter(item => String(item.TYPE || '').toUpperCase() === 'FOTO' && String(item.STATUS || '').toUpperCase() === 'AKTIF' && mediaImageViewUrl(item)); } catch (e) { console.warn('Gagal memuat sorotan media:', e); }
            if (!photos.length) { host.innerHTML = '<div class="home-media-empty"><div><strong>Dokumentasi foto belum tersedia.</strong><br><span>Foto yang berstatus aktif akan tampil otomatis di sini.</span></div></div>'; return; }
            host.innerHTML = `<div class="home-media-stage" aria-roledescription="carousel" aria-label="Sorotan foto dokumentasi"><div class="home-media-track">${photos.map((item, i) => `<article class="home-media-slide" aria-hidden="${i < 3 ? 'false' : 'true'}"><img src="${escapeHtml(mediaImageViewUrl(item))}" alt="${escapeHtml(item.JUDUL || 'Dokumentasi kegiatan LERESSAE')}" loading="${i < 3 ? 'eager' : 'lazy'}" onerror="this.onerror=null;this.closest('.home-media-slide')?.classList.add('image-unavailable');this.alt='Gambar tidak dapat dimuat. Periksa URL dan izin akses Google Drive.'"><div class="home-media-caption"><h3>${escapeHtml(item.JUDUL || 'Dokumentasi kegiatan')}</h3><p>${escapeHtml(item.DESKRIPSI || 'Dokumentasi kegiatan praktik dan kolaborasi LERESSAE.')}</p></div></article>`).join('')}</div></div><div class="home-media-tools"><div class="home-media-dots" aria-label="Pilih foto">${photos.map((_,i)=>`<button type="button" class="home-media-dot${i===0?' is-active':''}" data-home-media-go="${i}" aria-label="Tampilkan foto ${i+1}" aria-current="${i===0?'true':'false'}"></button>`).join('')}</div><div class="home-media-actions"><button type="button" class="home-media-arrow" data-home-media-step="-1" aria-label="Foto sebelumnya">‹</button><button type="button" class="home-media-arrow" data-home-media-step="1" aria-label="Foto berikutnya">›</button></div></div>`;
            const slides = Array.from(host.querySelectorAll('.home-media-slide'));
            const dots = Array.from(host.querySelectorAll('[data-home-media-go]'));
            let index = 0;
            const track = host.querySelector('.home-media-track');
            const visibleCount = () => window.matchMedia('(max-width: 600px)').matches ? 1 : (window.matchMedia('(max-width: 900px)').matches ? 2 : 3);
            const update = next => {
                const maxIndex = Math.max(0, slides.length - visibleCount());
                index = maxIndex === 0 ? 0 : Math.max(0, Math.min(next, maxIndex));
                const firstSlide = slides[0];
                const step = firstSlide ? firstSlide.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 0) : 0;
                if (track) track.style.transform = `translateX(${-index * step}px)`;
                slides.forEach((slide,i) => slide.setAttribute('aria-hidden', (i >= index && i < index + visibleCount()) ? 'false' : 'true'));
                dots.forEach((dot,i) => { const active = i === index; dot.classList.toggle('is-active',active); dot.setAttribute('aria-current',active?'true':'false'); });
            };
            const pause = () => { if (homeMediaTimer) clearInterval(homeMediaTimer); homeMediaTimer = null; };
            const start = () => { pause(); if (slides.length > visibleCount() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) homeMediaTimer = setInterval(() => { const maxIndex = Math.max(0, slides.length - visibleCount()); update(index >= maxIndex ? 0 : index + 1); }, 2500); };
            const onClick = e => { const target = e.target.closest('[data-home-media-step], [data-home-media-go]'); if (!target) return; if (target.hasAttribute('data-home-media-step')) update(index + Number(target.dataset.homeMediaStep)); else update(Number(target.dataset.homeMediaGo)); start(); };
            let gestureStartX = 0, gestureStartY = 0, gestureLastX = 0, gesturePointerId = null, gestureMoved = false;
            const onPointerDown = e => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (e.target.closest('button, a, input, textarea, select')) return;
                gestureStartX = gestureLastX = e.clientX; gestureStartY = e.clientY;
                gesturePointerId = e.pointerId; gestureMoved = false; pause();
                if (e.pointerType === 'mouse') track.style.cursor = 'grabbing';
            };
            const onPointerMove = e => {
                if (gesturePointerId !== e.pointerId) return;
                const dx = e.clientX - gestureStartX, dy = e.clientY - gestureStartY;
                if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) gestureMoved = true;
                gestureLastX = e.clientX;
            };
            const onPointerEnd = e => {
                if (gesturePointerId !== e.pointerId) return;
                const dx = gestureLastX - gestureStartX, dy = e.clientY - gestureStartY;
                if (gestureMoved && Math.abs(dx) >= 35 && Math.abs(dx) > Math.abs(dy)) {
                    const maxIndex = Math.max(0, slides.length - visibleCount());
                    update(dx < 0 ? (index >= maxIndex ? 0 : index + 1) : (index <= 0 ? maxIndex : index - 1));
                }
                gesturePointerId = null; track.style.cursor = '';
                if (gestureMoved) { section.dataset.suppressMediaClick = 'true'; setTimeout(() => delete section.dataset.suppressMediaClick, 0); }
                start();
            };
            const onWheel = e => {
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
                if (Math.abs(delta) < 18) return;
                e.preventDefault(); const maxIndex = Math.max(0, slides.length - visibleCount());
                update(delta > 0 ? (index >= maxIndex ? 0 : index + 1) : (index <= 0 ? maxIndex : index - 1)); start();
            };
            const onClickGuard = e => { if (section.dataset.suppressMediaClick === 'true') { e.preventDefault(); e.stopPropagation(); delete section.dataset.suppressMediaClick; } };
            track.style.touchAction = 'pan-y'; track.style.cursor = 'grab';
            track.addEventListener('pointerdown', onPointerDown); track.addEventListener('pointermove', onPointerMove);
            track.addEventListener('pointerup', onPointerEnd); track.addEventListener('pointercancel', onPointerEnd);
            section.addEventListener('wheel', onWheel, {passive:false}); section.addEventListener('click', onClickGuard, true);
            window.addEventListener('resize', () => update(index));
            section.addEventListener('click',onClick); section.addEventListener('mouseenter',pause); section.addEventListener('mouseleave',start); section.addEventListener('focusin',pause); section.addEventListener('focusout',e=>{if(!section.contains(e.relatedTarget))start();});
            section.__cleanupMedia = () => {
                pause(); section.removeEventListener('click',onClick); section.removeEventListener('click',onClickGuard,true);
                track.removeEventListener('pointerdown',onPointerDown); track.removeEventListener('pointermove',onPointerMove);
                track.removeEventListener('pointerup',onPointerEnd); track.removeEventListener('pointercancel',onPointerEnd);
                section.removeEventListener('wheel',onWheel); track.style.touchAction=''; track.style.cursor='';
                section.removeEventListener('mouseenter',pause); section.removeEventListener('mouseleave',start); section.removeEventListener('focusin',pause);
            };
            start();
        }


        function renderMediaPage() {
            const records = getMediaRecords();
            const photos = records.filter(item => String(item.TYPE || '').toUpperCase() === 'FOTO');
            const videos = records.filter(item => String(item.TYPE || '').toUpperCase() === 'VIDEO');
            return `
                <div class="admin-card">
                    <div class="admin-card-header">
                        <h3>Update Media</h3>
                        <p class="section-sub-text" style="margin:6px 0 0;">
                            File yang diupload Admin disimpan ke Google Drive melalui Google Apps Script.
                        </p>
                    </div>
                    <div class="admin-media-layout" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
                        <div class="admin-media-panel" style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#fff;">
                            <div class="admin-card-header" style="padding:0 0 12px; margin-bottom:12px; border-bottom:1px solid #eef2f7;">
                                <h3 style="margin:0;">FOTO</h3>
                                <button type="button" class="btn-primary" data-media-action="add" data-media-type="FOTO">+ Tambah Foto</button>
                            </div>
                            <form id="mediaPhotoForm" class="media-admin-form" data-media-type="FOTO" style="display:none;">
                                <div class="media-modal-header"><h3 class="media-modal-title">Tambah Foto</h3><button type="button" class="media-modal-close" data-media-cancel="FOTO" aria-label="Tutup">×</button></div>
                                <div class="field-row"><label>Upload Foto</label><input type="file" accept="image/*" name="file" /></div>
                                <div class="field-row"><label>Judul</label><input type="text" name="judul" placeholder="Judul foto" autocomplete="off" /></div>
                                <div class="field-row"><label>Deskripsi</label><textarea name="deskripsi" rows="3" placeholder="Deskripsi foto"></textarea></div>
                                <div class="field-row"><label>Status</label><select name="status"><option value="AKTIF">Aktif</option><option value="NONAKTIF">Nonaktif</option></select></div>
                                <div class="stock-actions">
                                    <button type="button" class="btn-secondary" data-media-cancel="FOTO">Batal</button>
                                    <button type="submit" class="btn-primary">Simpan Foto</button>
                                </div>
                            </form>
                            <div class="admin-table-wrap">
                                <table class="admin-table">
                                    <thead>
                                        <tr><th>Preview</th><th>Judul</th><th>Deskripsi</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr>
                                    </thead>
                                    <tbody>
                                        ${photos.length ? photos.map(item => `
                                            <tr>
                                                <td><img src="${escapeHtml(mediaImageViewUrl(item))}" data-fallback="${escapeHtml(item.THUMBNAIL_URL || '')}" alt="${escapeHtml(item.KETERANGAN || 'Foto')}" style="width:68px;height:52px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;" onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback}else{this.style.display='none'}" /></td>
                                                <td>${escapeHtml(item.JUDUL || '-')}</td>
                                                <td>${escapeHtml(item.DESKRIPSI || '-')}</td>
                                                <td><span class="status-badge ${String(item.STATUS || 'AKTIF').toUpperCase() === 'AKTIF' ? 'done' : 'pending'}">${escapeHtml(item.STATUS || 'AKTIF')}</span></td>
                                                <td>${escapeHtml(formatDate(item.CREATED_AT || item.UPDATED_AT))}</td>
                                                <td>
                                                    <div class="admin-action-stack">
                                                        <button class="btn-secondary small" type="button" data-media-action="edit" data-media-type="FOTO" data-media-id="${escapeHtml(item.ID_MEDIA || '')}">Edit</button>
                                                        <button class="save-status-btn" type="button" data-media-action="delete" data-media-type="FOTO" data-media-id="${escapeHtml(item.ID_MEDIA || '')}">Hapus</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="6"><div class="admin-empty-state">Belum ada foto.</div></td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="admin-media-panel" style="border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#fff;">
                            <div class="admin-card-header" style="padding:0 0 12px; margin-bottom:12px; border-bottom:1px solid #eef2f7;">
                                <h3 style="margin:0;">VIDEO</h3>
                                <button type="button" class="btn-primary" data-media-action="add" data-media-type="VIDEO">+ Tambah Video</button>
                            </div>
                            <form id="mediaVideoForm" class="media-admin-form" data-media-type="VIDEO" style="display:none;">
                                <div class="media-modal-header"><h3 class="media-modal-title">Tambah Video</h3><button type="button" class="media-modal-close" data-media-cancel="VIDEO" aria-label="Tutup">×</button></div>
                                <div class="field-row"><label>Upload Video</label><input type="file" accept="video/*" name="file" /></div>
                                <div class="field-row"><label>Judul</label><input type="text" name="judul" placeholder="Judul video" autocomplete="off" /></div>
                                <div class="field-row"><label>Deskripsi</label><textarea name="deskripsi" rows="3" placeholder="Deskripsi video"></textarea></div>
                                <div class="field-row"><label>Status</label><select name="status"><option value="AKTIF">Aktif</option><option value="NONAKTIF">Nonaktif</option></select></div>
                                <div class="stock-actions">
                                    <button type="button" class="btn-secondary" data-media-cancel="VIDEO">Batal</button>
                                    <button type="submit" class="btn-primary">Simpan Video</button>
                                </div>
                            </form>
                            <div class="admin-table-wrap">
                                <table class="admin-table">
                                    <thead>
                                        <tr><th>Preview</th><th>Judul</th><th>Deskripsi</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr>
                                    </thead>
                                    <tbody>
                                        ${videos.length ? videos.map(item => `
                                            <tr>
                                                <td><iframe src="${escapeHtml(mediaDrivePreviewUrl(item))}" title="Pratinjau ${escapeHtml(item.FILE_NAME || 'video')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy" style="width:100px;height:64px;border:0;border-radius:8px;background:#111827;"></iframe></td>
                                                <td>${escapeHtml(item.JUDUL || '-')}</td>
                                                <td>${escapeHtml(item.DESKRIPSI || '-')}</td>
                                                <td><span class="status-badge ${String(item.STATUS || 'AKTIF').toUpperCase() === 'AKTIF' ? 'done' : 'pending'}">${escapeHtml(item.STATUS || 'AKTIF')}</span></td>
                                                <td>${escapeHtml(formatDate(item.CREATED_AT || item.UPDATED_AT))}</td>
                                                <td>
                                                    <div class="admin-action-stack">
                                                        <button class="btn-secondary small" type="button" data-media-action="edit" data-media-type="VIDEO" data-media-id="${escapeHtml(item.ID_MEDIA || '')}">Edit</button>
                                                        <button class="save-status-btn" type="button" data-media-action="delete" data-media-type="VIDEO" data-media-id="${escapeHtml(item.ID_MEDIA || '')}">Hapus</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="6"><div class="admin-empty-state">Belum ada video.</div></td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }


        function renderNewsPage() {
            const records = Array.isArray(window.__NEWS_CACHE__) ? window.__NEWS_CACHE__ : [];
            return `<div class="admin-card admin-news-page"><div class="admin-card-header"><h3>Update Berita</h3><button type="button" class="btn-primary" data-news-edit="new">+ Tambah Berita</button></div><p class="section-sub-text">Gambar menggunakan URL Google Drive yang telah dapat diakses publik. Upload file langsung memerlukan action backend Drive khusus.</p><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Judul</th><th>Kategori</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>${records.length ? records.map(x => `<tr><td>${escapeHtml(x.title)}</td><td>${escapeHtml(x.category || '-')}</td><td><span class="status-badge ${x.status === 'PUBLISHED' ? 'done' : 'pending'}">${escapeHtml(x.status)}</span></td><td>${escapeHtml(formatDate(x.createdAt))}</td><td><button class="btn-secondary small" data-news-edit="${escapeHtml(x.id)}">Edit</button> <button class="save-status-btn" data-news-preview="${escapeHtml(x.id)}">Preview</button></td></tr>`).join('') : '<tr><td colspan="5"><div class="admin-empty-state">Belum ada berita.</div></td></tr>'}</tbody></table></div></div>`;
        }


        function deprecatedShowAdminPageOverride(page) {
            if (!checkAdminSession()) { renderAdminLoginGate(); return; }
            const pages = { dashboard: renderAdminDashboardPage, services: renderServicesPage, running: renderRunningServicesPage, completed: renderCompletedServicesPage, customers: renderCustomersPage, stock: renderStockPage, locations: renderLocationsPage, media: renderMediaPage, news: renderNewsPage, reports: renderReportsPage, settings: renderSettingsPage };
            renderAdminAppShell(page, (pages[page] || pages.dashboard)());
        }


        async function refreshExtendedData() {
            if (!isAdminLoggedIn()) return;
            const [locationsResult, newsResult] = await Promise.allSettled([
                apiRequest('getLocations'),
                apiRequest('getNews')
            ]);
            if (locationsResult.status === 'fulfilled') {
                window.__LOCATIONS_CACHE__ = Array.isArray(locationsResult.value.data) ? locationsResult.value.data : [];
            } else {
                console.warn('Gagal memuat lokasi servis:', locationsResult.reason);
                window.__LOCATIONS_CACHE__ = [];
            }
            if (newsResult.status === 'fulfilled') {
                window.__NEWS_CACHE__ = Array.isArray(newsResult.value.data) ? newsResult.value.data : [];
            }
        }


        function refreshLocationsInBackground() {
            if (window.__LOCATIONS_REQUEST__) return window.__LOCATIONS_REQUEST__;
            window.__LOCATIONS_LOADING__ = true;
            window.__LOCATIONS_REQUEST__ = apiRequest('getLocations')
                .then(response => {
                    window.__LOCATIONS_CACHE__ = Array.isArray(response?.data) ? response.data : [];
                })
                .catch(error => {
                    console.warn('Gagal memuat lokasi servis:', error);
                    showToast(error?.message || 'Data lokasi servis gagal dimuat.', 'error');
                })
                .finally(() => {
                    window.__LOCATIONS_LOADING__ = false;
                    window.__LOCATIONS_REQUEST__ = null;
                    if (window.__ADMIN_CURRENT_PAGE__ === 'locations') {
                        showAdminPage('locations');
                    }
                });
            return window.__LOCATIONS_REQUEST__;
        }


        async function deprecatedRefreshCurrentAdminDataOverride() {
            if (!checkAdminSession()) return;
            window.__ADMIN_SYNC_STATE__ = { label: 'Sinkronisasi', text: 'Mengambil data terbaru...' };
            try {
                const [dashboard, services, stock, history, extra] = await Promise.all([apiRequest('getDashboard'), apiRequest('getServices'), apiRequest('getStock'), apiRequest('getStockHistory'), refreshExtendedData()]);
                setServiceCache(Array.isArray(services.data) ? services.data : []); saveStockRecords(Array.isArray(stock.data) ? stock.data : []); saveStockHistory(Array.isArray(history.data) ? history.data : []);
                window.__ADMIN_SYNC_STATE__ = { label: 'Terhubung', text: 'Terakhir diperbarui ' + new Date().toLocaleTimeString('id-ID') };
            } catch (error) { window.__ADMIN_SYNC_STATE__ = { label: 'Gagal terhubung', text: 'Gagal mengambil data dari server.' }; showToast('Gagal mengambil data dari server.', 'error'); }
            renderAdminDashboard();
        }


        async function loadPublicNews() {
            try { const response = await apiRequest('getNews'); window.__PUBLIC_NEWS_CACHE__ = Array.isArray(response.data) ? response.data : []; renderPublicNews(); }
            catch (error) { window.__PUBLIC_NEWS_CACHE__ = []; renderPublicNews('Gagal mengambil data dari server.'); }
        }


        function getNewsImageUrl(news) {
            if (!news) return '';
            const raw = String(news.imageUrl || news.image_url || news.IMAGE_URL || news.image || news.fileUrl || news.file_url || '').trim();
            const id = String(news.imageFileId || news.image_file_id || news.fileId || news.FILE_ID || extractDriveFileIdFromUrl(raw) || '').trim();
            if (id) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1600';
            if (!raw) return '';
            return raw;
        }


        function renderPublicNews(error) {
            const allRecords = Array.isArray(window.__PUBLIC_NEWS_CACHE__) ? window.__PUBLIC_NEWS_CACHE__ : [];
            const records = allRecords.filter(x => String(x.status || 'PUBLISHED').trim().toUpperCase() === 'PUBLISHED');
            const host = document.getElementById('publicNewsList');
            const home = document.getElementById('homeNewsList');
            const makeCard = (x, compact = false) => `<article class="tutorial-card news-card">
                ${getNewsImageUrl(x) ? `<img class="news-card-image" src="${escapeHtml(getNewsImageUrl(x))}" alt="${escapeHtml(x.title || 'Gambar berita')}" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.insertAdjacentHTML('afterend','<div class=\'news-image-unavailable\'>Gambar berita tidak dapat dimuat</div>')">` : ''}
                <span class="tutorial-tag">${escapeHtml(x.category || 'Berita')}</span>
                <h3>${escapeHtml(x.title || 'Tanpa judul')}</h3>
                <p>${escapeHtml((x.content || '').slice(0, compact ? 105 : 150))}${(x.content || '').length > (compact ? 105 : 150) ? '…' : ''}</p>
                <button type="button" class="btn-primary news-read-more" data-public-news="${escapeHtml(String(x.id ?? ''))}">Baca Selengkapnya</button>
            </article>`;
            const empty = `<div class="admin-empty-state">${escapeHtml(error || 'Belum ada berita yang dipublikasikan.')}</div>`;
            if (host) host.innerHTML = records.map(x => makeCard(x, false)).join('') || empty;
            if (home) {
                stopHomeNewsCarousel();
                if (!records.length) {
                    home.innerHTML = `<div class="admin-empty-state">${escapeHtml(error || 'Belum ada berita terbaru.')}</div>`;
                } else {
                    const dateOf = x => x.createdAt || x.created_at || x.date || x.tanggal || x.publishedAt || '';
                    const formatNewsDate = value => {
                        if (!value) return '';
                        const d = new Date(value);
                        return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'});
                    };
                    const slides = records.map((x, i) => {
                        const date = formatNewsDate(dateOf(x));
                        const excerpt = String(x.content || '').replace(/\s+/g, ' ').trim();
                        return `<article class="home-news-slide" data-home-news-slide="${i}">
                            <div class="home-news-card">
                                <div class="home-news-image-wrap">${getNewsImageUrl(x) ? `<img class="home-news-image" src="${escapeHtml(getNewsImageUrl(x))}" alt="${escapeHtml(x.title || 'Gambar berita')}" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.closest('.home-news-image-wrap').classList.add('image-unavailable')">` : `<div class="home-news-image-placeholder"><span>LERESSAE</span><small>Berita Terbaru</small></div>`}<span class="home-news-category">${escapeHtml(x.category || 'Berita')}</span></div>
                                <div class="home-news-content">${date ? `<time class="home-news-date">${escapeHtml(date)}</time>` : ''}<h3>${escapeHtml(x.title || 'Tanpa judul')}</h3><p>${escapeHtml(excerpt.slice(0, 160))}${excerpt.length > 160 ? '…' : ''}</p><button type="button" class="btn-primary news-read-more" data-public-news="${escapeHtml(String(x.id ?? ''))}">Selengkapnya <span aria-hidden="true">→</span></button></div>
                            </div>
                        </article>`;
                    }).join('');
                    home.innerHTML = `<div class="home-news-carousel" aria-roledescription="carousel" aria-label="Berita terbaru">
                        <div class="home-news-viewport"><div class="home-news-track">${slides}</div></div>
                        <div class="home-news-controls"><div class="home-news-dots" aria-label="Pilih posisi berita"></div>
                        <div class="home-news-arrows"><button type="button" class="home-news-arrow" data-home-news-step="-1" aria-label="Berita sebelumnya">‹</button><button type="button" class="home-news-arrow" data-home-news-step="1" aria-label="Berita berikutnya">›</button></div></div>
                        <div class="home-news-counter" aria-live="polite">1 / ${records.length}</div></div>`;
                    setupHomeNewsCarousel(home, records.length);
                }
            }
        }
        let homeNewsCarouselTimer = null;


        function stopHomeNewsCarousel() {
            if (homeNewsCarouselTimer) clearInterval(homeNewsCarouselTimer);
            homeNewsCarouselTimer = null;
            document.querySelectorAll('.home-news-carousel').forEach(carousel => {
                if (typeof carousel.__cleanupCarousel === 'function') carousel.__cleanupCarousel();
            });
        }


        function setupHomeNewsCarousel(home, count) {
            const carousel = home.querySelector('.home-news-carousel');
            const track = home.querySelector('.home-news-track');
            if (!carousel || !track || count < 1) return;
            let index = 0;
            const visibleCount = () => window.matchMedia('(max-width: 640px)').matches ? 2 : (window.matchMedia('(max-width: 980px)').matches ? 2 : 3);
            const maxIndex = () => Math.max(0, count - visibleCount());
            const update = () => {
                index = Math.min(index, maxIndex());
                const dotsHost = carousel.querySelector('.home-news-dots');
                const positions = maxIndex() + 1;
                if (dotsHost && dotsHost.children.length !== positions) dotsHost.innerHTML = Array.from({length:positions}, (_,i) => `<button type="button" class="home-news-dot${i===index?' is-active':''}" data-home-news-go="${i}" aria-label="Posisi berita ${i+1}" aria-current="${i===index?'true':'false'}"></button>`).join('');
                const slide = track.querySelector('.home-news-slide');
                const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
                const width = slide ? slide.getBoundingClientRect().width : 0;
                track.style.transform = `translate3d(-${index * (width + gap)}px,0,0)`;
                carousel.querySelectorAll('[data-home-news-go]').forEach(dot => {
                    const active = Number(dot.dataset.homeNewsGo) === index;
                    dot.classList.toggle('is-active', active);
                    dot.setAttribute('aria-current', active ? 'true' : 'false');
                });
                const counter = carousel.querySelector('.home-news-counter');
                if (counter) counter.textContent = `${index + 1}–${Math.min(index + visibleCount(), count)} dari ${count} berita`;
                carousel.querySelectorAll('[data-home-news-step]').forEach(button => button.disabled = count <= visibleCount());
            };
            const go = next => { index = next < 0 ? (index <= 0 ? maxIndex() : index - 1) : (index >= maxIndex() ? 0 : index + 1); update(); };
            const onClick = event => {
                const target = event.target instanceof Element ? event.target : event.target.parentElement;
                const step = target && target.closest('[data-home-news-step]');
                const dot = target && target.closest('[data-home-news-go]');
                if (step) { event.preventDefault(); event.stopPropagation(); go(Number(step.dataset.homeNewsStep)); restart(); }
                else if (dot) { event.preventDefault(); event.stopPropagation(); index = Math.min(Number(dot.dataset.homeNewsGo), maxIndex()); update(); restart(); }
            };
            const start = () => { if (homeNewsCarouselTimer) clearInterval(homeNewsCarouselTimer); homeNewsCarouselTimer = null; if (count > visibleCount() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) homeNewsCarouselTimer = setInterval(() => go(1), 2700); };
            const pause = () => { if (homeNewsCarouselTimer) clearInterval(homeNewsCarouselTimer); homeNewsCarouselTimer = null; };
            const restart = () => { pause(); start(); };
            const onFocusOut = event => { if (!carousel.contains(event.relatedTarget)) start(); };
            let gestureStartX = 0, gestureStartY = 0, gestureLastX = 0, gesturePointerId = null, gestureMoved = false;
            const gestureSurface = track;
            const onPointerDown = event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (event.target.closest('button, a, input, textarea, select')) return;
                gestureStartX = gestureLastX = event.clientX; gestureStartY = event.clientY;
                gesturePointerId = event.pointerId; gestureMoved = false;
                if (event.pointerType === 'mouse') { gestureSurface.style.cursor = 'grabbing'; }
                pause();
            };
            const onPointerMove = event => {
                if (gesturePointerId !== event.pointerId) return;
                const dx = event.clientX - gestureStartX, dy = event.clientY - gestureStartY;
                if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) gestureMoved = true;
                gestureLastX = event.clientX;
            };
            const onPointerEnd = event => {
                if (gesturePointerId !== event.pointerId) return;
                const dx = gestureLastX - gestureStartX, dy = event.clientY - gestureStartY;
                if (gestureMoved && Math.abs(dx) >= 35 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); }
                gesturePointerId = null; gestureSurface.style.cursor = '';
                if (gestureMoved) { carousel.dataset.suppressClick = 'true'; setTimeout(() => delete carousel.dataset.suppressClick, 0); }
                start();
            };
            const onWheel = event => {
                const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
                if (Math.abs(delta) < 18) return;
                event.preventDefault(); go(delta > 0 ? 1 : -1); restart();
            };
            const onClickGuard = event => { if (carousel.dataset.suppressClick === 'true') { event.preventDefault(); event.stopPropagation(); delete carousel.dataset.suppressClick; } };
            gestureSurface.style.touchAction = 'pan-y'; gestureSurface.style.cursor = 'grab';
            gestureSurface.addEventListener('pointerdown', onPointerDown);
            gestureSurface.addEventListener('pointermove', onPointerMove);
            gestureSurface.addEventListener('pointerup', onPointerEnd);
            gestureSurface.addEventListener('pointercancel', onPointerEnd);
            carousel.addEventListener('wheel', onWheel, {passive:false});
            carousel.addEventListener('click', onClickGuard, true);
            carousel.addEventListener('click', onClick);
            carousel.addEventListener('mouseenter', pause);
            carousel.addEventListener('mouseleave', start);
            carousel.addEventListener('focusin', pause);
            carousel.addEventListener('focusout', onFocusOut);
            window.addEventListener('resize', update, {passive:true});
            carousel.__cleanupCarousel = () => {
                pause(); carousel.removeEventListener('click', onClick); carousel.removeEventListener('click', onClickGuard, true);
                gestureSurface.removeEventListener('pointerdown', onPointerDown); gestureSurface.removeEventListener('pointermove', onPointerMove);
                gestureSurface.removeEventListener('pointerup', onPointerEnd); gestureSurface.removeEventListener('pointercancel', onPointerEnd);
                carousel.removeEventListener('wheel', onWheel); gestureSurface.style.touchAction = ''; gestureSurface.style.cursor = '';
                carousel.removeEventListener('mouseenter', pause); carousel.removeEventListener('mouseleave', start);
                carousel.removeEventListener('focusin', pause); carousel.removeEventListener('focusout', onFocusOut);
                window.removeEventListener('resize', update); delete carousel.__cleanupCarousel;
            };
            update(); start();
        }


        function openPublicNewsModal(news) {
            if (!news) return;
            let modal = document.getElementById('publicNewsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'publicNewsModal';
                modal.setAttribute('role', 'dialog');
                modal.setAttribute('aria-modal', 'true');
                modal.setAttribute('aria-labelledby', 'publicNewsModalTitle');
                modal.innerHTML = `<div class="public-news-dialog"><button type="button" class="public-news-close" aria-label="Tutup berita">×</button><div class="public-news-visual"></div><div class="public-news-content"><span class="public-news-category"></span><h2 class="public-news-title" id="publicNewsModalTitle"></h2><div class="public-news-body"></div></div></div>`;
                document.body.appendChild(modal);
                const close = () => { modal.classList.remove('is-open'); document.body.style.overflow = ''; };
                modal.querySelector('.public-news-close').addEventListener('click', close);
                modal.addEventListener('click', e => { if (e.target === modal) close(); });
                modal.__closeNewsModal = close;
            }
            const visual = modal.querySelector('.public-news-visual');
            const imageUrl = getNewsImageUrl(news);
            visual.innerHTML = imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(news.title || 'Gambar berita')}" onerror="this.parentElement.style.display='none'">` : '';
            visual.style.display = imageUrl ? 'flex' : 'none';
            modal.querySelector('.public-news-category').textContent = news.category || 'Berita';
            modal.querySelector('.public-news-title').textContent = news.title || 'Tanpa judul';
            modal.querySelector('.public-news-body').textContent = news.content || 'Tidak ada isi berita.';
            modal.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            modal.querySelector('.public-news-close').focus();
        }


        function openNewsEditor(id) {
            const current = (window.__NEWS_CACHE__ || []).find(x => x.id === id) || { status: 'DRAFT' };
            const modal = document.createElement('div'); modal.className = 'stock-modal show';
            modal.innerHTML = `<div class="stock-panel"><div class="stock-panel-header"><button class="stock-close" type="button">×</button><h3>${id === 'new' ? 'Tambah Berita' : 'Edit Berita'}</h3></div><form class="stock-body" id="newsEditorForm"><div class="field-row"><label>Judul</label><input name="title" required value="${escapeHtml(current.title || '')}"></div><div class="field-row"><label>Gambar</label><input name="imageFile" type="file" accept="image/*"><input name="imageUrl" type="url" placeholder="atau URL gambar Google Drive" value="${escapeHtml(current.imageUrl || '')}"></div><div class="field-row"><label>Kategori</label><input name="category" value="${escapeHtml(current.category || '')}"></div><div class="field-row"><label>Isi</label><textarea name="content" required>${escapeHtml(current.content || '')}</textarea></div><div class="field-row"><label>Status</label><select name="status"><option ${current.status === 'DRAFT' ? 'selected' : ''}>DRAFT</option><option ${current.status === 'PUBLISHED' ? 'selected' : ''}>PUBLISHED</option></select></div><div class="stock-actions news-editor-actions">${id !== 'new' ? `<button class="save-status-btn danger-delete-news" type="button" data-news-delete="${escapeHtml(id)}">Hapus</button>` : ''}<button class="btn-secondary" type="button">Batal</button><button class="btn-primary" type="submit">Simpan</button></div></form></div>`;
            document.body.appendChild(modal); const close = () => modal.remove(); modal.querySelectorAll('button[type="button"]').forEach(b => b.onclick = close);
            modal.querySelector('form').onsubmit = async e => { e.preventDefault(); const form = new FormData(e.target); const payload = Object.fromEntries(form.entries()); const file = form.get('imageFile'); delete payload.imageFile; if (id !== 'new') payload.id = id; try { if (file && file.size) { const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); const uploaded = await uploadLeressaeFileToDrive(file, 'BERITA', 'FOTO'); payload.imageUrl = uploaded.fileUrl; payload.imageFileId = uploaded.fileId; } await apiRequest(id === 'new' ? 'addNews' : 'updateNews', payload); await refreshExtendedData(); showAdminPage('news'); close(); showToast('Berita tersimpan di Spreadsheet.', 'success'); } catch (err) { showToast(err.message || 'Gagal menyimpan berita.', 'error'); } };
        }


        function setupNewsViews() {
            const nav = document.querySelector('.nav-links'); if (nav && !document.getElementById('nav-info')) nav.insertAdjacentHTML('beforeend', '<li><a onclick="navigateTo(\'page-info\')" class="nav-item" id="nav-info">Berita</a></li>');
            const wrapper = document.querySelector('.wrapper'); if (wrapper && !document.getElementById('page-info')) wrapper.insertAdjacentHTML('beforeend', '<section id="page-info" class="page-view card-container"><h1 class="page-header-title">Info / Berita</h1><p class="page-header-desc">Informasi terbaru LERESSAE BPTI Disperindag DIY.</p><div id="publicNewsList" class="tutorial-scroll" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));overflow:visible"></div></section>');
            const dashboard = document.getElementById('page-dashboard');
            if (dashboard && !document.getElementById('homeMediaSpotlight')) dashboard.insertAdjacentHTML('beforeend', '<section id="homeMediaSpotlight" class="home-media-spotlight" aria-label="Sorotan dokumentasi media"><div class="media-spotlight-head"><div><h2 class="media-spotlight-title">Sorotan Media</h2><p class="media-spotlight-subtitle">Momen kegiatan, praktik, dan kolaborasi terbaru BPTI Disperindag DIY.</p></div></div><div class="home-media-content"><div class="home-media-empty">Memuat dokumentasi foto…</div></div></section>');
            if (dashboard && !document.getElementById('homeNewsList')) dashboard.insertAdjacentHTML('beforeend', '<div class="dashboard-section"><div class="section-header"><h2 class="section-title-text">Berita Terbaru</h2></div><div id="homeNewsList" class="tutorial-scroll"></div><button class="btn-primary" onclick="navigateTo(\'page-info\')" style="margin-top:16px">Lihat Semua Berita</button></div>');
            renderHomeMediaSlideshow();
        }
        document.addEventListener('keydown', event => { if (event.key === 'Escape') { const modal = document.getElementById('publicNewsModal'); if (modal && modal.classList.contains('is-open')) modal.__closeNewsModal?.(); } });
        document.addEventListener('click', async event => {
            const loadLocations = event.target.closest('[data-load-locations]'); if (loadLocations) { showAdminPage('locations'); refreshLocationsInBackground(); }
            const editor = event.target.closest('[data-news-edit]'); if (editor) openNewsEditor(editor.dataset.newsEdit);
            const preview = event.target.closest('[data-news-preview]'); if (preview) { const n = (window.__NEWS_CACHE__ || []).find(x => String(x.id) === String(preview.dataset.newsPreview)); if (n) openPublicNewsModal(n); }
            const newsDelete = event.target.closest('[data-news-delete]');
            if (newsDelete) {
                const newsId = newsDelete.dataset.newsDelete;
                const news = (window.__NEWS_CACHE__ || []).find(x => String(x.id) === String(newsId));
                if (!news) { showToast('Berita tidak ditemukan.', 'error'); return; }
                const ok = confirm('Apakah Anda yakin ingin menghapus berita "' + (news.title || 'ini') + '"?');
                if (!ok) return;
                try {
                    await apiRequest('deleteNews', { id: newsId, token: getAdminToken() });
                    await refreshExtendedData();
                    showAdminPage('news');
                    showToast('Berita berhasil dihapus.', 'success');
                } catch (error) {
                    showToast(error.message || 'Gagal menghapus berita.', 'error');
                }
                return;
            }
            const mediaAction = event.target.closest('[data-media-action]');
            if (mediaAction) {
                const action = mediaAction.dataset.mediaAction;
                const type = mediaAction.dataset.mediaType;
                const targetForm = document.querySelector(type === 'FOTO' ? '#mediaPhotoForm' : '#mediaVideoForm');
                if (action === 'add') {
                    window.__ADMIN_MEDIA_FORM_BUSY__ = false;
                    if (targetForm) {
                        window.__ADMIN_MEDIA_FORM_BUSY__ = true;
                        targetForm.dataset.mode = 'add';
                        delete targetForm.dataset.mediaId;
                        targetForm.reset();
                        mountMediaFormToBody(targetForm);
                        const title = targetForm.querySelector('.media-modal-title');
                        if (title) title.textContent = type === 'FOTO' ? 'Tambah Foto' : 'Tambah Video';
                        targetForm.classList.add('media-modal-active');
                        document.body.classList.add('media-modal-open');
                    }
                    return;
                }
                if (action === 'delete') {
                    const mediaId = mediaAction.dataset.mediaId;
                    const ok = confirm('Apakah Anda yakin ingin menghapus media ini?');
                    if (!ok) return;
                    const records = getMediaRecords();
                    const target = records.find(item => String(item.ID_MEDIA) === String(mediaId));
                    if (!target) { showToast('Media tidak ditemukan.', 'error'); return; }
                    if (!isApiConfigured()) {
                        showToast('Backend upload media belum tersedia. Data tidak dihapus permanen.', 'error');
                        return;
                    }
                    try {
                        await apiRequest('deleteMedia', { ID_MEDIA: mediaId, TYPE: type, token: getAdminToken() });
                        const updated = records.filter(item => String(item.ID_MEDIA) !== String(mediaId));
                        saveMediaRecords(updated);
                        showAdminPage('media');
                        showToast('Media berhasil dihapus.', 'success');
                    } catch (error) {
                        showToast(error.message || 'Backend belum tersedia untuk hapus media.', 'error');
                    }
                    return;
                }
                if (action === 'edit') {
                    window.__ADMIN_MEDIA_FORM_BUSY__ = true;
                    const mediaId = mediaAction.dataset.mediaId;
                    const records = getMediaRecords();
                    const target = records.find(item => String(item.ID_MEDIA) === String(mediaId));
                    if (!target) { showToast('Media tidak ditemukan.', 'error'); return; }
                    const form = document.querySelector(type === 'FOTO' ? '#mediaPhotoForm' : '#mediaVideoForm');
                    if (form) {
                        form.dataset.mode = 'edit';
                        form.dataset.mediaId = mediaId;
                        mountMediaFormToBody(form);
                        const title = form.querySelector('.media-modal-title');
                        if (title) title.textContent = type === 'FOTO' ? 'Edit Foto' : 'Edit Video';
                        form.classList.add('media-modal-active');
                        document.body.classList.add('media-modal-open');
                        const fileInput = form.querySelector('input[name="file"]');
                        const judul = form.querySelector('input[name="judul"]');
                        const deskripsi = form.querySelector('textarea[name="deskripsi"]');
                        const status = form.querySelector('select[name="status"]');
                        if (fileInput) fileInput.value = '';
                        if (judul) judul.value = target.JUDUL || '';
                        if (deskripsi) deskripsi.value = target.DESKRIPSI || target.KETERANGAN || '';
                        if (status) status.value = String(target.STATUS || 'AKTIF').toUpperCase();
                    }
                }
            }
            const cancel = event.target.closest('[data-media-cancel]');
            if (cancel) {
                const form = document.querySelector(cancel.dataset.mediaCancel === 'FOTO' ? '#mediaPhotoForm' : '#mediaVideoForm');
                if (form) {
                    form.classList.remove('media-modal-active');
                    form.style.display = 'none';
                    form.reset();
                    restoreMediaForm(form);
                    form.dataset.mode = 'add';
                    delete form.dataset.mediaId;
                }
                document.body.classList.remove('media-modal-open');
                window.__ADMIN_MEDIA_FORM_BUSY__ = false;
            }
            const publicNews = event.target.closest('[data-public-news]'); if (publicNews) { const n = (window.__PUBLIC_NEWS_CACHE__ || []).find(x => String(x.id ?? '') === String(publicNews.dataset.publicNews ?? '')); if (n) openPublicNewsModal(n); }
        });
        document.addEventListener('input', event => {
            if (event.target.id === 'locationSearch') {
                window.__LOCATION_FILTER__ = event.target.value;
                showAdminPage('locations');
            }
            if (event.target.id === 'locationDateFrom') {
                window.__LOCATION_FILTER_CUSTOM_FROM__ = event.target.value || '';
                if (window.__LOCATION_FILTER_PERIOD__ !== 'custom') {
                    window.__LOCATION_FILTER_PERIOD__ = 'custom';
                }
                showAdminPage('locations');
            }
            if (event.target.id === 'locationDateTo') {
                window.__LOCATION_FILTER_CUSTOM_TO__ = event.target.value || '';
                if (window.__LOCATION_FILTER_PERIOD__ !== 'custom') {
                    window.__LOCATION_FILTER_PERIOD__ = 'custom';
                }
                showAdminPage('locations');
            }
        });
        document.addEventListener('change', event => {
            if (event.target.id === 'locationDateFilter') {
                window.__LOCATION_FILTER_PERIOD__ = event.target.value || 'all';
                if (window.__LOCATION_FILTER_PERIOD__ !== 'custom') {
                    window.__LOCATION_FILTER_CUSTOM_FROM__ = '';
                    window.__LOCATION_FILTER_CUSTOM_TO__ = '';
                }
                showAdminPage('locations');
            }
        });
        if (typeof window !== 'undefined') {
            window.__LOCATION_FILTER__ = window.__LOCATION_FILTER__ || '';
            window.__LOCATION_FILTER_PERIOD__ = window.__LOCATION_FILTER_PERIOD__ || 'all';
            window.__LOCATION_FILTER_CUSTOM_FROM__ = window.__LOCATION_FILTER_CUSTOM_FROM__ || '';
            window.__LOCATION_FILTER_CUSTOM_TO__ = window.__LOCATION_FILTER_CUSTOM_TO__ || '';
        }
        setupNewsViews();
        renderPublicMediaGallery();
        document.addEventListener('submit', async function(event) {
            const form = event.target.closest('.media-admin-form');
            if (!form) return;
            event.preventDefault();
            event.stopPropagation();
            const mediaType = String(form.dataset.mediaType || 'FOTO').toUpperCase();
            const mode = form.dataset.mode || 'add';
            const mediaId = form.dataset.mediaId || '';
            const judul = form.querySelector('input[name="judul"]')?.value.trim() || '';
            const deskripsi = form.querySelector('textarea[name="deskripsi"]')?.value.trim() || '';
            const status = String(form.querySelector('select[name="status"]')?.value || 'AKTIF').toUpperCase();
            const fileElement = form.querySelector('input[name="file"]');
            const file = fileElement && fileElement.files ? fileElement.files[0] : null;
            if (!isAdminLoggedIn()) {
                showToast('Sesi Admin tidak ditemukan. Silakan login kembali.', 'error');
                return;
            }
            if (!judul) {
                showToast('Judul media wajib diisi.', 'error');
                return;
            }
            if (!deskripsi) {
                showToast('Deskripsi media wajib diisi.', 'error');
                return;
            }
            if (mode !== 'edit' && !file) {
                showToast('Pilih file media terlebih dahulu.', 'error');
                return;
            }
            if (!isApiConfigured()) {
                showToast('Backend Google Apps Script belum tersedia.', 'error');
                return;
            }
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton ? submitButton.textContent : '';
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = file ? 'Mengunggah ke Drive…' : 'Menyimpan…';
            }
            window.__ADMIN_CURRENT_PAGE__ = 'media';
            window.__ADMIN_MEDIA_FORM_BUSY__ = true;
            try {
                let uploaded = null;
                if (file) {
                    uploaded = await uploadLeressaeFileToDrive(file, 'MEDIA', mediaType, {
                        JUDUL: judul,
                        DESKRIPSI: deskripsi
                    });
                }
                const fallbackId = mediaId || 'MEDIA-' + Date.now();
                const basePayload = {
                    ID_MEDIA: fallbackId,
                    TYPE: mediaType,
                    JUDUL: judul,
                    DESKRIPSI: deskripsi,
                    TITLE: judul,
                    DESCRIPTION: deskripsi,
                    KETERANGAN: encodeMediaLegacyMetadata(judul, deskripsi),
                    STATUS: status,
                    token: getAdminToken()
                };
                if (uploaded) {
                    basePayload.FILE_ID = uploaded.fileId;
                    basePayload.FILE_URL = uploaded.fileUrl;
                    basePayload.THUMBNAIL_URL = uploaded.thumbnailUrl || uploaded.fileUrl;
                    basePayload.FILE_NAME = uploaded.fileName;
                    basePayload.MIME_TYPE = uploaded.mimeType;
                }
                const action = mode === 'edit' ? 'updateMedia' : 'addMedia';
                const saveResponse = await apiRequest(action, basePayload);
                const responseRecords = extractMediaRecordsFromResponse(saveResponse);
                let savedRecord = responseRecords[0] || null;
                if (!savedRecord && saveResponse?.data && typeof saveResponse.data === 'object' && !Array.isArray(saveResponse.data)) {
                    const d = saveResponse.data;
                    if (d.ID_MEDIA || d.id_media || d.fileId || d.fileUrl || d.FILE_URL) savedRecord = d;
                }
                const localRecord = normalizeMediaRecord(savedRecord, {
                    ID_MEDIA: fallbackId,
                    TYPE: mediaType,
                    FILE_ID: uploaded?.fileId || '',
                    FILE_URL: uploaded?.fileUrl || '',
                    THUMBNAIL_URL: uploaded?.thumbnailUrl || uploaded?.fileUrl || '',
                    FILE_NAME: uploaded?.fileName || file?.name || '',
                    MIME_TYPE: uploaded?.mimeType || file?.type || '',
                    JUDUL: judul,
                    DESKRIPSI: deskripsi,
                    KETERANGAN: encodeMediaLegacyMetadata(judul, deskripsi),
                    STATUS: status,
                    CREATED_AT: new Date().toISOString(),
                    UPDATED_AT: new Date().toISOString()
                });
                if (localRecord.FILE_URL && !/^https?:\/\//i.test(localRecord.FILE_URL)) {
                    localRecord.FILE_URL = uploaded?.fileUrl || '';
                }
                if (localRecord.THUMBNAIL_URL && !/^https?:\/\//i.test(localRecord.THUMBNAIL_URL)) {
                    localRecord.THUMBNAIL_URL = uploaded?.thumbnailUrl || uploaded?.fileUrl || '';
                }
                const existing = getMediaRecords().filter(item => String(item.ID_MEDIA) !== String(localRecord.ID_MEDIA));
                saveMediaRecords([...existing, localRecord]);
                const refreshed = await loadMediaFromApi({ stayOnAdminMedia: false });
                if (!refreshed) {
                    renderPublicMediaGallery();
                }
                form.reset();
                form.classList.remove('media-modal-active');
                form.style.display = 'none';
                removeMediaFormFromBody(form);
                form.dataset.mode = 'add';
                document.body.classList.remove('media-modal-open');
                delete form.dataset.mediaId;
                window.__ADMIN_CURRENT_PAGE__ = 'media';
                window.__ADMIN_MEDIA_FORM_BUSY__ = false;
                showAdminPage('media', { fromBack: true });
                showToast(
                    mode === 'edit'
                        ? 'Media berhasil diperbarui dan tersimpan di Google Drive.'
                        : 'Media berhasil diupload ke Google Drive.',
                    'success'
                );
            } catch (error) {
                console.error('Media upload error:', error);
                window.__ADMIN_CURRENT_PAGE__ = 'media';
                window.__ADMIN_MEDIA_FORM_BUSY__ = false;
                form.classList.remove('media-modal-active');
                form.style.display = 'none';
                removeMediaFormFromBody(form);
                document.body.classList.remove('media-modal-open');
                if (isAdminLoggedIn()) showAdminPage('media', { fromBack: true });
                showToast(error?.message || 'Gagal menyimpan media ke Google Drive.', 'error');
            } finally {
                window.__ADMIN_MEDIA_FORM_BUSY__ = false;
                if (!document.querySelector('.media-admin-form.media-modal-active')) document.body.classList.remove('media-modal-open');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText || (mediaType === 'FOTO' ? 'Simpan Foto' : 'Simpan Video');
                }
            }
        });


        async function syncMediaMetadataFromAdminCache() {
            if (!isAdminLoggedIn() || !isApiConfigured()) return false;
            const records = getMediaRecords()
                .map(item => ({
                    ID_MEDIA: item.ID_MEDIA || item.id_media || item.id || '',
                    FILE_ID: item.FILE_ID || item.fileId || item.file_id || '',
                    JUDUL: item.JUDUL || item.judul || item.TITLE || item.title || '',
                    DESKRIPSI: item.DESKRIPSI || item.deskripsi || item.DESCRIPTION || item.description || item.KETERANGAN || ''
                }))
                .filter(item => (item.ID_MEDIA || item.FILE_ID) && (item.JUDUL || item.DESKRIPSI));
            if (!records.length) return false;
            try {
                await apiRequest('syncMediaMetadata', {
                    records,
                    token: getAdminToken()
                });
                return true;
            } catch (error) {
                console.warn('Sinkronisasi metadata media dari cache Admin gagal:', error);
                return false;
            }
        }
        (async function initialiseApiState() {
            if (!isApiConfigured()) return;
            const publicDataLoad = Promise.allSettled([
                loadPublicNews(),
                loadMediaFromApi()
            ]);
            try {
                await apiRequest('healthCheck');
                await publicDataLoad;
                if (checkAdminSession()) {
                    await syncMediaMetadataFromAdminCache();
                    try {
                        await apiRequest('migrateExistingMediaMetadata', { token: getAdminToken() });
                    } catch (migrationError) {
                        console.warn('Migrasi metadata media lama dilewati:', migrationError);
                    }
                    await loadMediaFromApi({ stayOnAdminMedia: false });
                }
            } catch (error) {
                handleApiError('healthCheck', error);
            }
        })();
(function(){
  const TECH_ACTIVE = ['Sedang Diproses'];
  const TECH_DONE = ['Selesai'];
  window.__TECH_PROOF_CACHE__ = window.__TECH_PROOF_CACHE__ || {};


function techSession(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEYS.technicianSession)||'{}')}catch(e){return{}}
  }


  function techUser(){
    const s=techSession();
    return getTechnicianUsers().find(u=>String(u.USERNAME||'').toLowerCase()===String(s.username||'').toLowerCase())||null;
  }
  const TECH_DEMO_KEY='leressae_technician_demo_records';
  const TECH_DEMO_PROOF_KEY='leressae_technician_proofs';


  function getTechDemoRecords(){
    return [];
  }


  function saveTechDemoRecords(records){
    localStorage.removeItem(TECH_DEMO_KEY);
    localStorage.removeItem(TECH_DEMO_PROOF_KEY);
  }


  function techAssigned(){
    const s=techSession(), name=String(s.name||'').toLowerCase(), user=String(s.username||'').toLowerCase();
    const real=loadServiceRecords();
    const demo=CONFIG.DEV_MODE ? getTechDemoRecords().filter(r=>String(r.technician||'').toLowerCase()===name || String(r.id_teknisi||'').toLowerCase()===user) : [];
    const ids=new Set(real.map(r=>String(r.id)));
    return real.concat(demo.filter(r=>!ids.has(String(r.id))));
  }


  function techStatusClass(s){
    return getServiceDisplayStatus(s)==='Selesai' ? 'done' : 'progress';
  }


  function techStatusBadge(s){
    const displayStatus=getServiceDisplayStatus(s);
    return `<span class="tech-status-badge ${techStatusClass(displayStatus)}">${escapeHtml(displayStatus)}</span>`;
  }


  function techDashboardAssignedToCurrent(r){
    const session=techSession(), user=String(session.username||'').trim().toLowerCase(), name=String(session.name||'').trim().toLowerCase();
    const raw=getRawFormData(r);
    const assigned=[r.id_teknisi,r.ID_TEKNISI,r.technician_id,r.TECHNICIAN_ID,r.technician,r.teknisi,r.NAMA_TEKNISI,raw.ID_TEKNISI,raw['ID Teknisi'],raw.Teknisi,raw['Nama Teknisi']].filter(v=>v!=null&&String(v).trim()).map(v=>String(v).trim().toLowerCase());
    return assigned.some(v=>v===user||v===name);
  }


  function openTechCustomerMedia(serviceId){
    const records=isAdminLoggedIn()?loadServiceRecords():techAssigned();
    const item=records.find(r=>String(r.id)===String(serviceId));
    const files=item?getServiceFormFields(item).media_customer:[];
    let modal=document.getElementById('techCustomerMediaModal');
    if(!modal){modal=document.createElement('div');modal.id='techCustomerMediaModal';modal.className='tech-customer-media-overlay';modal.innerHTML='<section class="tech-customer-media-dialog" role="dialog" aria-modal="true" aria-labelledby="techCustomerMediaTitle"><header><h3 id="techCustomerMediaTitle">Media Customer</h3><button type="button" aria-label="Tutup" data-tech-media-close>×</button></header><div class="tech-customer-media-content"></div></section>';document.body.appendChild(modal);}
    const content=modal.querySelector('.tech-customer-media-content');
    content.innerHTML=files.map((file,index)=>{
      const url=file.url||'', name=file.name||`Media ${index+1}`, lower=(url+' '+name+' '+file.mime).toLowerCase();
      const driveId=extractDriveFileIdFromUrl(url);
      const video=/video|\.(mp4|webm|mov|m4v)(\?|$)/i.test(lower), image=/image|\.(png|jpe?g|gif|webp|heic)(\?|$)/i.test(lower);
      let preview='';
      if(video){preview=driveId?`<iframe src="https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview" title="${escapeHtml(name)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`:`<video controls playsinline preload="metadata" src="${escapeHtml(url)}"></video>`;}
      else if(image||driveId){const imageUrl=driveId?`https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1600`:url;preview=`<img ${driveId?`data-drive-preview="${encodeURIComponent(driveId)}"`:''} src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" loading="lazy">`;}
      else {preview=`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Buka file media</a>`;}
      return `<article class="tech-customer-media-item"><div>${preview}</div><small>${escapeHtml(name)}</small></article>`;
    }).join('')||'<p>Media customer belum tersedia.</p>';
    content.querySelectorAll('img[data-drive-preview]').forEach(image=>image.addEventListener('error',()=>{
      const fileId=decodeURIComponent(image.dataset.drivePreview||'');
      if(!fileId)return;
      const frame=document.createElement('iframe');
      frame.src=`https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
      frame.title=image.alt||'Pratinjau media customer';
      frame.allow='autoplay; encrypted-media; picture-in-picture';
      frame.allowFullscreen=true;
      image.replaceWith(frame);
    },{once:true}));
    modal.classList.add('open');modal.onclick=e=>{if(e.target===modal||e.target.closest('[data-tech-media-close]'))modal.classList.remove('open');};
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){modal.classList.remove('open');document.removeEventListener('keydown',esc);}});
  }


  function techPageShell(page='dashboard'){
    const s=techSession(), u=techUser(), name=s.name||u?.NAMA||'Teknisi LERESSAE', username=s.username||u?.USERNAME||'teknisi';
    const initials=String(name).trim().charAt(0).toUpperCase()||'T';
    const nav=[
            ['dashboard','<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"></rect><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"></rect><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"></rect><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"></rect></svg>','Dashboard'],
            ['clients','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-1.5a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>','Lihat Client'],
            ['status','<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="18" rx="2"></rect><path d="M9 4.5h6a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 9 4.5Z"></path><path d="m8.5 13 2.5 2.5 5-5"></path></svg>','Update Status'],
            ['profile','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21v-1a8 8 0 0 1 16 0v1Z"></path></svg>','Profil Teknisi']
    ];
    return `<div class="technician-shell" id="technicianShell">
      <div class="technician-overlay" data-tech-close></div>
      <aside class="technician-sidebar" aria-label="Menu Teknisi">
        <div class="technician-brand"><strong>LERESSAE</strong><span>PANEL TEKNISI</span></div>
        <div class="technician-user"><div class="technician-avatar">${escapeHtml(initials)}</div><div><strong>${escapeHtml(name)}</strong><small>${escapeHtml(username)}</small></div></div>
        <nav class="technician-nav">
                    ${nav.map(([key,icon,label])=>`<button type="button" class="${page===key?'active':''}" data-tech-menu="${key}"><span class="tech-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}
        </nav>
                <button type="button" class="technician-nav technician-logout" data-tech-logout onclick="window.logoutTechnician(); return false;" aria-label="Keluar dari akun Teknisi"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path></svg></span><span>Logout</span></button>
      </aside>
      <main class="technician-content">
        <div class="technician-topbar">
          <div style="display:flex;align-items:center;gap:12px;min-width:0">
            <button class="technician-mobile-menu" type="button" data-tech-open aria-label="Buka menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
            <div><h2 id="techPageTitle">Dashboard</h2><p id="techPageSubtitle">Operasional teknisi terhubung dengan data Admin LERESSAE.</p></div>
          </div>
        </div>
        <div id="technicianView"></div>
      </main>
    </div>`;
  }


  function techDashboard(){
    const jobs=techAssigned();
    const latestJobs=jobs.filter(techDashboardAssignedToCurrent).sort((a,b)=>{const da=techClientDateValue(a),db=techClientDateValue(b);return (new Date(db).getTime()||0)-(new Date(da).getTime()||0);}).slice(0,5);
    const active=jobs.filter(x=>getServiceDisplayStatus(x.status)==='Sedang Diproses');
    const done=jobs.filter(x=>getServiceDisplayStatus(x.status)==='Selesai');
    const stock=getStockRecords(), low=stock.filter(x=>x.status==='MENIPIS'||Number(x.stokSaatIni||0)<=Number(x.minimum||0)).length;
    const s=techSession(), u=techUser(), name=s.name||u?.NAMA||'Teknisi LERESSAE', accountStatus=s.status||u?.STATUS||'AKTIF';
    const accountStatusClass=String(accountStatus).trim().toUpperCase()==='AKTIF'?'safe':'low';
    const now=new Date();
    const days=[];
    for(let i=6;i>=0;i--){ const d=new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate()-i); days.push(d); }
    const counts=days.map(d=>jobs.filter(r=>{const raw=r.created_at||r.tanggal_masuk||r.timestamp||r.tanggal; const x=new Date(raw); return !Number.isNaN(x.getTime())&&x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()&&x.getDate()===d.getDate();}).length);
    const max=Math.max(1,...counts);
    const chartScaleMax=Math.max(8,Math.ceil(max/2)*2), chartStep=Math.max(1,Math.ceil(chartScaleMax/4));
    const chartTicks=[]; for(let value=chartScaleMax;value>=0;value-=chartStep) chartTicks.push(value);
    if(chartTicks[chartTicks.length-1]!==0) chartTicks.push(0);
    const chart=days.map((d,i)=>{const height=counts[i]?Math.max(3,Math.round((counts[i]/chartScaleMax)*100)):2;return `<div class="tech-chart-col"><div class="tech-chart-plot-col"><span class="tech-chart-value" style="bottom:calc(${height}% + 5px)">${counts[i]}</span><div class="tech-chart-bar" style="height:${height}%"></div></div><small>${d.toLocaleDateString('id-ID',{weekday:'short'}).replace('.','')}</small></div>`}).join('');
    const activePercent=jobs.length?Math.round(active.length/jobs.length*100):0, donePercent=jobs.length?Math.round(done.length/jobs.length*100):0;
    const initials=String(name).trim().charAt(0).toUpperCase()||'T';
    return `<div class="tech-dashboard-page">
      <div class="tech-welcome"><div class="tech-welcome-main"><div class="tech-welcome-avatar" aria-hidden="true">${escapeHtml(initials)}</div><span class="tech-welcome-divider" aria-hidden="true"></span><div class="tech-welcome-copy"><span class="tech-eyebrow">DASHBOARD TEKNISI</span><h3>Halo, ${escapeHtml(name)}</h3><p>Berikut ringkasan pekerjaan yang ditugaskan kepada akun teknisi ini.</p></div></div><span class="tech-status-badge ${accountStatusClass}"><i aria-hidden="true"></i>${escapeHtml(accountStatus)}</span></div>
      <div class="tech-stat-grid">
        <div class="tech-stat is-total"><span class="tech-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14.7 6.1a5 5 0 0 0-6.4 6.4L3.6 17.2a2.3 2.3 0 0 0 3.2 3.2l4.7-4.7a5 5 0 0 0 6.4-6.4l-3 3-3-3 2.8-3.2Z"/></svg></span><div class="tech-stat-content"><span class="label">Total Servis Saya</span><span class="value">${jobs.length}</span></div></div>
        <div class="tech-stat is-active"><span class="tech-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></svg></span><div class="tech-stat-content"><span class="label">Servis Aktif</span><span class="value">${active.length}</span></div></div>
        <div class="tech-stat is-progress"><span class="tech-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18"/><circle cx="12" cy="12" r="5"/></svg></span><div class="tech-stat-content"><span class="label">Sedang Diproses</span><span class="value">${active.length}</span></div></div>
        <div class="tech-stat is-done"><span class="tech-stat-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"/></svg></span><div class="tech-stat-content"><span class="label">Selesai</span><span class="value">${done.length}</span></div></div>
      </div>
      <div class="tech-dashboard-grid">
        <section class="tech-section tech-dashboard-chart-card"><div class="tech-section-header"><div><h3>Servis Masuk 7 Hari</h3><p>Hanya data servis teknisi yang sedang login.</p></div></div><div class="tech-chart" role="img" aria-label="Grafik servis masuk selama tujuh hari terakhir"><div class="tech-chart-axis" aria-hidden="true">${chartTicks.map(value=>`<span>${value}</span>`).join('')}</div><div class="tech-chart-main"><div class="tech-chart-grid" aria-hidden="true">${chartTicks.map(()=>'<i></i>').join('')}</div><div class="tech-chart-columns">${chart}</div></div></div></section>
        <section class="tech-section tech-dashboard-status-card"><div class="tech-section-header"><div><h3>Status Servis</h3><p>Distribusi pekerjaan personal.</p></div></div><div class="tech-status-summary" aria-label="Distribusi status servis"><div class="tech-status-row is-progress"><span class="tech-status-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18"/><circle cx="12" cy="12" r="5"/></svg></span><div class="tech-status-copy"><span>Sedang Diproses</span><div class="tech-status-track" role="progressbar" aria-label="Sedang Diproses" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${activePercent}"><i style="width:${activePercent}%"></i></div></div><div class="tech-status-count"><strong>${active.length}</strong><small>${activePercent}%</small></div></div><div class="tech-status-row is-done"><span class="tech-status-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.2 4.2L19 7"/></svg></span><div class="tech-status-copy"><span>Selesai</span><div class="tech-status-track" role="progressbar" aria-label="Selesai" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${donePercent}"><i style="width:${donePercent}%"></i></div></div><div class="tech-status-count"><strong>${done.length}</strong><small>${donePercent}%</small></div></div></div><p class="tech-status-footnote">Dari ${jobs.length} servis yang ditugaskan.</p></section>
      </div>
      <section class="tech-section tech-dashboard-jobs-card"><div class="tech-section-header"><div><h3>Pekerjaan Terbaru</h3><p>Client yang ditugaskan kepada teknisi ini.</p></div><span class="tech-status-badge ${low?'low':'safe'}">${low} stok perlu perhatian</span></div>
                <div class="tech-table-wrap"><table class="tech-table tech-client-table tech-dashboard-jobs-table"><thead><tr><th>ID SERVIS</th><th>TANGGAL</th><th>CUSTOMER</th><th>BARANG</th><th>STATUS</th><th>AKSI</th></tr></thead><tbody>${latestJobs.map(r=>{const form=getServiceFormFields(r),dateValue=form.tanggal&&form.tanggal!=='-'?form.tanggal:techClientDateValue(r),status=getServiceDisplayStatus(r.status);return `<tr><td><strong>${escapeHtml(r.id||'-')}</strong></td><td>${escapeHtml(formatDate(dateValue))}</td><td>${escapeHtml(form.nama||r.customer_name||'-')}</td><td>${escapeHtml(form.barang||r.item_name||'-')}</td><td>${techStatusBadge(status)}</td><td><button type="button" class="tech-btn tech-dashboard-action" data-tech-update="${escapeHtml(r.id||'')}">Update Status</button></td></tr>`;}).join('')||'<tr><td colspan="6"><div class="tech-empty">Tidak ada pekerjaan terbaru yang ditugaskan kepada Anda.</div></td></tr>'}</tbody></table></div></section></div>
    </div>`;
  }


  function techProfile(){
    const s=techSession(), u=techUser(), name=s.name||u?.NAMA||'Teknisi LERESSAE', username=s.username||u?.USERNAME||'-', id=s.id_teknisi||s.technicianId||u?.id_teknisi||u?.TECHNICIAN_ID||u?.USER_ID||'-', status=s.status||u?.STATUS||'AKTIF';
    return `<div class="tech-section"><div class="tech-section-header"><div><h3>Profil Teknisi</h3><p style="margin:3px 0 0;color:#64748b;font-size:12px">Identitas akun yang sedang digunakan.</p></div></div><div class="tech-profile-grid"><div><span>Nama</span><strong>${escapeHtml(name)}</strong></div><div><span>ID Teknisi</span><strong>${escapeHtml(id)}</strong></div><div><span>Username</span><strong>${escapeHtml(username)}</strong></div><div><span>Role</span><strong>TEKNISI</strong></div><div><span>Status</span><strong>${escapeHtml(status)}</strong></div></div><div class="tech-action-row"><button class="tech-btn" type="button" data-tech-logout>Keluar</button></div></div>`;
  }


  function techClientDateValue(row){
    return row?.created_at || row?.tanggal_masuk || row?.date || row?.timestamp || row?.tanggal || row?.createdAt || '';
  }


  function techClientDate(row){
    const raw=techClientDateValue(row);
    if(!raw) return null;
    const d=new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }


  function techClientMatchesPeriod(row, filter){
    const mode=filter?.period || 'this_week';
    const d=techClientDate(row);
    if(!d) return mode==='custom' ? false : true;
    const now=new Date();
    const today=new Date(now);
    today.setHours(0,0,0,0);
    if(mode==='today'){
      return d.getFullYear()===today.getFullYear()
        && d.getMonth()===today.getMonth()
        && d.getDate()===today.getDate();
    }
    if(mode==='this_week'){
      const start=new Date(today);
      const day=start.getDay();
      start.setDate(start.getDate()+(day===0?-6:1-day));
      const end=new Date(start);
      end.setDate(end.getDate()+6);
      end.setHours(23,59,59,999);
      return d>=start && d<=end;
    }
    if(mode==='this_month'){
      const start=new Date(today.getFullYear(),today.getMonth(),1);
      const end=new Date(today.getFullYear(),today.getMonth()+1,0);
      end.setHours(23,59,59,999);
      return d>=start && d<=end;
    }
    if(mode==='custom'){
      const from=filter?.from ? new Date(filter.from+'T00:00:00') : null;
      const to=filter?.to ? new Date(filter.to+'T23:59:59.999') : null;
      if(from && to) return d>=from && d<=to;
      if(from) return d>=from;
      if(to) return d<=to;
      return true;
    }
    return true;
  }


  function techClients(){
    const jobs=techAssigned();
    const filter=window.__TECH_CLIENT_FILTER__ || {period:'this_week',from:'',to:''};
    const filteredJobs=jobs.filter(r=>techClientMatchesPeriod(r,filter));
    return `<div class="tech-section tech-client-section">
      <div class="tech-section-header tech-client-toolbar-wrap">
        <div>
          <h3>Daftar Client</h3>
          <p>Data client berdasarkan periode servis yang dipilih.</p>
        </div>
        <div class="technician-toolbar tech-client-filters">
          <label class="tech-filter-label" for="techClientPeriod">Periode</label>
          <select id="techClientPeriod" class="tech-filter-select" aria-label="Filter periode client">
            <option value="today" ${filter.period==='today'?'selected':''}>Hari Ini</option>
            <option value="this_week" ${filter.period==='this_week'?'selected':''}>1 Minggu</option>
            <option value="this_month" ${filter.period==='this_month'?'selected':''}>1 Bulan</option>
            <option value="custom" ${filter.period==='custom'?'selected':''}>Custom</option>
          </select>
          <div id="techClientCustomDates" class="tech-custom-date-group" style="${filter.period==='custom'?'display:flex':'display:none'}">
            <input id="techClientFrom" class="tech-filter-date" type="date" value="${escapeHtml(filter.from||'')}" aria-label="Tanggal mulai">
            <span class="tech-date-separator">s/d</span>
            <input id="techClientTo" class="tech-filter-date" type="date" value="${escapeHtml(filter.to||'')}" aria-label="Tanggal akhir">
          </div>
          <input id="techClientSearch" class="tech-client-search" placeholder="Cari client / barang / ID servis" aria-label="Cari client">
        </div>
      </div>
      <div class="tech-client-period-summary">
        <span>Periode: <strong>${filter.period==='today'?'Hari Ini':filter.period==='this_month'?'1 Bulan':filter.period==='custom'?'Custom':'1 Minggu'}</strong></span>
        <span>Total: <strong>${filteredJobs.length}</strong></span>
      </div>
      <div class="tech-table-wrap tech-client-table-wrap">
        <table class="tech-table tech-client-table">
          <thead>
            <tr>
              <th>ID SERVIS</th>
              <th>TANGGAL</th>
              <th>CUSTOMER</th>
              <th>NO. WHATSAPP</th>
              <th>ALAMAT</th>
              <th>GOOGLE MAPS</th>
              <th>BARANG</th>
              <th>KELUHAN</th>
              <th>MEDIA CUSTOMER</th>
            </tr>
          </thead>
          <tbody id="techClientRows">
            ${filteredJobs.map(r=>{
              const form=getServiceFormFields(r);
              const dateValue=form.tanggal||techClientDateValue(r)||'-';
              return `<tr data-search="${escapeHtml([r.id,r.customer_name,r.phone,r.alamat,r.item_name,r.keluhan].join(' ').toLowerCase())}">
                <td><strong>${escapeHtml(r.id||'-')}</strong></td>
                <td>${escapeHtml(dateValue)}</td>
                <td>${escapeHtml(form.nama||r.customer_name||'-')}</td>
                <td>${escapeHtml(form.whatsapp||r.phone||'-')}</td>
                <td class="tech-cell-address">${escapeHtml(form.alamat||r.alamat||'-')}</td>
                <td>${(form.google_maps||r.google_maps||r.maps)?`<a class="tech-map-link" href="${escapeHtml(form.google_maps||r.google_maps||r.maps)}" target="_blank" rel="noopener">Buka Maps</a>`:'-'}</td>
                <td>${escapeHtml(form.barang||r.item_name||'-')}</td>
                <td class="tech-cell-complaint">${escapeHtml(form.keluhan||r.keluhan||'-')}</td>
                <td>${form.media_customer.length?`<button type="button" class="tech-btn secondary" data-tech-customer-media="${escapeHtml(r.id||'')}">Lihat Media</button>`:'<span class="tech-muted">Belum Ada</span>'}</td>
              </tr>`;
            }).join('')||'<tr><td colspan="9"><div class="tech-empty">Tidak ada client pada periode yang dipilih.</div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  }


  function techStatusPage(){
    const jobs=techAssigned();
    const filter=window.__TECH_CLIENT_FILTER__ || {period:'this_week',from:'',to:''};
    const active=jobs.filter(r=>getServiceDisplayStatus(r.status)!=='Selesai' && techClientMatchesPeriod(r,filter));
    return `<div class="tech-section tech-status-page">
      <div class="tech-section-header tech-client-toolbar-wrap">
        <div>
          <h3>Update Status Pekerjaan</h3>
          <p>Data pekerjaan menggunakan tampilan yang sama dengan Lihat Client. Tombol Update Status berada di kolom paling akhir.</p>
        </div>
        <div class="technician-toolbar tech-client-filters">
          <label class="tech-filter-label" for="techClientPeriod">Periode</label>
          <select id="techClientPeriod" class="tech-filter-select" aria-label="Filter periode update status">
            <option value="today" ${filter.period==='today'?'selected':''}>Hari Ini</option>
            <option value="this_week" ${filter.period==='this_week'?'selected':''}>1 Minggu</option>
            <option value="this_month" ${filter.period==='this_month'?'selected':''}>1 Bulan</option>
            <option value="custom" ${filter.period==='custom'?'selected':''}>Custom</option>
          </select>
          <div id="techClientCustomDates" class="tech-custom-date-group" style="${filter.period==='custom'?'display:flex':'display:none'}">
            <input id="techClientFrom" class="tech-filter-date" type="date" value="${escapeHtml(filter.from||'')}" aria-label="Tanggal mulai">
            <span class="tech-date-separator">s/d</span>
            <input id="techClientTo" class="tech-filter-date" type="date" value="${escapeHtml(filter.to||'')}" aria-label="Tanggal akhir">
          </div>
          <input id="techClientSearch" class="tech-client-search" placeholder="Cari client / barang / ID servis" aria-label="Cari pekerjaan">
        </div>
      </div>
      <div class="tech-client-period-summary">
        <span>Periode: <strong>${filter.period==='today'?'Hari Ini':filter.period==='this_month'?'1 Bulan':filter.period==='custom'?'Custom':'1 Minggu'}</strong></span>
        <span>Belum Selesai: <strong>${active.length}</strong></span>
      </div>
      <div class="tech-table-wrap tech-client-table-wrap">
        <table class="tech-table tech-client-table tech-update-table">
          <thead>
            <tr>
              <th>ID SERVIS</th>
              <th>TANGGAL</th>
              <th>CUSTOMER</th>
              <th>NO. WHATSAPP</th>
              <th>ALAMAT</th>
              <th>GOOGLE MAPS</th>
              <th>BARANG</th>
              <th>KELUHAN</th>
              <th>MEDIA CUSTOMER</th>
              <th>UPDATE STATUS</th>
            </tr>
          </thead>
          <tbody id="techClientRows">
            ${active.map(r=>{
              const form=getServiceFormFields(r);
              const dateValue=form.tanggal||techClientDateValue(r)||'-';
              return `<tr data-search="${escapeHtml([r.id,r.customer_name,r.phone,r.alamat,r.item_name,r.keluhan].join(' ').toLowerCase())}">
                <td><strong>${escapeHtml(r.id||'-')}</strong></td>
                <td>${escapeHtml(dateValue)}</td>
                <td>${escapeHtml(form.nama||r.customer_name||'-')}</td>
                <td>${escapeHtml(form.whatsapp||r.phone||'-')}</td>
                <td class="tech-cell-address">${escapeHtml(form.alamat||r.alamat||'-')}</td>
                <td>${(form.google_maps||r.google_maps||r.maps)?`<a class="tech-map-link" href="${escapeHtml(form.google_maps||r.google_maps||r.maps)}" target="_blank" rel="noopener">Buka Maps</a>`:'-'}</td>
                <td>${escapeHtml(form.barang||r.item_name||'-')}</td>
                <td class="tech-cell-complaint">${escapeHtml(form.keluhan||r.keluhan||'-')}</td>
                <td>${form.media_customer.length?`<button type="button" class="tech-btn secondary" data-tech-customer-media="${escapeHtml(r.id||'')}">Lihat Media</button>`:'<span class="tech-muted">Belum Ada</span>'}</td>
                <td><button type="button" class="tech-btn tech-update-action-btn" data-tech-update="${escapeHtml(r.id)}">Update Status</button></td>
              </tr>`;
            }).join('')||'<tr><td colspan="10"><div class="tech-empty">Tidak ada pekerjaan yang belum selesai pada periode yang dipilih.</div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  }


  function techProofPage(){
    const jobs=techAssigned();
    const proofs=JSON.parse(localStorage.getItem('leressae_technician_proofs')||'{}');
    return `<div class="tech-section"><div class="tech-section-header"><div><h3>Upload Bukti Service</h3><p style="margin:3px 0 0;color:#64748b;font-size:12px">Bukti dikaitkan langsung dengan ID servis yang sama dengan Admin.</p></div></div>
      ${jobs.filter(r=>getServiceDisplayStatus(r.status)==='Selesai'||getServiceDisplayStatus(r.status)==='Sedang Diproses').map(r=>{
        const pr=proofs[r.id]||{};
        return `<div class="tech-proof-card" style="padding:14px 0;border-bottom:1px solid #eef2f7">
          <div class="tech-proof-preview" id="proof-preview-${escapeHtml(r.id)}">${pr.dataUrl?`<img src="${pr.dataUrl}" alt="Bukti ${escapeHtml(r.id)}">`:'Belum ada foto'}</div>
          <div><strong style="color:#0f172a">${escapeHtml(r.customer_name||'-')} — ${escapeHtml(r.item_name||'-')}</strong><div style="margin:4px 0 10px;color:#64748b;font-size:12px">ID: ${escapeHtml(r.id)} · ${techStatusBadge(r.status)}</div>
          <input class="tech-proof-input" type="file" accept="image/*" data-proof-input="${escapeHtml(r.id)}">
          <div class="tech-action-row" style="margin-top:9px"><button type="button" class="tech-btn" data-proof-save="${escapeHtml(r.id)}">Simpan Bukti</button>${pr.updatedAt?`<small style="color:#64748b;align-self:center">Terakhir: ${escapeHtml(new Date(pr.updatedAt).toLocaleString('id-ID'))}</small>`:''}</div></div>
        </div>`;
      }).join('')||'<div class="tech-empty">Belum ada pekerjaan yang siap diberi bukti service.</div>'}</div>`;
  }


  function techStockPage(){
    const stock=getStockRecords();
    const safe=stock.filter(x=>x.status==='AMAN').length, low=stock.filter(x=>x.status==='MENIPIS').length, empty=stock.filter(x=>x.status==='HABIS').length;
    return `<div class="tech-section"><div class="tech-section-header"><h3>Cek Stok</h3><span style="font-size:12px;color:#64748b">Data stok disinkronkan otomatis setiap 1 menit.</span></div>
      <div class="tech-stock-summary"><div class="tech-stock-pill"><strong>${stock.length}</strong><span>Total Item</span></div><div class="tech-stock-pill"><strong>${safe}</strong><span>Aman</span></div><div class="tech-stock-pill"><strong>${low}</strong><span>Menipis</span></div><div class="tech-stock-pill"><strong>${empty}</strong><span>Habis</span></div></div>
      <div class="tech-table-wrap"><table class="tech-table"><thead><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Stok</th><th>Minimum</th><th>Status</th></tr></thead><tbody>
      ${stock.map(x=>{const cls=x.status==='AMAN'?'safe':x.status==='MENIPIS'?'low':'empty';return `<tr><td>${escapeHtml(x.code||'-')}</td><td>${escapeHtml(x.name||'-')}</td><td>${escapeHtml(x.category||'Umum')}</td><td>${escapeHtml(x.satuan||'pcs')}</td><td><strong>${Number(x.stokSaatIni||0)}</strong></td><td>${Number(x.minimum||0)}</td><td><span class="tech-status-badge ${cls}">${escapeHtml(x.status||'-')}</span></td></tr>`}).join('')||'<tr><td colspan="7"><div class="tech-empty">Belum ada data stok.</div></td></tr>'}
      </tbody></table></div></div>`;
  }


  function renderTechView(page='dashboard', options={} ){
    const history=window.__LERESSAE_TECH_HISTORY || (window.__LERESSAE_TECH_HISTORY=['dashboard']);
    if(options.resetHistory){history.length=0;history.push(page);} else if(!options.fromBack && history[history.length-1]!==page){history.push(page);}
    const view=document.getElementById('technicianView'), title=document.getElementById('techPageTitle');
    if(!view) return;
    document.querySelectorAll('.technician-content > .leressae-back-row').forEach(el=>el.remove());
    view.querySelectorAll(':scope > .leressae-back-row').forEach(el=>el.remove());
    const titles={dashboard:'Dashboard Teknisi',clients:'Lihat Client',status:'Update Status',stock:'Cek Stok',profile:'Profil Teknisi'};
    if(title) title.textContent=titles[page]||'Dashboard';
    const subtitle=document.getElementById('techPageSubtitle'); if(subtitle) subtitle.textContent=page==='dashboard'?'Ringkasan tugas dan servis yang ditangani hari ini.':'Operasional teknisi terhubung dengan data Admin LERESSAE.';
    view.innerHTML=page==='clients'?techClients():page==='status'?techStatusPage():page==='profile'?techProfile():page==='stock'?techStockPage():techDashboard();
    view.querySelectorAll(':scope > .leressae-back-row').forEach(el=>el.remove());
    document.querySelectorAll('[data-tech-menu]').forEach(b=>b.classList.toggle('active',b.dataset.techMenu===page));
    const shell=document.getElementById('technicianShell'); if(shell) shell.dataset.techPage=page;
    saveRolePage('technician', page);
  }


  function openTechJob(id, updateOnly=false){
    const item=techAssigned().find(r=>String(r.id)===String(id));
    if(!item){showToast('Data servis tidak ditemukan.','error');return;}
    const form=getServiceFormFields(item), currentStatus=getServiceDisplayStatus(item.status), session=techSession(), customerMap=safeExternalUrl(form.google_maps||item.google_maps||item.maps||'');
    const backendProof=getServiceProofUrl(item), cache=window.__TECH_PROOF_CACHE__||(window.__TECH_PROOF_CACHE__={});
    const cachedProof=cache[String(item.id)]||{}, existingProofUrl=backendProof||cachedProof.dataUrl||'', hasProof=!!existingProofUrl;
    const cost=normalizeServiceCost(item);
    const backdrop=document.createElement('div'); backdrop.className='tech-modal-backdrop show';
    backdrop.innerHTML=`<div class="tech-modal tech-update-modal">
      <div class="tech-modal-header"><h3>${updateOnly?'Update Status':'Detail Pekerjaan'} — ${escapeHtml(item.id)}</h3><button class="tech-modal-close" type="button">×</button></div>
      <div class="tech-modal-body">
        <section class="tech-update-section"><div class="tech-update-section-title"><span>1</span><div><strong>Data Customer</strong><small>Data Google Form / Spreadsheet. Read only.</small></div></div>
          <div class="tech-readonly-grid">
            <label>ID Servis<input readonly value="${escapeHtml(item.id||'-')}"></label><label>Tanggal<input readonly value="${escapeHtml(form.tanggal||'-')}"></label>
            <label>Nama Customer<input readonly value="${escapeHtml(form.nama||item.customer_name||'-')}"></label><label>No. WhatsApp<input readonly value="${escapeHtml(form.whatsapp||item.phone||'-')}"></label>
            <label>Alamat<textarea readonly>${escapeHtml(form.alamat||'-')}</textarea></label><label>Google Maps<div class="tech-readonly-action">${customerMap?`<a class="tech-map-link" href="${escapeHtml(customerMap)}" target="_blank" rel="noopener noreferrer">Buka Maps</a>`:'-'}</div></label>
            <label>Media Customer<div class="tech-readonly-action">${form.media_customer.length?`<button type="button" class="tech-btn secondary" data-tech-customer-media="${escapeHtml(item.id||'')}">Lihat Media</button>`:'<span class="tech-muted">Belum Ada</span>'}</div></label>
            <label>Jenis Barang<input readonly value="${escapeHtml(form.barang||item.item_name||'-')}"></label><label>Merek<input readonly value="${escapeHtml(form.merk||item.merk||'-')}"></label>
            <label>Tipe<input readonly value="${escapeHtml(form.tipe||item.tipe||'-')}"></label><label>Teknisi<input readonly value="${escapeHtml(form.teknisi||item.technician||session.name||'-')}"></label>
            <label style="grid-column:1/-1">Keluhan<textarea readonly>${escapeHtml(form.keluhan||item.keluhan||'-')}</textarea></label>
          </div></section>
        ${updateOnly?`<section class="tech-update-section"><div class="tech-update-section-title"><span>2</span><div><strong>Informasi Servis</strong><small>Status terhubung dengan ID Servis.</small></div></div>
          <div class="tech-detail-grid"><div class="tech-detail-item"><span>Status Saat Ini</span><strong>${techStatusBadge(item.status)}</strong></div><div class="tech-detail-item"><span>Update Terakhir</span><strong>${escapeHtml(formatDateTimeValue(item.timestamp_update||item.created_at))}</strong></div></div></section>
          <section class="tech-update-section"><div class="tech-update-section-title"><span>3</span><div><strong>Update Status</strong><small>Status dan identitas teknisi tersimpan bersama ID Servis.</small></div></div>
            <label class="tech-full-field tech-technician-field"><span>Nama Teknisi</span><input id="techModalTechnician" type="text" value="${escapeHtml(session.name||form.teknisi||item.technician||'Teknisi')}" readonly></label>
            <div class="tech-status-action-grid" style="margin-top:12px"><button type="button" class="tech-status-choice progress-choice ${currentStatus==='Sedang Diproses'?'active':''}" data-tech-status-choice="Sedang Diproses">◔ <span>Sedang Diproses</span></button><button type="button" class="tech-status-choice done-choice ${currentStatus==='Selesai'?'active':''}" data-tech-status-choice="Selesai" ${currentStatus!=='Selesai'&&!hasProof?'disabled':''}>✓ <span>Selesai</span></button></div>
            <input type="hidden" id="techModalStatus" value="${escapeHtml(currentStatus)}"></section>
          <section class="tech-update-section"><div class="tech-update-section-title"><span>4</span><div><strong>Keterangan Pekerjaan</strong><small>Hasil pemeriksaan, tindakan, kondisi, sparepart, dan hasil service.</small></div></div>
            <label class="tech-full-field"><span id="techNoteLabel">${currentStatus==='Selesai'?'Keterangan Selesai':'Keterangan / Catatan Teknisi'}</span><textarea id="techModalNote" placeholder="Tuliskan keterangan pekerjaan...">${escapeHtml(item.keterangan_selesai||item.catatan_teknisi||item.notes||'')}</textarea></label></section>
          <section class="tech-update-section"><div class="tech-update-section-title"><span>5</span><div><strong>Bukti Foto Service</strong><small>JPG/JPEG/PNG. Preview dan kompres sebelum dikirim.</small></div></div>
            <div class="tech-proof-upload-grid"><div class="tech-proof-preview" id="techModalProofPreview">${hasProof?`<img src="${escapeHtml(existingProofUrl)}" alt="Bukti service">`:'Belum ada foto'}</div><div class="tech-proof-upload-control"><input id="techModalProofInput" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png"><small id="techProofState" class="tech-proof-state ${hasProof?'uploaded':'missing'}">${hasProof?'✓ Foto tersedia':'⚠ Foto belum tersedia'}</small><small>Foto belum dianggap permanen sampai backend menerimanya.</small><button type="button" class="tech-btn secondary" id="techModalProofRemove" ${hasProof?'':'style="display:none"'}>Hapus Foto</button></div></div></section>
          <section class="tech-update-section"><div class="tech-update-section-title"><span>6</span><div><strong>Biaya Service</strong><small>Gratis atau Custom; nominal tetap numerik.</small></div></div>
            <div class="tech-cost-grid"><label>Biaya Service<select id="techCostType"><option value="" ${!cost.tipe?'selected':''}>Pilih</option><option value="Gratis" ${cost.tipe==='Gratis'?'selected':''}>Gratis</option><option value="Custom" ${cost.tipe==='Custom'?'selected':''}>Custom</option></select></label>
            <label id="techCostNominalWrap" ${cost.tipe==='Custom'?'':'style="display:none"'}>Nominal<input id="techCostNominal" type="number" min="0" step="1" value="${cost.tipe==='Custom'?cost.nominal:''}" placeholder="150000"><small id="techCostFormatted">${cost.tipe==='Custom'?escapeHtml(formatRupiah(cost.nominal)):'Rp 0'}</small></label>
            <label class="tech-full-field">Keterangan Biaya<input id="techCostNote" maxlength="250" value="${escapeHtml(item.biaya_keterangan||'')}" placeholder="Biaya jasa / sparepart / pemeriksaan"></label></div></section>
          <section class="tech-update-section tech-update-submit-section"><div class="tech-submit-summary" id="techSubmitSummary">Status: <strong>${escapeHtml(currentStatus)}</strong> · Biaya: <strong>${escapeHtml(cost.label)}</strong></div><div class="tech-action-row"><button type="button" class="tech-btn" id="techModalSave">Simpan Update Status</button></div><div id="techFinishWarning" class="tech-finish-warning">⚠ Status <b>Selesai</b> terkunci sampai foto bukti tersedia.</div></section>`:`<section class="tech-update-section"><div class="tech-detail-grid"><div class="tech-detail-item"><span>Status</span><strong>${techStatusBadge(item.status)}</strong></div><div class="tech-detail-item"><span>Teknisi</span><strong>${escapeHtml(item.technician||form.teknisi||'-')}</strong></div><div class="tech-detail-item"><span>Catatan</span><strong>${escapeHtml(item.keterangan_selesai||item.notes||'-')}</strong></div><div class="tech-detail-item"><span>Biaya</span><strong>${escapeHtml(cost.label)}</strong></div></div></section>`}
      </div></div>`;
    document.body.appendChild(backdrop); const close=()=>backdrop.remove(); backdrop.querySelector('.tech-modal-close').onclick=close; backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()}); if(!updateOnly)return;
    let proofAvailable=hasProof,pendingProof=null;
    const proofCache=cache,technicianInput=backdrop.querySelector('#techModalTechnician'),input=backdrop.querySelector('#techModalProofInput'),preview=backdrop.querySelector('#techModalProofPreview'),state=backdrop.querySelector('#techProofState'),statusHidden=backdrop.querySelector('#techModalStatus'),save=backdrop.querySelector('#techModalSave'),warning=backdrop.querySelector('#techFinishWarning'),removeProof=backdrop.querySelector('#techModalProofRemove'),costType=backdrop.querySelector('#techCostType'),costNominal=backdrop.querySelector('#techCostNominal'),costWrap=backdrop.querySelector('#techCostNominalWrap'),costFormatted=backdrop.querySelector('#techCostFormatted'),costNote=backdrop.querySelector('#techCostNote'),note=backdrop.querySelector('#techModalNote'),noteLabel=backdrop.querySelector('#techNoteLabel'),summary=backdrop.querySelector('#techSubmitSummary');


    function syncUi(){const st=statusHidden.value,done=st==='Selesai'; const db=backdrop.querySelector('[data-tech-status-choice="Selesai"]'),pb=backdrop.querySelector('[data-tech-status-choice="Sedang Diproses"]'); if(db)db.disabled=!proofAvailable; if(db)db.classList.toggle('active',done); if(pb)pb.classList.toggle('active',!done); if(noteLabel)noteLabel.textContent=done?'Keterangan Selesai':'Keterangan / Catatan Teknisi'; if(warning)warning.style.display=(done&&!proofAvailable)?'block':'none'; if(costWrap)costWrap.style.display=costType.value==='Custom'?'':'none'; if(costFormatted)costFormatted.textContent=formatRupiah(Number(costNominal?.value||0)); const ct=costType.value,cn=ct==='Gratis'?0:(ct==='Custom'?Number(costNominal.value||0):null); if(summary)summary.innerHTML=`Status: <strong>${escapeHtml(st)}</strong> · Biaya: <strong>${escapeHtml(ct==='Gratis'?'Gratis':ct==='Custom'&&Number.isFinite(cn)?formatRupiah(cn):'Belum ditentukan')}</strong>`; save.disabled=done&&!proofAvailable;}
    backdrop.querySelectorAll('[data-tech-status-choice]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.disabled)return; const st=btn.dataset.techStatusChoice; if(st==='Selesai'&&!proofAvailable){showToast('Upload foto bukti terlebih dahulu sebelum memilih Selesai.','error');return;} statusHidden.value=st;syncUi();}));
    input.addEventListener('change',()=>{const file=input.files?.[0];if(!file)return;if(!['image/jpeg','image/png'].includes(file.type)){showToast('Bukti foto harus JPG, JPEG, atau PNG.','error');input.value='';return;}if(file.size>8*1024*1024){showToast('Ukuran foto maksimal 8 MB sebelum kompresi.','error');input.value='';return;}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const maxSide=1280,scale=Math.min(1,maxSide/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const dataUrl=canvas.toDataURL('image/jpeg',0.78);pendingProof={dataUrl,name:file.name.replace(/\.[^.]+$/i,'.jpg'),mime:'image/jpeg',updatedAt:new Date().toISOString()};proofAvailable=true;proofCache[String(item.id)]=pendingProof;preview.innerHTML=`<img src="${escapeHtml(dataUrl)}" alt="Preview bukti service">`;state.className='tech-proof-state uploaded';state.textContent='✓ Foto siap disimpan';removeProof.style.display='inline-flex';syncUi();showToast('Preview foto siap. Tekan Simpan Update Status untuk mengirim.','success');};img.onerror=()=>showToast('Foto tidak dapat diproses.','error');img.src=reader.result;};reader.readAsDataURL(file);});
    removeProof.addEventListener('click',()=>{pendingProof=null;delete proofCache[String(item.id)];proofAvailable=!!backendProof;input.value='';preview.innerHTML=proofAvailable?`<img src="${escapeHtml(backendProof)}" alt="Bukti service">`:'Belum ada foto';state.className='tech-proof-state '+(proofAvailable?'uploaded':'missing');state.textContent=proofAvailable?'✓ Foto tersedia':'⚠ Foto belum tersedia';if(!proofAvailable&&statusHidden.value==='Selesai')statusHidden.value='Sedang Diproses';removeProof.style.display=proofAvailable?'inline-flex':'none';syncUi();});
    costType.addEventListener('change',()=>{if(costType.value==='Gratis')costNominal.value='0';else if(costType.value==='Custom'&&(!costNominal.value||Number(costNominal.value)<0))costNominal.value='';else if(costType.value==='')costNominal.value='';syncUi();}); costNominal.addEventListener('input',()=>{costNominal.value=costNominal.value.replace(/[^\d]/g,'');syncUi();}); syncUi();
    save.onclick=async()=>{const newStatus=statusHidden.value||currentStatus,technicianName=String(technicianInput?.value||session.name||session.username||'Teknisi').trim(),notes=String(note?.value||'').trim(),ctype=String(costType?.value||'').trim();let cnominal=null;if(ctype==='Gratis')cnominal=0;if(ctype==='Custom'){if(costNominal.value===''){showToast('Nominal biaya wajib diisi jika memilih Custom.','error');return;}cnominal=Number(costNominal.value);if(!Number.isFinite(cnominal)||cnominal<0){showToast('Nominal biaya harus berupa angka >= 0.','error');return;}}if(!item.id||!session?.username||!newStatus){showToast('ID servis, login teknisi, dan status wajib ada.','error');return;}if(newStatus==='Selesai'&&!proofAvailable){showToast('Status Selesai tidak dapat disimpan sebelum bukti foto tersedia.','error');return;}const timestamp=new Date(),oldStatus=getServiceDisplayStatus(item.status),completionDate=newStatus==='Selesai'?timestamp.toISOString().slice(0,10):'',completionTime=newStatus==='Selesai'?timestamp.toTimeString().slice(0,8):'',finishNote=newStatus==='Selesai'?notes:'';const historyRecord={ID_HISTORY:'HIST-'+Date.now()+'-'+Math.random().toString(16).slice(2,6),ID_SERVIS:String(item.id),TIMESTAMP:timestamp.toISOString(),STATUS_LAMA:oldStatus,STATUS_BARU:newStatus,TEKNISI:technicianName,CATATAN:notes,KETERANGAN_SELESAI:finishNote,BIAYA_TIPE:ctype,BIAYA_NOMINAL:cnominal===null?0:cnominal,ADMIN:''};const customerSnapshot={serviceId:String(item.id),tanggal:form.tanggal||item.created_at||item.tanggal_masuk||'',customer_name:form.nama||item.customer_name||'',phone:form.whatsapp||item.phone||'',alamat:form.alamat||item.alamat||'',google_maps:form.google_maps||item.google_maps||item.maps||'',item_name:form.barang||item.item_name||'',merk:form.merk||item.merk||'',tipe:form.tipe||item.tipe||'',keluhan:form.keluhan||item.keluhan||''};const updated={...item,status:newStatus,notes,catatan_teknisi:notes,keterangan_selesai:finishNote,technician:technicianName,id_teknisi:item.id_teknisi||session.username||'',timestamp_update:timestamp.toISOString(),admin_update:'TEKNISI',admin_completed:false,admin_completed_at:'',tanggal_selesai:completionDate,waktu_selesai:completionTime,biaya_tipe:ctype,biaya_nominal:cnominal,biaya_keterangan:String(costNote?.value||'').trim(),bukti_foto:pendingProof?.dataUrl||backendProof||item.bukti_foto||'',customer_snapshot:customerSnapshot,service_history_record:historyRecord};save.disabled=true;try{if(isApiConfigured()){const response=await apiRequest('updateServiceStatus',{serviceId:String(item.id),status:newStatus,admin_completed:false,admin_completed_at:'',admin_update:'TEKNISI',technician:technicianName,timestamp_update:timestamp.toISOString(),tanggal_selesai:completionDate,catatan_teknisi:notes,keterangan_selesai:finishNote,bukti_foto:pendingProof?.dataUrl||backendProof||'',biaya_tipe:ctype,biaya_nominal:cnominal,biaya_keterangan:String(costNote?.value||'').trim(),data:updated,serviceHistory:historyRecord,customerSnapshot:customerSnapshot,token:session.token||''});if(!response||response.success===false)throw new Error(response?.message||'Update API gagal');await refreshServiceCacheFromApi();}else{const records=loadServiceRecords(),idx=records.findIndex(r=>String(r.id)===String(item.id));if(idx<0)throw new Error('Data servis tidak ditemukan di cache.');records[idx]=updated;setServiceCache(records);}recordTechnicianHistory(item.id,oldStatus,newStatus,technicianName,notes,'',historyRecord);delete proofCache[String(item.id)];close();await refreshTechData();showToast('Update status berhasil dikirim. Cek Status akan mengikuti data backend setelah sinkronisasi.','success');}catch(err){console.error('Update Status Teknisi gagal:',err);showToast('Update belum tersimpan: '+(err?.message||'gagal menghubungi backend'),'error');save.disabled=false;}};
  }


  async function refreshTechData(){
    if(isApiConfigured()){
      try{
        await refreshServiceCacheFromApi();
        await refreshStockDataFromApi();
      }catch(e){
        console.warn('Sync teknisi gagal',e);
      }
    }
    if(!isTechnicianLoggedIn()){
      return;
    }
    const shell=document.getElementById('technicianShell');
    const currentPage=shell?.dataset?.techPage || 'dashboard';
    if(document.getElementById('technicianView')){
      renderTechView(currentPage);
    }else{
      renderTechnicianPanelPage();
    }
  }


  function startTechAutoRefresh(){
    if(window.__TECH_AUTO_REFRESH_INTERVAL__){
      clearInterval(window.__TECH_AUTO_REFRESH_INTERVAL__);
    }
    refreshTechData();
    window.__TECH_AUTO_REFRESH_INTERVAL__=setInterval(()=>{
      if(isTechnicianLoggedIn()){
        refreshTechData();
      }else{
        clearInterval(window.__TECH_AUTO_REFRESH_INTERVAL__);
        window.__TECH_AUTO_REFRESH_INTERVAL__=null;
      }
    },60000);
  }


  function stopTechAutoRefresh(){
    if(window.__TECH_AUTO_REFRESH_INTERVAL__){
      clearInterval(window.__TECH_AUTO_REFRESH_INTERVAL__);
      window.__TECH_AUTO_REFRESH_INTERVAL__=null;
    }
  }
  window.renderTechnicianPanelPage=function(){
    const s=techSession();
    if(!s||s.role!=='technician'){navigateTo('page-dashboard');return;}
    let techPage=document.getElementById('page-technician');
    if(!techPage){
      techPage=document.createElement('section');
      techPage.id='page-technician';
      techPage.className='page-view active';
      techPage.setAttribute('aria-hidden','false');
      document.querySelector('.wrapper')?.appendChild(techPage);
    }
    let panel=document.getElementById('technicianPanelContent');
    if(!panel){
      panel=document.createElement('div');
      panel.id='technicianPanelContent';
      panel.className='technician-panel-wrap';
      techPage.appendChild(panel);
    }
    const allowed=['dashboard','clients','status','stock','profile'];
    const saved=getSavedRolePage('technician');
    const targetPage=allowed.includes(saved)?saved:'dashboard';
    window.__LERESSAE_TECH_HISTORY=[targetPage];
    panel.innerHTML=techPageShell(targetPage);
    renderTechView(targetPage,{resetHistory:true});
    document.querySelectorAll('.page-view').forEach(page => {
      const isTech = page.id === 'page-technician';
      page.classList.toggle('active', isTech);
      page.setAttribute('aria-hidden', isTech ? 'false' : 'true');
    });
    const detail=document.getElementById('technicianDetailContent'); if(detail) detail.innerHTML='';
  };
  if(isTechnicianLoggedIn()){
    if(typeof window.renderTechnicianPanelPage === 'function') {
      window.renderTechnicianPanelPage();
    }
    startTechAutoRefresh();
  }
  document.addEventListener('click', function(e){
    const logoutButton = e.target && e.target.closest ? e.target.closest('[data-tech-logout]') : null;
    if(!logoutButton) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.logoutTechnician();
  }, true);
  document.addEventListener('click',function(e){
    const open=e.target.closest('[data-tech-open]');
    const close=e.target.closest('[data-tech-close]');
    const menu=e.target.closest('[data-tech-menu]');
    const logout=e.target.closest('[data-tech-logout]');
    const detail=e.target.closest('[data-tech-detail-job]');
    const update=e.target.closest('[data-tech-update]');
    const refresh=e.target.closest('[data-tech-refresh]');
    const customerMedia=e.target.closest('[data-tech-customer-media]');
    if(customerMedia){openTechCustomerMedia(customerMedia.dataset.techCustomerMedia);return;}
    if(open){document.getElementById('technicianShell')?.classList.add('tech-menu-open');return;}
    if(close){document.getElementById('technicianShell')?.classList.remove('tech-menu-open');return;}
    if(menu){renderTechView(menu.dataset.techMenu);document.getElementById('technicianShell')?.classList.remove('tech-menu-open');return;}
    if(logout){logoutTechnician();return;}
    if(detail){openTechJob(detail.dataset.techDetailJob,false);return;}
    if(update){openTechJob(update.dataset.techUpdate,true);return;}
    if(refresh){refreshTechData();return;}
  });
  document.addEventListener('change',function(e){
    if(e.target.id==='techClientPeriod'){
      const value=e.target.value || 'this_week';
      const current=window.__TECH_CLIENT_FILTER__ || {};
      window.__TECH_CLIENT_FILTER__={
        period:value,
        from:value==='custom' ? (current.from||'') : '',
        to:value==='custom' ? (current.to||'') : ''
      };
      renderTechView('clients');
      return;
    }
    if(e.target.id==='techClientFrom' || e.target.id==='techClientTo'){
      const current=window.__TECH_CLIENT_FILTER__ || {period:'custom',from:'',to:''};
      current.period='custom';
      current.from=document.getElementById('techClientFrom')?.value || '';
      current.to=document.getElementById('techClientTo')?.value || '';
      window.__TECH_CLIENT_FILTER__=current;
      renderTechView('clients');
      return;
    }
  });
  document.addEventListener('input',function(e){
    if(e.target.id==='techClientSearch'){
      const q=e.target.value.toLowerCase().trim();
      document.querySelectorAll('#techClientRows tr[data-search]').forEach(row=>row.style.display=!q||row.dataset.search.includes(q)?'':'none');
    }
  });
})();
