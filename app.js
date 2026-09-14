const CONFIG = {
    GOOGLE_SHEETS: {
        WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzigMPvs3yEo1ZODkiifIBtHtYVd-K2icrrCaPUbf9-NBGfw_htARaQzRFTEVIsbPML/exec',
        ENABLED: true
    },
    AUTO_SAVE_INTERVAL: 3000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000
};

const DB_KEYS = {
    INSPECTIONS: 'inspections',
    DRAFT: 'current_draft',
    SETTINGS: 'app_settings'
};

const SYNC_STATUS = {
    PENDING: 'PENDING_SYNC',
    SYNCED: 'SYNCED',
    FAILED: 'FAILED'
};

const CATEGORY_LABELS = {
    Hardware: '💻 Máy tính',
    Projector: '📽️ Máy chiếu',
    AC: '❄️ Điều hòa',
    Electrical: '⚡ Điện',
    Furniture: '🪑 Nội thất',
    Other: '📦 Khác'
};

const RATING_LABELS = {
    1: { label: 'Rất tệ - Cần thay thế ngay', color: '#ef4444' },
    2: { label: 'Tệ - Cần sửa chữa sớm', color: '#f97316' },
    3: { label: 'Bình thường - Có vấn đề nhỏ', color: '#f59e0b' },
    4: { label: 'Tốt - Hoạt động ổn định', color: '#84cc16' },
    5: { label: 'Rất tốt - Hoàn hảo', color: '#10b981' }
};

let appState = {
    currentStep: 1,
    formData: {
        building: '',
        floor: '',
        roomNumber: '',
        inspectorName: '',
        category: '',
        rating: 0,
        defectNotes: '',
        photoData: ''
    },
    autoSaveTimer: null,
    deferredPrompt: null,
    swRegistration: null,
    online: navigator.onLine
};

function generateUUID() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStars(count) {
    return '⭐'.repeat(count) + '☆'.repeat(5 - count);
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function addSyncLog(message, type = 'info') {
    const logEl = document.getElementById('syncLog');
    const time = new Date().toLocaleTimeString('vi-VN');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    const classes = { info: 'log-info', success: 'log-success', error: 'log-error', warning: 'log-warning' };
    const cls = classes[type] || classes.info;
    
    entry.innerHTML = `<span class="log-time">[${time}]</span><span class="${cls}">${message}</span>`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
}

async function initDB() {
    localforage.config({
        name: 'VKUInspectorDB',
        storeName: 'vku_inspector',
        description: 'VKU Facility Inspection Offline Database',
        version: 1.0
    });

    const inspections = await localforage.getItem(DB_KEYS.INSPECTIONS);
    if (!inspections) {
        await localforage.setItem(DB_KEYS.INSPECTIONS, []);
    }

    const settings = await localforage.getItem(DB_KEYS.SETTINGS);
    if (!settings) {
        await localforage.setItem(DB_KEYS.SETTINGS, {
            theme: 'light',
            notifications: true,
            autoSync: true
        });
    }

    console.log('[DB] IndexedDB initialized via localforage');
    addSyncLog('IndexedDB initialized - Offline storage ready', 'success');
}

async function saveInspection(inspection) {
    const inspections = (await localforage.getItem(DB_KEYS.INSPECTIONS)) || [];
    inspections.unshift(inspection);
    await localforage.setItem(DB_KEYS.INSPECTIONS, inspections);
    
    updateQueueBadge();
    refreshHistoryList();
    refreshSyncStats();
    
    return inspection;
}

async function getInspections(filter = 'all') {
    const inspections = (await localforage.getItem(DB_KEYS.INSPECTIONS)) || [];
    
    if (filter === 'all') return inspections;
    return inspections.filter(i => i.syncStatus === filter);
}

async function updateInspectionStatus(uuid, status, error = null) {
    const inspections = (await localforage.getItem(DB_KEYS.INSPECTIONS)) || [];
    const index = inspections.findIndex(i => i.uuid === uuid);
    
    if (index !== -1) {
        inspections[index].syncStatus = status;
        inspections[index].syncedAt = status === SYNC_STATUS.SYNCED ? new Date().toISOString() : null;
        inspections[index].syncError = error;
        inspections[index].retryCount = (inspections[index].retryCount || 0) + 1;
        
        await localforage.setItem(DB_KEYS.INSPECTIONS, inspections);
    }
}

async function saveDraft() {
    await localforage.setItem(DB_KEYS.DRAFT, {
        step: appState.currentStep,
        data: appState.formData,
        savedAt: new Date().toISOString()
    });
}

async function loadDraft() {
    const draft = await localforage.getItem(DB_KEYS.DRAFT);
    if (!draft) return false;
    
    const { step, data, savedAt } = draft;
    
    if (!data.building && !data.category) return false;
    
    if (data.building) document.getElementById('building').value = data.building;
    if (data.floor) document.getElementById('floor').value = data.floor;
    if (data.roomNumber) document.getElementById('roomNumber').value = data.roomNumber;
    if (data.inspectorName) document.getElementById('inspectorName').value = data.inspectorName;
    if (data.category) {
        const radio = document.querySelector(`input[name="category"][value="${data.category}"]`);
        if (radio) radio.checked = true;
    }
    if (data.rating) {
        setRating(data.rating);
    }
    if (data.defectNotes) document.getElementById('defectNotes').value = data.defectNotes;
    if (data.photoData) {
        showPhotoPreview(data.photoData);
    }
    
    appState.formData = { ...appState.formData, ...data };
    appState.currentStep = step;
    goToStep(step);
    
    showToast(`Đã khôi phục bản nháp (lưu ${formatTimestamp(savedAt)})`, 'info');
    return true;
}

async function clearDraft() {
    await localforage.removeItem(DB_KEYS.DRAFT);
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('[SW] Service Worker not supported');
        return;
    }

    navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then((registration) => {
            appState.swRegistration = registration;
            console.log('[SW] Registered successfully, scope:', registration.scope);
            addSyncLog('Service Worker registered - Offline support active', 'success');

            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showToast('Có bản cập nhật mới! Vui lòng reload ứng dụng.', 'warning', 5000);
                    }
                });
            });

            if ('SyncManager' in window) {
                console.log('[SW] Background Sync API supported');
            } else {
                console.warn('[SW] Background Sync API not supported - will use fallback');
            }
        })
        .catch((err) => {
            console.error('[SW] Registration failed:', err);
            addSyncLog('Service Worker registration failed: ' + err.message, 'error');
        });

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC_REQUEST') {
            console.log('[SW] Received background sync request');
            addSyncLog('Background Sync triggered by Service Worker', 'info');
            manualSync();
        }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed - reloading');
        window.location.reload();
    });
}

function updateNetworkStatus() {
    appState.online = navigator.onLine;
    const statusEl = document.getElementById('networkStatus');
    const textEl = statusEl.querySelector('.status-text');
    
    if (appState.online) {
        statusEl.classList.remove('offline');
        statusEl.classList.add('online');
        textEl.textContent = 'Online';
        addSyncLog('Network connection restored', 'success');
        
        if (CONFIG.GOOGLE_SHEETS.ENABLED) {
            manualSync();
        }
    } else {
        statusEl.classList.remove('online');
        statusEl.classList.add('offline');
        textEl.textContent = 'Offline';
        showToast('Không có kết nối mạng - Dữ liệu sẽ được lưu offline', 'warning', 4000);
        addSyncLog('Network connection lost - Offline mode active', 'warning');
    }
}

async function requestBackgroundSync() {
    if (!('SyncManager' in window) || !appState.swRegistration) {
        return false;
    }

    try {
        await appState.swRegistration.sync.register('sync-inspections');
        console.log('[Sync] Background Sync registered');
        addSyncLog('Background Sync registered - will auto-sync when online', 'info');
        return true;
    } catch (err) {
        console.error('[Sync] Background Sync registration failed:', err);
        return false;
    }
}

async function sendToGoogleSheets(inspection) {
    if (!CONFIG.GOOGLE_SHEETS.ENABLED || !CONFIG.GOOGLE_SHEETS.WEB_APP_URL) {
        return { success: false, skipped: true, reason: 'Google Sheets not configured' };
    }

    const payload = {
        uuid: inspection.uuid,
        timestamp: inspection.createdAt,
        building: inspection.building,
        floor: inspection.floor,
        roomNumber: inspection.roomNumber,
        inspectorName: inspection.inspectorName,
        category: inspection.category,
        rating: inspection.rating,
        defectNotes: inspection.defectNotes,
        photoData: inspection.photoData ? '[BASE64 IMAGE ATTACHED]' : '',
        photoBase64: inspection.photoData || ''
    };

    try {
        const response = await fetch(CONFIG.GOOGLE_SHEETS.WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        return { success: true, data: response };
    } catch (err) {
        console.error('[Google Sheets] Failed:', err);
        throw err;
    }
}

async function syncSingleInspection(inspection, index, total) {
    if (inspection.syncStatus === SYNC_STATUS.SYNCED) return { skipped: true };

    addSyncLog(`Syncing ${index + 1}/${total}: ${inspection.building}-${inspection.roomNumber} (${inspection.category})`, 'info');
    
    try {
        const result = await sendToGoogleSheets(inspection);
        
        if (result.success || result.skipped) {
            await updateInspectionStatus(inspection.uuid, SYNC_STATUS.SYNCED);
            addSyncLog(`✓ Synced: ${inspection.roomNumber} - ${CATEGORY_LABELS[inspection.category]}`, 'success');
            return { success: true };
        } else {
            throw new Error(result.reason || 'Unknown error');
        }
    } catch (err) {
        await updateInspectionStatus(inspection.uuid, SYNC_STATUS.FAILED, err.message);
        addSyncLog(`✗ Failed ${inspection.roomNumber}: ${err.message}`, 'error');
        return { success: false, error: err };
    }
}

async function manualSync() {
    if (!appState.online) {
        showToast('Không thể đồng bộ: Đang offline', 'error');
        addSyncLog('Sync aborted: No network connection', 'error');
        return;
    }

    const pendingList = await getInspections(SYNC_STATUS.PENDING);
    const failedList = await getInspections(SYNC_STATUS.FAILED);
    const toSync = [...pendingList, ...failedList];

    if (toSync.length === 0) {
        showToast('Không có dữ liệu cần đồng bộ', 'info');
        addSyncLog('Sync complete: No pending items', 'info');
        return;
    }

    addSyncLog(`Starting sync: ${toSync.length} item(s)...`, 'info');
    showToast(`Đang đồng bộ ${toSync.length} báo cáo...`, 'info');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toSync.length; i++) {
        const result = await syncSingleInspection(toSync[i], i, toSync.length);
        if (result.success) successCount++;
        else if (!result.skipped) failCount++;
        
        await new Promise(r => setTimeout(r, 500));
    }

    refreshHistoryList();
    refreshSyncStats();
    updateQueueBadge();

    const msg = `Đồng bộ xong: ${successCount} thành công, ${failCount} lỗi`;
    showToast(msg, failCount > 0 ? 'warning' : 'success', 5000);
    addSyncLog(msg, failCount > 0 ? 'warning' : 'success');
}

function goToStep(step) {
    const totalSteps = 4;
    
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.progress-steps .step').forEach(el => {
        el.classList.remove('active', 'completed');
        const stepNum = parseInt(el.dataset.step);
        if (stepNum < step) el.classList.add('completed');
        if (stepNum === step) el.classList.add('active');
    });
    
    const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
    if (targetStep) targetStep.classList.add('active');
    
    document.getElementById('progressFill').style.width = `${(step / totalSteps) * 100}%`;
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    prevBtn.classList.toggle('hidden', step === 1);
    nextBtn.classList.toggle('hidden', step === totalSteps);
    submitBtn.classList.toggle('hidden', step !== totalSteps);
    
    appState.currentStep = step;
    
    if (step === totalSteps) {
        renderSummary();
    }
    
    saveDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
    switch (step) {
        case 1: {
            const building = document.getElementById('building').value.trim();
            const floor = document.getElementById('floor').value.trim();
            const roomNumber = document.getElementById('roomNumber').value.trim();
            
            if (!building) { showToast('Vui lòng chọn tòa nhà', 'warning'); return false; }
            if (!floor) { showToast('Vui lòng chọn tầng', 'warning'); return false; }
            if (!roomNumber) { showToast('Vui lòng nhập số phòng', 'warning'); return false; }
            
            appState.formData.building = building;
            appState.formData.floor = floor;
            appState.formData.roomNumber = roomNumber;
            appState.formData.inspectorName = document.getElementById('inspectorName').value.trim();
            return true;
        }
        case 2: {
            const categoryEl = document.querySelector('input[name="category"]:checked');
            if (!categoryEl) {
                showToast('Vui lòng chọn danh mục kiểm tra', 'warning');
                return false;
            }
            appState.formData.category = categoryEl.value;
            return true;
        }
        case 3: {
            if (!appState.formData.rating || appState.formData.rating === 0) {
                showToast('Vui lòng đánh giá tình trạng', 'warning');
                return false;
            }
            appState.formData.defectNotes = document.getElementById('defectNotes').value.trim();
            return true;
        }
        default:
            return true;
    }
}

function setRating(value) {
    appState.formData.rating = value;
    document.getElementById('rating').value = value;
    
    document.querySelectorAll('.star-rating .star').forEach(star => {
        const starValue = parseInt(star.dataset.value);
        star.classList.toggle('active', starValue <= value);
        star.textContent = starValue <= value ? '★' : '☆';
    });
    
    const labelEl = document.getElementById('ratingLabel');
    if (RATING_LABELS[value]) {
        labelEl.textContent = `${getStars(value)} ${RATING_LABELS[value].label}`;
        labelEl.classList.add('has-rating');
        labelEl.style.color = RATING_LABELS[value].color;
    }
}

function showPhotoPreview(dataUrl) {
    appState.formData.photoData = dataUrl;
    document.getElementById('previewImg').src = dataUrl;
    document.getElementById('photoPreview').classList.remove('hidden');
}

function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Ảnh quá lớn (>5MB), vui lòng chọn ảnh khác', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxWidth = 1024;
            const maxHeight = 1024;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            showPhotoPreview(compressed);
            showToast('Đã thêm ảnh vào báo cáo', 'success');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function renderSummary() {
    const data = appState.formData;
    const summaryEl = document.getElementById('summaryContent');
    
    const ratingHtml = appState.formData.rating 
        ? `<span class="summary-value stars">${getStars(data.rating)}</span>
           <div class="summary-value" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              ${RATING_LABELS[data.rating]?.label || ''}
           </div>`
        : '<span class="summary-value">—</span>';
    
    summaryEl.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">🏢 Tòa nhà</span>
            <span class="summary-value">Tòa ${data.building}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">🏬 Tầng</span>
            <span class="summary-value">Tầng ${data.floor}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">🚪 Phòng</span>
            <span class="summary-value">${data.roomNumber}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">👤 Người kiểm tra</span>
            <span class="summary-value">${data.inspectorName || 'Chưa ghi rõ'}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">🗂️ Danh mục</span>
            <span class="summary-value">${CATEGORY_LABELS[data.category] || data.category}</span>
        </div>
        <div class="summary-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <span class="summary-label">⭐ Đánh giá</span>
            ${ratingHtml}
        </div>
        <div class="summary-item">
            <span class="summary-label">📝 Ghi chú</span>
            <span class="summary-value">${data.defectNotes || 'Không có ghi chú'}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">📷 Hình ảnh</span>
            <span class="summary-value">${data.photoData ? '✅ Đã có ảnh' : '❌ Không có ảnh'}</span>
        </div>
        ${data.photoData ? `<div class="summary-image"><img src="${data.photoData}" alt="Inspection photo"></div>` : ''}
    `;
}

function resetForm() {
    document.getElementById('inspectionForm').reset();
    document.getElementById('photoPreview').classList.add('hidden');
    document.getElementById('previewImg').src = '';
    
    document.querySelectorAll('.star-rating .star').forEach(star => {
        star.classList.remove('active');
        star.textContent = '☆';
    });
    document.getElementById('rating').value = '';
    document.getElementById('ratingLabel').textContent = 'Vui lòng chọn đánh giá';
    document.getElementById('ratingLabel').classList.remove('has-rating');
    document.getElementById('ratingLabel').style.color = '';
    
    appState.formData = {
        building: '',
        floor: '',
        roomNumber: '',
        inspectorName: '',
        category: '',
        rating: 0,
        defectNotes: '',
        photoData: ''
    };
    
    clearDraft();
    goToStep(1);
}

async function submitInspection() {
    if (!validateStep(3)) return;
    
    const inspection = {
        uuid: generateUUID(),
        createdAt: new Date().toISOString(),
        syncStatus: appState.online ? SYNC_STATUS.PENDING : SYNC_STATUS.PENDING,
        syncedAt: null,
        retryCount: 0,
        ...appState.formData
    };
    
    await saveInspection(inspection);
    
    showToast('Báo cáo đã được lưu thành công! 🎉', 'success', 4000);
    addSyncLog(`New inspection saved: ${inspection.uuid}`, 'success');
    
    if (appState.online && CONFIG.GOOGLE_SHEETS.ENABLED) {
        await requestBackgroundSync();
        setTimeout(() => manualSync(), 1000);
    } else if (appState.online) {
        showToast('Đã lưu - Google Sheets chưa cấu hình', 'info');
    } else {
        showToast('Đã lưu offline - Sẽ tự động đồng bộ khi online', 'info');
        await requestBackgroundSync();
    }
    
    resetForm();
    switchTab('history');
}

async function refreshHistoryList() {
    const filter = document.getElementById('historyFilter').value;
    const inspections = await getInspections(filter);
    const listEl = document.getElementById('historyList');
    
    if (inspections.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>${filter === 'all' ? 'Chưa có báo cáo kiểm tra nào' : 'Không có báo cáo phù hợp bộ lọc'}</p>
                <button class="btn btn-primary" onclick="switchTab('form')">Tạo báo cáo mới</button>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = inspections.map(item => {
        const statusClass = item.syncStatus === SYNC_STATUS.SYNCED ? 'synced' : 'pending';
        const statusText = item.syncStatus === SYNC_STATUS.SYNCED ? '✓ Đã đồng bộ' : '⏳ Chờ đồng bộ';
        const stars = item.rating ? getStars(item.rating) : '';
        
        return `
            <div class="history-item ${statusClass}">
                <div class="history-header">
                    <div class="history-location">
                        <h3>
                            Tòa ${item.building} - Phòng ${item.roomNumber}
                            <span class="history-category-badge">${CATEGORY_LABELS[item.category] || item.category}</span>
                        </h3>
                        <span class="room">${formatTimestamp(item.createdAt)}</span>
                    </div>
                    <div class="history-status ${statusClass}">${statusText}</div>
                </div>
                <div class="history-meta">
                    <span>🔹 Tầng ${item.floor}</span>
                    ${item.inspectorName ? `<span>👤 ${item.inspectorName}</span>` : ''}
                    ${item.syncedAt ? `<span>📡 ${formatTimestamp(item.syncedAt)}</span>` : ''}
                </div>
                ${stars ? `<div class="history-rating">${stars}</div>` : ''}
                ${item.defectNotes ? `<div class="history-notes">${item.defectNotes}</div>` : ''}
                ${item.photoData ? `<div class="history-image"><img src="${item.photoData}" alt="Inspection"></div>` : ''}
                ${item.syncStatus !== SYNC_STATUS.SYNCED ? `
                    <div class="history-actions">
                        <button class="btn btn-primary btn-sm" onclick="retrySyncOne('${item.uuid}')">🔄 Đồng bộ lại</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteInspection('${item.uuid}')">🗑️ Xóa</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function retrySyncOne(uuid) {
    const inspections = await getInspections();
    const item = inspections.find(i => i.uuid === uuid);
    if (!item) return;
    
    if (!appState.online) {
        showToast('Đang offline, không thể đồng bộ', 'error');
        return;
    }
    
    const result = await syncSingleInspection(item, 0, 1);
    refreshHistoryList();
    refreshSyncStats();
    updateQueueBadge();
}

async function deleteInspection(uuid) {
    if (!confirm('Bạn có chắc muốn xóa báo cáo này không?')) return;
    
    const inspections = (await localforage.getItem(DB_KEYS.INSPECTIONS)) || [];
    const filtered = inspections.filter(i => i.uuid !== uuid);
    await localforage.setItem(DB_KEYS.INSPECTIONS, filtered);
    
    refreshHistoryList();
    refreshSyncStats();
    updateQueueBadge();
    showToast('Đã xóa báo cáo', 'success');
}

async function refreshSyncStats() {
    const all = await getInspections('all');
    const synced = await getInspections(SYNC_STATUS.SYNCED);
    const pending = await getInspections(SYNC_STATUS.PENDING);
    const failed = await getInspections(SYNC_STATUS.FAILED);
    
    document.getElementById('totalReports').textContent = all.length;
    document.getElementById('syncedReports').textContent = synced.length;
    document.getElementById('pendingReports').textContent = pending.length + failed.length;
    
    const queueListEl = document.getElementById('syncQueueList');
    const toSync = [...pending, ...failed];
    
    if (toSync.length === 0) {
        queueListEl.innerHTML = `<div class="empty-state" style="padding: 24px;">
            <div class="empty-icon">✅</div>
            <p style="margin-bottom: 0;">Tất cả báo cáo đã được đồng bộ!</p>
        </div>`;
    } else {
        queueListEl.innerHTML = toSync.map(item => `
            <div class="queue-item">
                <span class="queue-item-icon">📋</span>
                <div class="queue-item-info">
                    <div class="queue-item-title">Tòa ${item.building} - Phòng ${item.roomNumber} (${CATEGORY_LABELS[item.category] || item.category})</div>
                    <div class="queue-item-time">${formatTimestamp(item.createdAt)}</div>
                </div>
                <div class="queue-item-status pending">${item.retryCount || 0} lần thử</div>
            </div>
        `).join('');
    }
}

async function updateQueueBadge() {
    const pending = await getInspections(SYNC_STATUS.PENDING);
    const failed = await getInspections(SYNC_STATUS.FAILED);
    const total = pending.length + failed.length;
    
    const badge = document.getElementById('queueBadge');
    const countEl = document.getElementById('queueCount');
    
    if (total > 0) {
        badge.classList.remove('hidden');
        countEl.textContent = total;
    } else {
        badge.classList.add('hidden');
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-section').forEach(section => {
        section.classList.toggle('active', section.id === `${tabName}Section`);
    });
    
    if (tabName === 'history') refreshHistoryList();
    if (tabName === 'sync') refreshSyncStats();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        appState.deferredPrompt = e;
        
        setTimeout(() => {
            document.getElementById('installPrompt').classList.remove('hidden');
        }, 2000);
    });
    
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (!appState.deferredPrompt) return;
        
        appState.deferredPrompt.prompt();
        const { outcome } = await appState.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            showToast('🎉 Đang cài đặt ứng dụng...', 'success');
            addSyncLog('PWA installation initiated by user', 'success');
        }
        
        appState.deferredPrompt = null;
        document.getElementById('installPrompt').classList.add('hidden');
    });
    
    document.getElementById('dismissInstall').addEventListener('click', () => {
        document.getElementById('installPrompt').classList.add('hidden');
    });
    
    window.addEventListener('appinstalled', () => {
        showToast('✅ Ứng dụng đã được cài đặt thành công!', 'success', 5000);
        addSyncLog('PWA installed successfully', 'success');
        document.getElementById('installPrompt').classList.add('hidden');
        appState.deferredPrompt = null;
    });
}

function setupFormInputs() {
    document.getElementById('prevBtn').addEventListener('click', () => {
        goToStep(Math.max(1, appState.currentStep - 1));
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (!validateStep(appState.currentStep)) return;
        goToStep(Math.min(4, appState.currentStep + 1));
    });
    
    document.getElementById('submitBtn').addEventListener('click', submitInspection);
    
    document.querySelectorAll('.star-rating .star').forEach(star => {
        star.addEventListener('click', () => {
            setRating(parseInt(star.dataset.value));
        });
    });
    
    document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);
    
    document.getElementById('removePhoto').addEventListener('click', () => {
        document.getElementById('photoPreview').classList.add('hidden');
        document.getElementById('previewImg').src = '';
        appState.formData.photoData = '';
    });
    
    const inputs = ['building', 'floor', 'roomNumber', 'inspectorName', 'defectNotes'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const field = id;
            appState.formData[field] = document.getElementById(id).value;
        });
    });
    
    document.querySelectorAll('input[name="category"]').forEach(radio => {
        radio.addEventListener('change', () => {
            appState.formData.category = radio.value;
        });
    });
}

function setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    document.getElementById('historyFilter').addEventListener('change', refreshHistoryList);
    
    document.getElementById('manualSyncBtn').addEventListener('click', manualSync);
    
    document.getElementById('clearPendingBtn').addEventListener('click', async () => {
        if (!confirm('Xóa tất cả các báo cáo đang chờ đồng bộ?')) return;
        
        const all = await getInspections('all');
        const synced = all.filter(i => i.syncStatus === SYNC_STATUS.SYNCED);
        await localforage.setItem(DB_KEYS.INSPECTIONS, synced);
        
        refreshHistoryList();
        refreshSyncStats();
        updateQueueBadge();
        showToast('Đã xóa hàng đợi đồng bộ', 'success');
    });
}

function setupAutoSave() {
    const triggerSave = () => {
        if (appState.autoSaveTimer) clearTimeout(appState.autoSaveTimer);
        appState.autoSaveTimer = setTimeout(() => {
            saveDraft();
        }, CONFIG.AUTO_SAVE_INTERVAL);
    };
    
    document.addEventListener('input', triggerSave);
    document.addEventListener('change', triggerSave);
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('star') || e.target.closest('.category-card')) {
            triggerSave();
        }
    });
}

function handleURLParams() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['form', 'history', 'sync'].includes(tab)) {
        switchTab(tab);
    }
}

async function init() {
    console.log('🚀 VKU Facility Inspector starting...');
    
    await initDB();
    registerServiceWorker();
    
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    setupFormInputs();
    setupTabNavigation();
    setupInstallPrompt();
    setupAutoSave();
    
    await loadDraft();
    refreshHistoryList();
    refreshSyncStats();
    updateQueueBadge();
    
    handleURLParams();
    
    addSyncLog('App initialized successfully', 'success');
    
    if (appState.online) {
        const pending = await getInspections(SYNC_STATUS.PENDING);
        if (pending.length > 0) {
            addSyncLog(`Found ${pending.length} pending items on startup`, 'info');
        }
    }
    
    console.log('✅ VKU Facility Inspector ready!');
}

window.switchTab = switchTab;
window.retrySyncOne = retrySyncOne;
window.deleteInspection = deleteInspection;
window.manualSync = manualSync;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
