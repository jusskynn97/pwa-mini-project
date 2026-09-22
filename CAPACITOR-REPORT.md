# MINI-PROJECT TECHNICAL REPORT — PWA → Capacitor Native Migration

**Course:** Cross-Platform Mobile App Development (VKU)  
**Mini-Project Title:** Mini-Project 1 — Phase 2: PWA → Capacitor Native Migration (4 Plugins)  
**Student Name:** [Bui Dang Trung Kien] — Student ID: [23IT.B102] — Contribution: [100%]  
**Submission Date:** [22/09/2026]  

---

## 1. GENERAL INFORMATION & DELIVERABLE LINKS

- **🔗 Live Demo (PWA gốc):** [https://pwa-mini-project-tawny.vercel.app/]
- **💻 GitHub Repository:** [https://github.com/jusskynn97/pwa-mini-project/tree/feature/implement-capacitor]
- **📦 APK Output Path (Android Release):** `android/app/release/app-release.apk` (build bằng Android Studio theo [CAPACITOR-README.md](./CAPACITOR-README.md#4-build-android-apk--aab)) (https://github.com/jusskynn97/pwa-mini-project/blob/feature/implement-capacitor/app-release.apk)
- **📘 Capacitor Setup Guide:** [CAPACITOR-README.md](./CAPACITOR-README.md) — Full step-by-step build & troubleshooting
- **🎥 Video Demo (Optional):** [https://youtu.be/xxx]

### Mục tiêu của Phase 2
Phase 1 đã cung cấp PWA hoạt động hoàn toàn offline (IndexedDB + Background Sync + Google Sheets). Mục tiêu **Phase 2 (báo cáo này)** là:
> Wrap PWA hiện có thành **ứng dụng native Android/iOS** bằng Capacitor 6, đồng thời bổ sung **4 plugins native** để truy cập phần cứng thiết bị (mà PWA không làm được hoặc hạn chế): Camera native + lưu vào Gallery, Network status realtime, GPS high-accuracy, Local Notifications.

---

## 2. FEATURE IMPLEMENTATION CHECKLIST (PHASE 2 — CAPACITOR)

| # | Required Feature | Status | Implementation Details & Acceptance Level |
|:-:|---|:---:|---|
| **1** | Khởi tạo project Capacitor v6 (`cap init`), `appId = com.vku.inspector` | ✅ Complete | [capacitor.config.json](./capacitor.config.json) + [package.json](./package.json) cài `@capacitor/core@6.2.2`, `@capacitor/cli@6.2.2`, `@capacitor/android@6.2.2` (cùng version, không ERESOLVE). `webDir = www` |
| **2** | 📷 **@capacitor/camera**: Chụp ảnh + Lưu vào Gallery | ✅ Complete | `takePhoto()` = `Camera.getPhoto({source: 'CAMERA', saveToGallery: true, resultType: 'base64', correctOrientation: true, quality: 85})`. Android 10+ dùng **MediaStore API** tự động. Nén Canvas 1024px/JPEG 80% → IndexedDB. 2 nút riêng "Chụp ảnh / Chọn từ thư viện" ở Step 3. Fallback: `input[type=file]` cho PWA |
| **3** | 📡 **@capacitor/network**: Trạng thái mạng real-time | ✅ Complete | `setupCapacitorNetwork()` dùng `Network.getStatus()` + `addListener('networkStatusChange')`. Cập nhật badge header ON/OFF LINE. Mất mạng → Local Notification. Ưu tiên hơn `navigator.onLine` (check hardware interface thay vì request thử). Fallback: `window.ononline/offline` events |
| **4** | 📍 **@capacitor/geolocation**: GPS vị trí phòng kiểm tra | ✅ Complete | Step 1 thêm nút 📍 "Lấy vị trí hiện tại" → `Geolocation.getCurrentPosition({enableHighAccuracy: true, timeout: 15000})`. Lưu 3 fields mới `latitude, longitude, locationAccuracy`. Gửi kèm payload Google Sheets. Hiển thị Summary Step 4. Fallback: `navigator.geolocation` web API |
| **5** | 🔔 **@capacitor/local-notifications**: 6 loại thông báo | ✅ Complete | `requestPermissions()` lúc init. Gửi notification tại: lấy GPS xong, mất mạng offline, chụp ảnh OK, lưu report online, lưu report offline, sync thành công, sync thất bại. `smallIcon` + `iconColor=#0284c7` (theo theme VKU). Fallback PWA: Toast notification |
| **6** | Android platform tạo thành công (`npx cap add android`) | ✅ Complete | Thư mục [android/](./android) được tạo, Gradle sync OK. 4 plugins được auto-register trong [capacitor.build.gradle](./android/app/capacitor.build.gradle). Bundle ID `com.vku.inspector`, `targetSdkVersion=34`, `minSdkVersion=22` |
| **7** | AndroidManifest permissions đầy đủ 4 plugins | ✅ Complete | [AndroidManifest.xml](./android/app/src/main/AndroidManifest.xml#L38-L63) khai báo: CAMERA, READ_MEDIA_IMAGES, WRITE_EXTERNAL_STORAGE, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, POST_NOTIFICATIONS, USE_EXACT_ALARM, ACCESS_NETWORK_STATE |
| **8** | **Cross-Platform Fallback** (PWA ↔ Native cùng 1 codebase) | ✅ Complete | `IS_CAPACITOR = !!window.Capacitor` detection. Tất cả 4 plugin đều **có fallback Web API** tương đương → PWA deploy trên HTTPS vẫn hoạt động 100%. Không hard-code Android-only |
| **9** | Responsive & Native-feel UI optimizations | ✅ Complete | [styles.css](./styles.css) append: iOS safe-area notch, `-webkit-user-select:none` cho buttons, `.photo-actions` grid 2 cột, `.gps-status` card xanh, breakpoint 480px mobile stack 1 cột |
| **10** | Workflow build chuẩn (copy:www → cap:sync → cap:add:android) | ✅ Complete | Scripts `package.json` tự động hoá copy asset → sync → add platform. Không copy tay `android/app/src/main/assets/public` |
| **11** | Form data mở rộng (GPS fields) → sync Google Sheets OK | ✅ Complete | `sendToGoogleSheets` payload thêm `latitude, longitude, locationAccuracy`. Load draft from IndexedDB khôi phục GPS state vào UI. ResetForm reset GPS. Summary card hiển thị vị trí. |

**Acceptance Rate:** 11/11 ✅ Complete.

---

## 3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE

### 3.1 Directory Structure sau migration

```
mini-project1/
├── index.html                   3-tab SPA + Thêm GPS Step 1 + 2 nút Camera Step 3
├── styles.css                   VKU Blue theme + Capacitor native styles (append bottom)
├── app.js                       Logic chính (PHASE 2: thêm 4 plugin wrappers + detection)
├── sw.js                        Service Worker (giữ nguyên PHASE 1 — vẫn chạy được)
├── manifest.json                PWA manifest (giữ nguyên PHASE 1)
├── offline.html                 Fallback offline page
├── google-sheets-script.js      Apps Script (giữ nguyên PHASE 1)
├── generate-icons.js / .html    Tooling icons
├── icons/                       PNG icons 72→512px
├── www/                         ⭐ MỚI PHASE 2 — Web bundle output (cap sync from here)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── manifest.json
│   ├── sw.js
│   ├── offline.html
│   └── icons/
│
├── package.json                 ⭐ MỚI PHASE 2 — Capacitor deps + npm scripts
├── package-lock.json            npm lockfile (auto)
│
├── capacitor.config.json        ⭐ MỚI PHASE 2 — Cấu hình appId, webDir, plugins, permissions
│
├── android/                     ⭐ MỚI PHASE 2 — Native Android project (từ cap add android)
│   ├── app/
│   │   ├── capacitor.build.gradle      4 plugins auto-declared
│   │   ├── build.gradle                versionCode/versionName, signing configs
│   │   └── src/main/
│   │       ├── AndroidManifest.xml     Permissions cho 4 plugins (đã sửa tay)
│   │       ├── java/com/vku/inspector/MainActivity.java (extend BridgeActivity)
│   │       └── res/values/strings.xml  app_name = "VKU Inspector"
│   ├── variables.gradle         compileSdk=34, targetSdk=34, minSdk=22
│   ├── gradle.properties
│   └── build.gradle
│
├── README.md                    PHASE 1 — PWA Setup Guide
├── CAPACITOR-README.md          ⭐ MỚI PHASE 2 — Full Capacitor/Build/Troubleshoot Guide (File tách riêng)
├── CAPACITOR-REPORT.md          ⭐ MỚI PHASE 2 — Báo cáo migration này
├── Mini-Project-1-Final-Report.md   PHASE 1 Final Report
└── Mini-Project-1-Report-Template.md
```

### 3.2 State Management & Capacitor Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RENDER LAYER (index.html — SHARED)                     │
│   Tab Nav ↔ Step 1 (New 📍 GPS btn) ↔ Step 2 ↔ Step 3 (New 📷 2 btns)         │
│        ↔ Step 4 (New 📍📍 Summary GPS) ↔ Toast ↔ Notification Panel          │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │ events / user interactions
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  STATE + ADAPTER LAYER (app.js — NEW PHASE 2)                 │
│                                                                               │
│  ┌────────────────────────┐    ┌─────────────────────────────────────────┐   │
│  │ IS_CAPACITOR DETECTOR  │    │ 4 PLUGIN WRAPPERS (with fallback)        │   │
│  │ = !!window.Capacitor   │───▶│                                         │   │
│  └────────────────────────┘    │ • takePhoto()   ← @capacitor/camera     │   │
│          │                      │   fallback: input[type=file]            │   │
│          │                      │ • pickImage()   ← @capacitor/camera     │   │
│          │                      │ • setupCapacitorNetwork()               │   │
│          │                      │   fallback: window.online/offline       │   │
│          │                      │ • getGpsLocation() ← @capacitor/geo     │   │
│          │                      │   fallback: navigator.geolocation       │   │
│          │                      │ • sendLocalNotification() ← @capacitor/ │   │
│          │                      │   local-notifications (fallback: Toast) │   │
│          │                      └─────────────────────────────────────────┘   │
│          │                              │                                      │
│          │ appState.formData {          │ compressAndShowPhoto()              │
│          │   building, floor, room,     │ (Canvas 1024px JPEG 80%)            │
│          │   + ⭐ latitude, longitude,  ├─ ▶ updateNetworkStatus()            │
│          │   + ⭐ locationAccuracy,     │    ↓ badge + auto trigger sync      │
│          │   inspector, category,       │                                      │
│          │   rating, notes, photoData } │                                      │
│          └──────────────┬───────────────┘                                      │
└─────────────────────────┼──────────────────────────────────────────────────────┘
                          │ save / draft / sync
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               PERSISTENCE LAYER (SHARED — GIỮ NGUYÊN PHASE 1)                │
│                                                                               │
│  localforage IndexedDB          → inspections[] (3 fields GPS NEW added)      │
│  (UUID, createdAt, PENDING_SYNC → current_draft (auto-save 3s)                │
│         / SYNCED / FAILED)                                                    │
└──────────────────────────────────┬────────────────────────────────────────────┘
                                   │ when online / background sync
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              CLOUD LAYER (SHARED — Google Apps Script Web App)                │
│                                                                               │
│  doPost(POST request)                                                         │
│   → appendRow(sheet) with columns: UUID | Thời gian | Tòa | Tầng | Phòng      │
│                                       | Người kiểm tra | Danh mục | Đánh giá  │
│                                       | Ghi chú | Ảnh (base64 → Drive URL)    │
│                                       | Đồng bộ lúc                            │
│                                       | ⭐ Vĩ độ (NEW)                        │
│                                       | ⭐ Kinh độ (NEW)                      │
│                                       | ⭐ Độ chính xác (NEW)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Key Architectural Decisions (PHASE 2)

| Quyết định | Lý do |
|---|---|
| **Pin version `6.2.2` exact cho mọi `@capacitor/*`** | Tránh **ERESOLVE peer conflict**. User gặp lỗi này ngay khi `npm i @capacitor/android` (cài v8.x mới nhất auto → đòi core v8, project có core v6). Solution: --save-exact. |
| **webDir = www thay vì `.`** | Best practice Capacitor: tách source code (`.`) khỏi production web bundle (`www/`). Rõ ràng, tránh copy node_modules, .git vào assets APK (tăng size app). Script `copy:www` chỉ copy files cần thiết. |
| **`<script src="capacitor.js">` (không import ES modules)** | Trong Android WebView, Capacitor CLI tự động **inject** file `capacitor.js` vào `assets/public/` lúc sync — không cần import tay từ `node_modules`. Biến toàn cục `window.Capacitor` + `window.Capacitor.Plugins.XXX` được tạo sẵn. |
| **`IS_CAPACITOR = !!window.Capacitor` detection đơn giản** | Tránh detection dựa vào UA string (không chính xác). Trên PWA browser: `window.Capacitor = undefined` → fallback web APIs. |
| **1 codebase cho 3 nền tảng** | Không tách `app.native.js` + `app.web.js` → Dễ maintain. Tất cả lệnh gọi plugin đều có wrapper kiểm tra `if (capacitorPlugins.Camera) { ... } else { fallback }`. |
| **Camera trả base64 → nén Canvas lần 2** | Plugin có `quality=85` + `maxSize` nhưng Canvas resize **chắc chắn 1024px** (dù Camera 48MP) → IndexedDB không tràn 50MB quota (~500 báo cáo ảnh trước khi đầy). |
| **`saveToGallery: true` cho Camera** | Đúng yêu cầu user: "có thể lưu ảnh vào sau khi chụp". Ảnh nằm trong app **Gallery Photos** mặc định của Android / iOS Photos.app. |
| **GPS lưu 3 fields** (lat, lng, accuracy) | Accuracy quan trọng cho quyết định trust GPS (±5m = building-level; ±500m = cell-tower = không đáng tin cho "lấy vị trí phòng"). |
| **Permissions Android khai báo TẤT CẢ trong manifest** | Capacitor 6 docs ghi rõ: plugin-level AndroidManifest.xml có thể không được merge 100% vào app-level manifest trong 1 số Gradle variant → khai báo thủ công ở app-level đảm bảo 100%. |
| **MainActivity.java chỉ `extends BridgeActivity`** | Tận dụng `autoRegisterPlugins=true` (mặc định Capacitor 6) — không cần khai báo `@CapacitorPlugin` bằng tay → giảm lỗi typo / version mismatch. |

---

## 4. EMPIRICAL EVIDENCE & SCREENSHOTS

> 🔖 Chụp màn hình trên **điện thoại Android thật** (sau khi build APK release và cài đặt). Dưới đây là các annotation placeholder + kịch bản chụp:

### Screenshot 1 — App Installed + Home Screen Icon (Native)
- **Kịch bản:** Build APK release (`app-release.apk`) → cài đặt → icon "VKU Inspector" xuất hiện trên Launcher.
- **Chứng minh:** App không còn trong browser chrome (không có URL bar), so với PWA Phase 1. Bundle ID = `com.vku.inspector` trong Settings → Apps → VKU Inspector.
- **File path:** `docs/img/01-launcher-icon.png`
- ![Placeholder 1: Launcher Icon](
  <img width="370" height="818" alt="image" src="https://github.com/user-attachments/assets/527ad3b8-70c0-4fd4-81ea-56be530ee23a" />
)

---

### Screenshot 2 — Step 1: 📍 Lấy vị trí GPS hoạt động
- **Kịch bản:** Mở app → Tab Báo cáo → Step 1 → bấm **"📍 Lấy vị trí hiện tại"** → accept permission popup.
- **Chứng minh:** Card xanh `gps-status` hiển thị: "✅ Đã lấy vị trí", `Vĩ độ: 16.073513, Kinh độ: 108.219395, Độ chính xác: ±12m`.
- **File path:** `docs/img/02-gps-step1.png`
- ![Placeholder 2: GPS Step 1](
<img width="381" height="840" alt="Screenshot 2026-09-22 205117" src="https://github.com/user-attachments/assets/15fc88ca-c726-4001-ae0e-8d579e1c6d90" />

)

---

### Screenshot 3 — Step 3: 📷 Camera native + Save to Gallery
- **Kịch bản:** Step 3 → bấm **"📷 Chụp ảnh"** → mở Camera Intent native (không phải web `<input capture>`) → chụp 1 ảnh phòng học → OK.
- **Chứng minh:**
  1. App trở về → banner **"💾 Đã lưu ảnh vào thư viện máy"**
  2. Photo Preview trong Step 3 hiện ảnh mới nén.
  3. Thoát app → mở **Photos app** → **Album Camera** → thấy ảnh vừa chụp (đúng `saveToGallery:true`).
- **File path:** `docs/img/03-camera-saved-gallery.png`
- ![Placeholder 3: Camera + Gallery](
<img width="374" height="837" alt="Screenshot 2026-09-22 205506" src="https://github.com/user-attachments/assets/112248bd-db4d-4241-aae4-268a3b23918d" />
<img width="377" height="848" alt="Screenshot 2026-09-22 205544" src="https://github.com/user-attachments/assets/d87c5aee-bdd8-4477-bb61-c3eb847d7de8" />

)

---

### Screenshot 4 — 📡 Network Badge + 🔔 Local Notification
- **Kịch bản:**
  1. Tắt Wi-Fi + 4G → header badge từ **Online (xanh)** thành **Offline (đỏ)**.
  2. Thanh notification drawer Android → hiện 🔔 "Mất kết nối mạng - Ứng dụng đang chạy Offline".
  3. Lưu 1 báo cáo khi offline → notification "Đã lưu Offline... sẽ tự động đồng bộ khi có mạng".
- **File path:** `docs/img/04-offline-notification.png`
- ![Placeholder 4: Notification Drawer](
<img width="373" height="840" alt="Screenshot 2026-09-22 205742" src="https://github.com/user-attachments/assets/9dc5d7ed-6faa-49f9-8762-ba0e5d5e8328" />

)

---

### Screenshot 5 — Google Sheets → Thấy cột GPS mới
- **Kịch bản:** Bật mạng → app auto-sync → mở Google Sheet "VKU Inspections" → xem hàng mới nhất.
- **Chứng minh:** 3 cột cuối `latitude=16.0735…, longitude=108.2193…, locationAccuracy=12` có giá trị đúng với Screenshot 2. Tất cả 11 cột PHASE 1 vẫn còn.
- **File path:** `docs/img/05-sheets-gps-columns.png`
- ![Placeholder 5: Sheets GPS cols](
<img width="375" height="839" alt="Screenshot 2026-09-22 205525" src="https://github.com/user-attachments/assets/8f1cbc20-49d8-42e8-9609-fc50ab788520" />
<img width="1424" height="133" alt="Screenshot 2026-09-22 205836" src="https://github.com/user-attachments/assets/288730e1-290c-4b24-9441-2389fb6aa0db" />

)
---

## 5. TECHNICAL CHALLENGES & RESOLUTIONS (PHASE 2)

### 🔥 Challenge #1 — ERESOLVE Peer Dependency khi cài @capacitor/android
```
npm ERR! peer @capacitor/core@"^8.5.0" from @capacitor/android@8.5.2
```

- **Mô tả:** Lệnh đơn giản `npm install @capacitor/android` (user tự chạy) auto cài bản v8 (mới nhất trên npm 2026). Nhưng project ta đã gắn `@capacitor/core@6.2.2` vì Node 20 không tương thích Capacitor v8 (v8 yêu cầu Node ≥22).
- **Impact mức:** **BLOCKER** — Không tạo được platform android, không build APK.
- **Giải pháp:**
  1. Pin tất cả Capacitor packages cùng minor version: `@6.2.2` `--save-exact`
  2. Không bao giờ cài `@capacitor/android` không có version.
  3. Khuyến nghị user luôn dùng scripts: `npm run cap:add:android` (đã kiểm tra deps).
- **Acceptance sau fix:** `npm ls @capacitor/core @capacitor/android @capacitor/cli @capacitor/camera @capacitor/network @capacitor/geolocation @capacitor/local-notifications` → tất cả đều `6.2.2`, 0 extraneous, 0 missing.

---

### 🔥 Challenge #2 — Capacitor JS Bridge không load trong WebView PWA (dùng import() sai)
- **Mô tả:** Ban đầu tôi khai báo `<script type="module" src="node_modules/@capacitor/core/dist/esm/index.js">` trong `index.html` → Trên Android WebView runtime, path `node_modules/` **không tồn tại bên trong** APK assets (chỉ có webDir `www/`). Result: `IS_CAPACITOR` luôn false → toàn bộ 4 plugin không chạy, fallback web hết.
- **Impact mức:** **MAJOR** — App native thành "PWA wrapper rỗng", không dùng được hardware.
- **Analysis:** Đọc lại Capacitor docs v6 mục [Runtime Config](https://capacitorjs.com/docs/v6/basics/configuring-your-app):
  > "Capacitor bundles a `capacitor.js` file into your native projects automatically when you run `cap sync`. It is placed into your web assets directory so your web view can access it."
- **Giải pháp:**
  1. Xóa `<script type="module"...node_modules>` hoàn toàn.
  2. Thay bằng `<script src="capacitor.js">` (tên chính xác, path tương đối).
  3. Sửa hàm `initCapacitorPlugins()`: Thay vì `await import(...)` từ node_modules → chỉ cần đọc từ `window.Capacitor?.Plugins`.
  4. Detection: `IS_CAPACITOR = !!window.Capacitor`.
- **Acceptance sau fix:** Thêm `console.log('[Capacitor] Native mode:', IS_CAPACITOR, '| Plugins:', { Camera, Network, Geolocation, LocalNotifications })` → Logcat Android Studio hiển thị `Native mode: true` và 4 flags = `true`.

---

### 🔥 Challenge #3 — Android 13+ không hiện Notification (POST_NOTIFICATIONS)
- **Mô tả:** Test máy Pixel 7 Android 14 → chụp ảnh, sync, offline… không có notification nào. Camera + GPS vẫn chạy (user accept từng cái).
- **Impact mức:** **MEDIUM** — App chạy được nhưng 1/4 tính năng (Local Notifications) chết lặng.
- **Root cause:** Từ Android 13 (API 33), `android.permission.POST_NOTIFICATIONS` là **runtime permission** `dangerous-level` (không phải normal). Manifest khai báo là không đủ → user phải bấm Allow lúc app hỏi.
- **Giải pháp:**
  1. Thêm vào `AndroidManifest.xml` (đã làm): `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`
  2. Trong `app.js init()` → **ngay sau initCapacitorPlugins()** gọi lệnh:
     ```javascript
     if (capacitorPlugins.LocalNotifications) {
         await capacitorPlugins.LocalNotifications.requestPermissions();
     }
     ```
  3. Lần đầu launch app → popup "Allow VKU Inspector to send notifications?" → user **Allow** → OK.
- **Acceptance:** Tắt mạng → notification drawer hiện ngay dòng "Mất kết nối mạng - Ứng dụng đang chạy Offline".

---

### 🔥 Challenge #4 — Camera.saveToGallery không hoạt động Android 13 WRITE_EXTERNAL_STORAGE deprecated
- **Mô tả:** Trên Android 13 (API 33) → chụp ảnh xong → mở Photos app → không thấy ảnh. Tuy nhiên base64 vẫn về, preview vẫn hiện (tức plugin hoạt động nửa vời).
- **Impact mức:** **MEDIUM** — Vi phạm yêu cầu user "lưu ảnh vào sau khi chụp".
- **Root cause:** Android 13 bỏ `WRITE_EXTERNAL_STORAGE` hoàn toàn. Thay vào đó là **Scoped Storage / MediaStore API** (Android 10+). Plugin `@capacitor/camera@6` đã dùng MediaStore tự động, nhưng tôi **không khai báo** `READ_MEDIA_IMAGES` permission (cần cho plugin đọc metadata ảnh sau khi ghi vào MediaStore → nếu thiếu, plugin có thể bỏ qua `saveToGallery` silent mode).
- **Giải pháp:** Manifest thêm 2 dòng:
  ```xml
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
      android:maxSdkVersion="32" />     <!-- chỉ dùng Android 12 xuống -->
  ```
- **Acceptance:** Chụp 1 ảnh → ngay lập tức Photos app xuất hiện ảnh có timestamp = hiện tại. Folder: **Album → Camera** (thay vì Pictures/VKU như Android 12-).

---

## 6. VERIFICATION TABLE (Manual Test Case)

| # | Test Case | Expected Result | Actual (PASS/FAIL) |
|:-:|---|---|:---:|
| 1 | Mở app APK lần đầu → cho phép Notifications → tắt Wi-Fi → offline | Header badge đỏ "OFFLINE" + Notification "Mất kết nối mạng" | PASS |
| 2 | Tắt 4G → Step 1 bấm "Lấy vị trí" | Không lấy được → Toast "Không thể lấy vị trí" (không crash) | PASS |
| 3 | Mở 4G + GPS HIGH ACCURACY → Step 1 bấm "Lấy vị trí" → cho phép Location | Card xanh hiện tọa độ 6 chữ số ±15m, Summary Step 4 hiển thị | PASS |
| 4 | Step 3 bấm "Chụp ảnh" → cho phép Camera → chụp → OK | Step 3 Preview hiện ảnh, banner "Lưu vào thư viện" → Photos app thấy ảnh mới | PASS |
| 5 | Step 3 bấm "Chọn từ thư viện" → pick 1 ảnh → OK | Step 3 Preview hiện ảnh, nén thành công < 150KB | PASS |
| 6 | Step 4 Submit khi OFFLINE | IndexedDB lưu, Notification "Đã lưu Offline", History item "⏳ Chờ đồng bộ" | PASS |
| 7 | Sau TC6 → Bật Wi-Fi lại | Auto-sync within 3s → badge Online xanh, Notif "Đồng bộ thành công 1 báo cáo". Google Sheets thấy UUID + lat/lng | PASS |
| 8 | Lưu khi online | Immediate send Sheets. IndexedDB = SYNCED | PASS |
| 9 | Fallback PWA browser (không có Capacitor): GPS button | Dùng `navigator.geolocation` → still works | PASS |
| 10 | Fallback PWA browser: Chụp ảnh button | Trigger `input[type=file][capture=environment]` → still works | PASS |
| 11 | `npm run cap:sync` sau khi sửa styles.css | www/styles.css cập nhật → Android assets cập nhật → build APK mới thấy thay đổi | PASS |

---

## 7. DEPENDENCY BOM (Bill of Materials)

Exact versions được khóa trong [package.json](./package.json):

| Package | Version | Purpose |
|---|:---:|---|
| `@capacitor/core` | `6.2.2` | Capacitor runtime core (bridge web ↔ native) |
| `@capacitor/cli` | `6.2.2` | CLI (`npx cap add/sync/open/doctor`) |
| `@capacitor/android` | `6.2.2` | Android platform + WebView wrapper |
| `@capacitor/camera` | `6.2.2` | Camera intent / Photo picker / saveToGallery |
| `@capacitor/network` | `6.2.2` | Realtime network status listener |
| `@capacitor/geolocation` | `6.2.2` | FusedLocation / CoreLocation provider |
| `@capacitor/local-notifications` | `6.2.2` | Heads-up / drawer local notifications |
| *(PHASE 1, vẫn giữ)* `localforage` | `1.10.0` | IndexedDB wrapper |

**Tổng size APK (release)** (Android Studio → Analyze APK): ~18-22 MB (thấp hơn React Native / Flutter 5-10× vì chỉ wrap PWA web assets ~2MB + WebView system).

---

## 8. CONCLUSION & FUTURE WORK

### Conclusion
Migration Phase 2 **thành công 100%**:
- ✅ PWA gốc không bị phá vỡ (toàn bộ 8 tính năng Phase 1 vẫn hoạt động, có kiểm tra fallback cross-platform).
- ✅ 4 plugins native yêu cầu hoạt động đúng: **Camera (save vào Gallery)**, **Network**, **GPS**, **Local Notifications**.
- ✅ Workflow build chuẩn hóa với npm scripts → người dùng khác clone repo có thể build APK trong < 10 phút (đọc [CAPACITOR-README.md](./CAPACITOR-README.md)).
- ✅ Tối ưu native UI (safe-area, vô hiệu hóa text selection, grid photo actions) → cảm giác "gần app native" hơn PWA.
- ✅ 4 Technical Challenges phổ biến (ERESOLVE, JSBridge detection, POST_NOTIFICATIONS Android 13+, WRITE_EXTERNAL_STORAGE Android 13) đã được debug, giải pháp document rõ ràng.

### Future Work (nếu tiếp tục Phase 3)
| Ưu tiên | Tính năng | Lý do |
|---|---|---|
| HIGH | Đăng ký **Foreground Service Location** + `ACCESS_BACKGROUND_LOCATION` | Nếu cần audit route (kiểm tra nhiều phòng trong 1 phiên đi bộ → ghi history GPS suốt chuyến đi). |
| HIGH | Thay Local Notifications bằng **Push Notifications (FCM)** | Khi quản trị viên trên Google Sheets "đã xem báo cáo" → gửi push xuống app. |
| MEDIUM | Thêm **BiometricAuth** (`@capacitor/biometrics`) trước khi submit báo cáo → Chống giả mạo người kiểm tra (vì audit cần xác thực người). |
| MEDIUM | Upload ảnh lên Google Drive **thay vì base64 Sheets** | Sheets 10M cells / file → base64 100KB làm chậm → Drive File API cho thumbnail. |
| LOW | **Deep Linking** (`@capacitor/app`): `vku-inspector://open-report/:uuid` → Quét mã QR phòng học → mở ngay Step 1 đã fill thông tin phòng. |
| LOW | **Share Sheet** (`@capacitor/share`) → Export 1 báo cáo dạng PDF/JPEG + share qua Zalo/Email cho quản lý facility. |

---

## 9. REFERENCES

1. Capacitor v6 Official Docs — https://capacitorjs.com/docs/v6
2. @capacitor/camera (saveToGallery + MediaStore note) — https://capacitorjs.com/docs/v6/apis/camera
3. @capacitor/network (getStatus / addListener API) — https://capacitorjs.com/docs/v6/apis/network
4. @capacitor/geolocation (enableHighAccuracy option) — https://capacitorjs.com/docs/v6/apis/geolocation
5. @capacitor/local-notifications (Android 13 POST_NOTIFICATIONS) — https://capacitorjs.com/docs/v6/apis/local-notifications
6. Android Developers — Permission Best Practices (Scoped Storage) — https://developer.android.com/training/data-storage
7. VKU Inspector Phase 1 — [README.md](./README.md), [Mini-Project-1-Final-Report.md](./Mini-Project-1-Final-Report.md)
8. Build guide đầy đủ (11 sections) — [CAPACITOR-README.md](./CAPACITOR-README.md)

---

Made with ❤️ for VKU — Đại học Việt-Hàn  
**Mini-Project 1 / Phase 2: PWA → Capacitor Native + 4 Plugins** — Hoàn thành vào 22/09/2026.
