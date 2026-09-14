# 🏫 VKU Facility Inspector - PWA Offline

> Cross-Platform Progressive Web App cho kiểm tra cơ sở vật chất khuôn viên VKU. Hoạt động hoàn toàn Offline với IndexedDB & Background Sync. Tích hợp lưu trữ Google Sheets.

---

## ✨ Tính Năng Chính

| Tính năng | Mô tả |
|---|---|
| 📱 **PWA Standalone | `manifest.json` display: standalone, icons 192/512, cài đặt trên điện thoại |
| 🔌 **Offline First** | Service Worker Cache-First, khởi chạy dưới 1s khi offline |
| 📝 **Multi-step Form** | 4 bước: Vị trí → Danh mục → Đánh giá → Xác nhận |
| 💾 **IndexedDB** | localforage, tự động lưu bản nháp mỗi 3s, không mất dữ liệu |
| 🔄 **Background Sync** | Hàng đợi UUID + PENDING_SYNC, tự động gửi khi online |
| 📷 **Chụp ảnh** | Tối ưu ảnh < 1MB, lưu Base64 vào DB |
| 📊 **Google Sheets** | Lưu vào Google Sheets qua Apps Script Web App |
| 🧭 **Responsive** | Mobile-first, hỗ trợ cả Desktop |

---

## 📁 Cấu Trúc Dự Án

```
mini-project1/
├── index.html              # Entry point + giao diện 3 tab
├── styles.css              # CSS theme màu #0284c7, responsive
├── app.js                  # Logic chính: form, DB, sync, offline
├── sw.js                   # Service Worker: Cache-First + Background Sync
├── manifest.json           # PWA manifest (standalone + icons)
├── offline.html            # Trang dự phòng khi offline
├── generate-icons.js       # Script tạo PNG icons (Node.js)
├── google-sheets-script.js   # Google Apps Script code
├── icons/                  # PNG icons 72→512px
│   ├── icon-72x72.png
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   └── ...
└── Mini-Project-1-Report-Template.md
```

---

## 🚀 Cài Đặt Nhanh (3 Bước)

### Bước 1: Chạy Server Local (Yêu cầu HTTPS cho PWA)

Cách 1 - Python (nếu có Python):
```bash
# Python 3
python -m http.server 8080
```

Cách 2 - Node.js:
```bash
npx http-server -p 8080 -c-1
```

Sau đó mở: **http://localhost:8080**

> ⚠️ PWA yêu cầu **HTTPS** hoặc **localhost** để Service Worker + Install Prompt hoạt động.

### Bước 2: Cấu hình Google Sheets (Tùy chọn cho Sync)

1. Tạo Sheet mới: https://sheets.new → đặt tên **"VKU Inspections"**
2. Hàng 1 tạo cột: `UUID | Thời gian | Tòa | Tầng | Phòng | Người kiểm tra | Danh mục | Đánh giá | Ghi chú | Ảnh | Đồng bộ lúc`
3. Mở **Extensions → Apps Script**
4. Dán toàn bộ code từ file [google-sheets-script.js](./google-sheets-script.js)
5. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy **Web app URL**
7. Mở [app.js](./app.js), tìm `CONFIG.GOOGLE_SHEETS`:
   ```javascript
   GOOGLE_SHEETS: {
       WEB_APP_URL: 'https://script.google.com/macros/s/XXXX/exec',  // paste URL
       ENABLED: true                                                   // bật lên
   }
   ```

### Bước 3: Deploy lên HTTPS (Cloudflare / Vercel)

**Cloudflare Pages:**
```bash
# 1. Init git repo
git init
git add -A
git commit -m "Initial commit"

# 2. Tạo repo trên GitHub, push lên
git remote add origin https://github.com/YOURNAME/mini-project1.git
git push -u origin main

# 3. Vào Cloudflare Pages → Connect Git → chọn repo
#    Framework preset: None (Static)
#    Build command: (trống)
#    Build output: /
```

Hoặc **Vercel**: Import repo → Deploy → Done.

---

## 📱 Cài Đặt Ứng Dụng Trên Điện Thoại

**Android (Chrome / Edge):**
1. Mở trang web đã deploy (HTTPS)
2. Chờ banner "Cài đặt ứng dụng" hiện ở dưới → nhấn **Cài đặt**
3. Hoặc: Menu (⋮) → **Install app / Cài đặt ứng dụng**
4. Icon app sẽ xuất hiện trên màn hình chính như app native

**iOS (Safari):**
1. Mở trang bằng Safari
2. Nhấn nút **Share** (↑ ở giữa)
3. Chọn **Add to Home Screen → Thêm vào Màn hình chính**
4. Đặt tên → **Add**

**Desktop (Chrome / Edge):**
- URL bar bên phải xuất hiện icon 📥 Install App → Click → Install

---

## 🔧 Kiến Trúc Kỹ Thuật

### Service Worker - Cache-First Strategy
```javascript
// sw.js
APP_SHELL_ASSETS = ['index.html', 'styles.css', 'app.js', 'manifest.json', ...]

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;      // Cache hit - sub-second boot offline
            return fetch(request).then(network => {
                cache.put(request, network.clone());
                return network;
            });
        })
    );
});
```

### IndexedDB Schema (localforage):
```javascript
KEY: 'inspections' → [
  {
    uuid: "crypto-UUID",
    createdAt: ISO8601,
    syncStatus: "PENDING_SYNC | SYNCED | FAILED",
    building, floor, roomNumber, category, rating, defectNotes, photoData(base64)
  }
]
```

### Background Sync Flow:
```
User nhập form → Save vào IndexedDB (PENDING_SYNC)
    ↓ (sw.js register: sw.sync.register('sync-inspections')
    ↓ (Mất mạng: Không làm gì, giữ PENDING_SYNC
    ↓ (Mạng về: Service Worker tự kích hoạt event 'sync')
    ↓ PostMessage → postMessage → app.js.manualSync()
    ↓ Fetch từng item đến Google Sheets → đánh dấu SYNCED
```

---

## 🛠️ Scripts Hỗ Trợ

Tạo lại icons nếu muốn thiết kế khác:
```bash
node generate-icons.js
```

Hoặc mở [generate-icons.html](./generate-icons.html) trong trình duyệt để xem trước & download từng cái (chất lượng cao hơn (từ Canvas 渐变với).

---

## ✅ Kiểm Tra PWA Hoạt Động

Mở DevTools → **Application** tab:

- ✅ Manifest: hiển thị name, icons, start_url, display: standalone
- ✅ Service Workers: registration active, running
- ✅ Service Workers → Offline: Reload vẫn xem trang vẫn chạy (App Shell cache)
- ✅ Storage → IndexedDB → VKUInspectorDB
- ✅ Tạo 1 form → Network → Offline ✓ Save → Lên tab Đồng bộ → Online → Sync ✓

---

## 🧪 Test Offline Workflow

1. ✅ Tải trang khi Offline (DevTools → Network → Offline)
2. ✅ Điền đầy đủ 4 bước form → Lưu
3. ✅ F5 refresh → dữ liệu vẫn còn (draft restore từ IndexedDB)
4. ✅ Tab Lịch sử thấy báo cáo mới trạng thái "⏳ Chờ đồng bộ"
5. ✅ Bật lại mạng (bỏ Offline mode) → Hiển thị Online badge Online
6. ✅ Auto-sync + Background Sync → chuyển thành "✓ Đã đồng bộ"

---

## 🔍 Solved Technical Challenges

| Vấn đề | Giải pháp |
|---|---|
| Ảnh làm IndexedDB đầy 50MB | Nén JPEG 80% + Canvas resize max 1024px → ~100KB/ảnh |
| Background Sync khi app đóng | Cache API `event.waitUntil()` + sync tag `sync-inspections` |
| Dữ liệu bị mất khi refresh | Auto-save bản nháp mỗi 3s + loadDraft() khi mở app |
| Google Sheets CORS | Apps Script Web App `ContentService JSON + mode: no-cors |

---

## 📜 License

MIT License - VKU Cross-Platform Mobile App Development Course Mini-Project 1

---

Made with ❤️ for VKU - Đại học Việt - Hàn
