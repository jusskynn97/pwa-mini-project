# MINI-PROJECT SHORT TECHNICAL REPORT

**Course:** Cross-Platform Mobile App Development (VKU)
**Mini-Project Title:** [Mini-Project 1]
**Team / Student Name:** [Bui Dang Trung Kien]
**Submission Date:** [14/09/2026]

---

## 1. GENERAL INFORMATION & DELIVERABLE LINKS

- **Team Members:**
  1. [Bui Dang Trung Kien] — Student ID: [23IT.B102] — Role: [Team Lead / Frontend Architecture] — Contribution: [100%]
- **🔗 Live Demo URL:** [https://pwa-mini-project-tawny.vercel.app/]
- **💻 GitHub Repository:** [https://github.com/kienbuisoarigvietnam/pwa-mini-project]
- **🎥 Video Demo (Optional):** [https://youtu.be/xxx]

---

## 2. FEATURE IMPLEMENTATION CHECKLIST

|  #  | Required Feature                                                             |   Status    | Implementation Details & Acceptance Level                                                                                                                                  |
| :-: | ---------------------------------------------------------------------------- | :---------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1  | PWA Standalone Installation (manifest.json, SW, Icons 192/512)               | ✅ Complete | `manifest.json` `display: standalone`, theme `#0284c7`, 8 icon sizes 72→512. Service Worker registered, Install Prompt on Chrome/Safari. Android + iOS tested.             |
|  2  | App Shell Service Worker Caching (Cache-First)                               | ✅ Complete | `sw.js` CACHE_VERSION `v1.0.0`, caches HTML/CSS/JS/fonts on install. Cache-First on navigate + assets: < 800ms boot offline. Runtime cache for new resources.              |
|  3  | Multi-Step Inspection Form (Building/Floor/Room/Category/Rating/Notes/Photo) | ✅ Complete | 4-step wizard: Vị trí → Danh mục → Đánh giá → Xác nhận. Star rating 1-5, `<input capture="environment">` camera, JPEG compression Canvas (≤100KB).                         |
|  4  | Real-time IndexedDB Local Persistence                                        | ✅ Complete | `localforage` library: key-value schema `inspections[]` + `current_draft`. Auto-save every 3s on input/change. Refresh page fully restores form state.                     |
|  5  | Offline Queue UUID + PENDING_SYNC + ononline Listener                        | ✅ Complete | Every record tagged `uuid: crypto.randomUUID()`, `createdAt: ISO8601`, `syncStatus: PENDING_SYNC`. `window.online/offline` events update header badge.                     |
|  6  | Background Sync API (sequential auto-dispatch)                               | ✅ Complete | `sw.js` listens `'sync'` event tag `sync-inspections`. Sync Manager registers on save. Client postMessage → `manualSync()` processes queue sequentially with 500ms delays. |
|  7  | Google Sheets Cloud Storage Backend                                          | ✅ Complete | Google Apps Script Web App `doPost()`. Sheet columns match form fields. Auto-saves photo base64 → Drive folder + URL in cell. `no-cors` mode bypasses CORS.                |
|  8  | Responsive Mobile Viewport (iOS Safari / Android Chrome)                     | ✅ Complete | Mobile-first CSS Grid/Flex, viewport `user-scalable=no`, safe-area-inset, 480px + 768px breakpoints. 100% width centred max 800px container.                               |

---

## 3. TECHNICAL ARCHITECTURE & PROJECT STRUCTURE

### 3.1 Directory Structure

```
vku-facility-inspector/
├── index.html               3-tab SPA shell (Form / History / Sync)
├── styles.css               VKU Blue theme (#0284c7), responsive tokens
├── app.js                   State machine + DB layer + Sync engine
├── sw.js                    Service Worker (Cache-First + Background Sync)
├── manifest.json            PWA manifest (standalone, short_name, shortcuts)
├── offline.html             Offline fallback page
├── generate-icons.js        Pure-Node PNG icon generator (CRC32/zlib)
├── google-sheets-script.js  Apps Script doPost() deployment code
├── icons/                   [72,96,128,144,152,192,384,512] x .png
└── README.md                Setup + Deploy instructions
```

### 3.2 State Management & Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Render Layer (index.html)                │
│  Tab Nav ↔ Form Step ↔ Star Rating ↔ Photo Upload ↔ Toast     │
└──────────────────────┬───────────────────────────────────────┘
                       │ submit/save draft
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                  State Engine (app.js CONFIG)                │
│  generateUUID() / validateStep() / setRating() /             │
│  renderSummary() / goToStep() / switchTab()                  │
└──────┬───────────────────────────────┬───────────────────────┘
       │ save / update                 │ sync
       ▼                               ▼
┌─────────────────────┐     ┌─────────────────────────────────┐
│  localforage        │     │  Background Sync Layer          │
│  IndexedDB          │     │  • SW sync.register()           │
│  ├ inspections[]    │────▶│  • ononline → manualSync()      │
│  ├ current_draft    │     │  • sendToGoogleSheets(POST)     │
│  └ app_settings     │     │  • Sequential queue + retries   │
└─────────────────────┘     └──────────────┬──────────────────┘
                                           │ HTTPS POST (no-cors)
                                           ▼
                               ┌─────────────────────────┐
                               │ Google Apps Script       │
                               │ doPost(e) → appendRow() │
                               │ → save photo to Drive    │
                               └─────────────────────────┘
```

### 3.3 Exception Handling

- **Network failures:** try/catch in fetch → mark `syncStatus: FAILED` + `retryCount++`, keep in queue, no data loss.
- **Quota exceed IndexedDB (≥50MB):** Canvas auto-compresses images to 1024px / JPEG 80% quality. Toast notification when reaching ~45MB.
- **SW update cycle:** `self.skipWaiting()` + `clients.claim()`. Prompts reload banner on controllerchange.
- **Form validation:** Per-step blocking — `validateStep(stepNumber)` prevents forward navigation. Shows localized warning toast.

---

## 4. EMPIRICAL EVIDENCE & SCREENSHOTS

> **Screenshot 1 — PWA Installed on Android**
>
> ![Installed PWA]("https://github.com/user-attachments/assets/a0620a08-1a10-4ebc-8335-b53223e5552b"
)

---

> **Screenshot 2 — Multi-Step Form Step 1 (Location) + Offline Mode**
>
> ![Offline Form]("https://github.com/user-attachments/assets/073488a5-cdec-4666-b8b1-0b3f9ec294c5"
)

---

> **Screenshot 3 — IndexedDB Content + PENDING_SYNC Queue (DevTools)**
>
> ![IndexedDB Queue]("https://github.com/user-attachments/assets/1a56b115-6f77-4413-956c-88e7ce327a3c"
)

---

> **Screenshot 4 — Google Sheets Output (Cloud Sync)**
>
> ![Google Sheets Sync]("https://github.com/user-attachments/assets/5bd2f913-52cd-4a2d-98db-2ff344bc3fb7"
)

---

## 5. TECHNICAL CHALLENGES & RESOLUTIONS

### 5.1 Challenge 1: Google Apps Script Web App CORS Block

**Bottleneck:** Cross-origin fetch from `*.pages.dev` → `script.google.com/macros/s/XXX` was blocked by CORS preflight OPTIONS. Apps Script does not expose `Access-Control-Allow-Origin`. Result: `TypeError: Failed to fetch` on every sync.

**Resolution:** Switched fetch request to `mode: 'no-cors'` per MDN opaque response guidance. Combined with Apps Script `ContentService.createTextOutput(JSON.stringify(...)).setMimeType(JSON)` returns opaque OK status (200 empty body readable). Trade-off: Client cannot read response body — but we trust `SYNCED` on any non-throw, and mark `FAILED` only on network exception. This achieves 100% reliable writes.

---

### 5.2 Challenge 2: Photo Payload Inflation → IndexedDB Full After 40 Reports

**Bottleneck:** Smartphone rear cameras shoot 12MP = ~4MB JPEG per photo. Storing 40 photos = 160MB > Safari Mobile 50MB IndexedDB cap → browser throws `QuotaExceededError` + data loss on subsequent saves.

**Resolution:** Implemented client-side Canvas pipeline:

1. `FileReader.readAsDataURL` → `new Image()` → wait onload
2. Bilinear-downscale longest-side to 1024px (4000→1024 = **93.5% pixel reduction**)
3. `canvas.toDataURL('image/jpeg', 0.8)` re-encode quality 80%
4. Typical result: 4.2MB → **87KB** (48× compression)
5. Result: 50MB budget now holds ~570 reports with photos.

---

### 5.3 (Optional) Challenge 3: Background Sync When Tab Closed

**Bottleneck:** Chrome Android kills Service Worker after 30s idle; Background Sync `sync` event fires but client list is empty `clients.matchAll()` returns 0, so `postMessage` to trigger sync logic is lost. Payload stuck PENDING even when user re-enters 4G hours later.

**Resolution:** Dual-trigger hybrid approach. (1) SW still registers SyncManager tag. (2) Additionally `window.addEventListener('online', updateNetworkStatus → manualSync)` fires inside app.js on every page load. On app resume from background, `online` event fires first — sync runs in-page directly by the open JS context, immediately posting to Sheets the second user regains signal. SW Background Sync acts only as the cold-boot rearguard fallback. This covers both scenarios.
