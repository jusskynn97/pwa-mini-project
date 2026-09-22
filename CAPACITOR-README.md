# 🏫 VKU Facility Inspector — Capacitor Native App Setup

> Hướng dẫn cài đặt, build và deploy **VKU Facility Inspector** dưới dạng ứng dụng Android/iOS Native qua Capacitor 6. Dựa trên PWA gốc, cải thiện thêm 4 plugin native: 📷 Camera, 📡 Network, 📍 Geolocation, 🔔 Local Notifications.
>
> — Văn bản này chỉ tập trung vào phần **Capacitor / Native**. Đọc [README.md](./README.md) để biết chi tiết PWA, Service Worker, IndexedDB & Google Sheets.

---

## 📋 Mục lục

1. [Yêu cầu môi trường](#1-yêu-cầu-môi-trường)
2. [Cài đặt nhanh từ đầu](#2-cài-đặt-nhanh-từ-đầu)
3. [Scripts npm](#3-scripts-npm-thường-dụng)
4. [Build Android APK / AAB](#4-build-android-apk--aab)
5. [Build iOS (chỉ macOS)](#5-build-ios-chỉ-macos)
6. [Plugin tích hợp & cách dùng](#6-plugin-tích-hợp--cách-dùng)
7. [Permissions AndroidManifest](#7-permissions-androidmanifest)
8. [Lưu ý Runtime Permissions (Android 13+)](#8-lưu-ý-runtime-permissions-android-13)
9. [Flow hoạt động Cross-Platform](#9-flow-hoạt-động-cross-platform)
10. [Troubleshooting Thường gặp](#10-troubleshooting-thường-gặp)
11. [Liên hệ / Deploy Play Store](#11-liên-hệ--deploy-play-store)

---

## 1. Yêu cầu môi trường

| Yêu cầu | Phiên bản khuyến nghị | Kiểm tra lệnh |
|---|---|---|
| Node.js | **20.x LTS** (hoặc 18.x) | `node -v` |
| npm | 10.x | `npm -v` |
| Android Studio | **Hedgehog / Iguana** (2023.1+) | Menu → Help → About |
| Android SDK | 34 (compileSdkVersion = 34) | Android Studio → SDK Manager |
| JDK (Java) | **17 LTS** | `java -version` |
| (macOS) Xcode | 15+ | `xcodebuild -version` |
| (macOS) CocoaPods | 1.13+ | `pod --version` |

> 💡 Tất cả các phiên bản Capacitor 6 (core/cli/android/ios/plugins) đã được pin chính xác `--save-exact` trong [package.json](./package.json) để tránh ERESOLVE peer dependency conflict.

---

## 2. Cài đặt nhanh từ đầu

Nếu bạn clone repo mới:

```bash
# === Bước 1: Clone & cài node modules ===
git clone <your-repo-url>
cd mini-project1
npm install

# === Bước 2: Copy web assets (HTML/CSS/JS/icons) vào thư mục www/ ===
npm run copy:www

# === Bước 3: Tạo platform Android (chạy 1 lần duy nhất) ===
npm run cap:add:android
# => Tạo thư mục android/, sync Gradle, auto-register 4 plugins

# === Bước 4: (iOS, chỉ macOS) Tạo platform iOS (chạy 1 lần) ===
npm run cap:add:ios

# === Bước 5: Mở Android Studio / Xcode để Build & Run ===
npm run cap:open:android   # Android Studio
npm run cap:open:ios       # Xcode (macOS only)
```

Khi bạn sửa đổi code web (HTML/CSS/JS), chỉ cần chạy:

```bash
npm run cap:sync    # = copy:www + npx cap sync
```

— Lệnh này đồng thời copy `www/` assets vào `android/app/src/main/assets/public/` và cập nhật Gradle plugins nếu version thay đổi.

---

## 3. Scripts npm thường dùng

Toàn bộ scripts định nghĩa trong [package.json](./package.json):

| Script | Lệnh thực tế | Mục đích |
|---|---|---|
| `npm run copy:www` | Node inline script | Copy `index.html, styles.css, app.js, manifest.json, sw.js, offline.html, icons/...` → `www/` |
| `npm run cap:sync` | `copy:www` + `npx cap sync` | Sync **code web mới** + **plugins** vào Android/iOS projects (chạy mỗi khi sửa HTML/CSS/JS) |
| `npm run cap:add:android` | `copy:www` + `npx cap add android` | Tạo thư mục `android/` từ đầu (lần đầu cài đặt) |
| `npm run cap:add:ios` | `copy:www` + `npx cap add ios` | Tạo thư mục `ios/` từ đầu (chỉ macOS) |
| `npm run cap:open:android` | `npx cap open android` | Mở project bằng Android Studio |
| `npm run cap:open:ios` | `npx cap open ios` | Mở project bằng Xcode (macOS only) |
| `npx cap doctor` | — | Check môi trường build có đầy đủ JDK, Android SDK, Gradle, CocoaPods… |

---

## 4. Build Android APK / AAB

### 4.1 Test nhanh trên máy thật / ảo (Debug)

1. Gắn điện thoại Android, bật **USB Debugging** (Settings → Developer Options → USB Debugging = ON)
2. Chạy:
   ```bash
   npm run cap:sync          # Đồng bộ code web + plugins mới nhất
   npm run cap:open:android  # Mở Android Studio
   ```
3. Android Studio: Chọn thiết bị mục tiêu (cột trên cùng) → Ấn **▶ Run** (hoặc `Shift+F10`)
4. App sẽ tự cài và mở trên điện thoại.

### 4.2 Xuất file APK (Release) để cài đặt thủ công

1. Android Studio → Menu **Build → Generate Signed Bundle / APK**
2. Chọn **APK** → **Next**
3. Tạo / chọn **Keystore**:
   - Key store path: click `Create new…` → lưu `vku-inspector-release.jks` (không push lên git)
   - Nhập Password + Alias (vd: `vkuinspector`)
4. **Build Variants**: Chọn `release` (chọn `V2 (Full APK Signature)` ở Signature Versions)
5. **Finish** → Gradle build → output file APK tại:
   ```
   android/app/release/app-release.apk
   ```
6. Copy file này vào điện thoại → Mở File Manager → Click để cài (đã Sign, không báo "Blocked by Play Protect" như debug APK).

### 4.3 Xuất AAB để up lên Google Play Store

Thực hiện tương tự mục 4.2 nhưng chọn **Android App Bundle (.aab)** thay vì APK. Output:
`android/app/release/app-release.aab` → up vào Play Console → tự động tối ưu size cho từng thiết bị.

---

## 5. Build iOS (chỉ macOS)

```bash
npm run cap:sync
npm run cap:add:ios      # lần đầu
npm run cap:open:ios     # Mở Xcode
```

Trong Xcode:
- Chọn target `App` → Tab **Signing & Capabilities**
  - Team: Chọn Apple Developer Team (Free tier cũng được nhưng phải rebuild mỗi 7 ngày)
  - Bundle Identifier: `com.vku.inspector` (trùng với [capacitor.config.json](./capacitor.config.json))
- Chọn thiết bị (phải đăng ký UDID với Free Team) → ấn ▶ Run

Lưu ý: 4 plugins iOS (Camera/Location/Photos/Notifications) yêu cầu **`Info.plist` usage descriptions**. Capacitor CLI tự động tạo prompt khi add plugins, nếu thiếu thì mở `ios/App/App/Info.plist` và thêm các key:

```xml
<key>NSCameraUsageDescription</key>
<string>VKU Inspector cần camera để chụp ảnh kiểm tra cơ sở vật chất</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Đã chụp ảnh sẽ được lưu vào thư viện Photos của bạn</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>VKU Inspector cần truy cập Photos để chọn ảnh đính kèm báo cáo</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>VKU Inspector dùng GPS để ghi lại tọa độ nơi thực hiện kiểm tra</string>
<key>NSUserNotificationUsageDescription</key>
<string>Bạn sẽ nhận được thông báo về trạng thái lưu & đồng bộ báo cáo</string>
```

---

## 6. Plugin tích hợp & cách dùng

Toàn bộ 4 plugins tương ứng npm bạn yêu cầu đều đã được tích hợp sẵn trong [app.js](./app.js). Tất cả đều có **fallback web/PWA** nên code vẫn chạy trên trình duyệt bình thường.

### 6.1 📷 @capacitor/camera

| Mục | Nội dung |
|---|---|
| NPM | `@capacitor/camera@6.2.2` |
| Cấu hình | [capacitor.config.json](./capacitor.config.json) `Camera.saveToGallery=true`, `resultType=base64`, `quality=80`, `correctOrientation=true`, `source=prompt` |
| Hiển thị UI | Step 3 (Chụp ảnh) của form — 2 nút: **📷 Chụp ảnh** (source=CAMERA) + **🖼️ Chọn từ thư viện** (source=PHOTOS) |
| Code liên quan | [app.js takePhoto()](file:///d:/A-working/mini-project1/app.js#L508-L541), [app.js pickImage()](file:///d:/A-working/mini-project1/app.js#L543-L578), [app.js compressAndShowPhoto()](file:///d:/A-working/mini-project1/app.js#L441-L489) |
| Xử lý ảnh | Nhận base64 từ plugin → resize Canvas max 1024×1024 JPEG 80% → lưu vào IndexedDB (≈100KB/ảnh, tránh đầy bộ nhớ) |
| Fallback web | Click `input[type=file]` cũ (có `capture="environment"`) |
| Lưu ảnh Gallery | `saveToGallery:true` → Android 10+ dùng MediaStore API, iOS save vào Albums |

### 6.2 📡 @capacitor/network

| Mục | Nội dung |
|---|---|
| NPM | `@capacitor/network@6.2.2` |
| Code liên quan | [app.js setupCapacitorNetwork()](file:///d:/A-working/mini-project1/app.js#L363-L378), [updateNetworkStatus()](file:///d:/A-working/mini-project1/app.js#L322-L357) |
| Cách hoạt động | `Network.getStatus()` + `addListener('networkStatusChange')` → cập nhật badge header |
| Ưu điểm | Chính xác hơn `navigator.onLine` (kiểm tra network interface thay vì chỉ "có thể request") |
| Thông báo | Mất mạng → tự động gửi Local Notification |
| Fallback web | `window.ononline/offline` events |

### 6.3 📍 @capacitor/geolocation

| Mục | Nội dung |
|---|---|
| NPM | `@capacitor/geolocation@6.2.2` |
| Cấu hình | [capacitor.config.json](./capacitor.config.json) `locationAccuracy=high` |
| Hiển thị UI | Step 1 (Thông tin phòng) → nút 📍 **Lấy vị trí hiện tại** → hiển thị 6 chữ số thập phân + độ chính xác ±m |
| Code liên quan | [app.js getGpsLocation()](file:///d:/A-working/mini-project1/app.js#L580-L625) |
| Fields lưu | `formData.latitude`, `formData.longitude`, `formData.locationAccuracy` |
| Gửi Sheets | Payload Google Sheets có thêm 3 cột mới (xem `sendToGoogleSheets` ở [app.js#L405-L418](file:///d:/A-working/mini-project1/app.js#L405-L418)) |
| Fallback web | `navigator.geolocation.getCurrentPosition()` (Android 13+ browser cũng được) |

### 6.4 🔔 @capacitor/local-notifications

| Mục | Nội dung |
|---|---|
| NPM | `@capacitor/local-notifications@6.2.2` |
| Cấu hình | [capacitor.config.json](./capacitor.config.json) `smallIcon`, `iconColor=#0284c7`, `sound=beep.wav` |
| Auto request permission | `init()` ở [app.js](file:///d:/A-working/mini-project1/app.js#L985-L996) gọi `requestPermissions()` |
| Sự kiện gửi thông báo | 6 trigger: lấy GPS xong, mất mạng, chụp ảnh, lưu online, lưu offline, đồng bộ thành công, đồng bộ lỗi |
| Hàm gốc | `sendLocalNotification(title, body, id, extra)` ở [app.js#L80-L104](file:///d:/A-working/mini-project1/app.js#L80-L104) |
| Fallback web | Không hoạt động trên trình duyệt → hiển thị **Toast** thay thế |

---

## 7. Permissions AndroidManifest

Tất cả permissions đã được khai báo thủ công trong [android/app/src/main/AndroidManifest.xml](./android/app/src/main/AndroidManifest.xml#L38-L63) (Capacitor 6 không tự động thêm hết vào app-level manifest):

```xml
<!-- Camera + Save to Gallery -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- GPS -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />

<!-- Notification (Android 13+ bắt buộc) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />

<!-- Network Status -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

4 plugins được auto-register trong [android/app/capacitor.build.gradle](./android/app/capacitor.build.gradle):
```groovy
// capacitor-camera
// capacitor-geolocation
// capacitor-local-notifications
// capacitor-network
```

MainActivity.java chỉ cần extend `BridgeActivity` (không cần khai báo plugin bằng tay nhờ auto-register):
[android/app/src/main/java/com/vku/inspector/MainActivity.java](./android/app/src/main/java/com/vku/inspector/MainActivity.java)

---

## 8. Lưu ý Runtime Permissions (Android 13+)

Android 13 (API 33+) yêu cầu **runtime permissions** — không chỉ khai báo trong manifest. App đã xử lý tự động:

| Quyền | Khi nào yêu cầu | Kết quả nếu bị từ chối |
|---|---|---|
| 📸 `android.permission.CAMERA` | User bấm **Chụp ảnh** (plugin tự yêu cầu) | Toast + plugin throw `User denied` → không ảnh hưởng chức năng khác |
| 🖼️ `android.permission.READ_MEDIA_IMAGES` | User bấm **Chọn từ thư viện** (plugin tự yêu cầu) | Không thể chọn ảnh từ Gallery (fallback web input) |
| 📍 `android.permission.ACCESS_FINE_LOCATION` | User bấm **📍 Lấy vị trí** (app.js gọi `requestPermissions()`) | Thông báo "Không thể lấy vị trí" |
| 🔔 `android.permission.POST_NOTIFICATIONS` | App `init()` lần đầu (app.js gọi `requestPermissions()`) | Không hiển thị Notification drawer (Toast vẫn hoạt động) |

**Nếu user từ chối lần đầu, hệ thống sẽ **không hiện popup lại nữa** → phải vào `Settings → Apps → VKU Inspector → Permissions` cho phép thủ công. Đã có Toast thông báo rõ ràng khi xảy ra lỗi permission.

---

## 9. Flow hoạt động Cross-Platform

```
                    ┌─────────────────────────┐
                    │        VKU Inspector     │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       🌐 Web / PWA       📱 Android Native   🍎 iOS Native
       (HTTPS / localhost)    (APK build)       (IPA build)
              │                  │                  │
              │ Web APIs         │ Capacitor Plugins│ Capacitor Plugins
              │ (file input,     │ (Camera/GPS/     │ (Camera/GPS/
              │  navigator.      │  Network/        │  Network/
              │  onLine,         │  LocalNotif)     │  LocalNotif)
              │  geolocation)    │                  │
              │                  │                  │
              └────────────┬─────┴──────────────────┘
                           ▼
              ┌─────────────────────────┐
              │  app.js (Shared Logic)  │
              │  IS_CAPACITOR detection │
              │  Fallback web ↔ Native  │
              └────────────┬─────────────┘
                           ▼
              ┌─────────────────────────┐
              │  localforage IndexedDB  │ ← PERSIST (Offline OK)
              │  inspections[], drafts  │
              └────────────┬─────────────┘
                           ▼ online
              ┌─────────────────────────┐
              │ Google Apps Script (Web │
              │ App POST → Sheets/Drive)│
              └─────────────────────────┘
```

**Biến detection chính xác**: `IS_CAPACITOR = typeof window !== 'undefined' && !!window.Capacitor` — Chỉ `true` trong WebView của app native (sau khi `capacitor.js` được inject). Trên browser PWA luôn `false`.

---

## 10. Troubleshooting Thường gặp

### ❌ Lỗi ERESOLVE peer dependency khi cài @capacitor/android

```
npm ERR! peer @capacitor/core@"^8.5.0" from @capacitor/android@8.5.2
```

**Nguyên nhân**: `npm install @capacitor/android` (không ghi version) → cài bản v8 mới nhất → xung đột v6.

**Giải pháp**: Luôn cài đúng phiên bản cùng dòng với core:
```bash
npm install @capacitor/android@6.2.2 --save-exact
```

---

### ❌ `npx cap doctor` báo "JDK not found"

**Giải pháp**: Cài JDK 17, sau đó set `JAVA_HOME` trong file `android/gradle.properties` hoặc biến môi trường:
```properties
org.gradle.java.home=C:\\Program Files\\Java\\jdk-17
```

---

### ❌ Build Gradle lỗi "SDK location not found"

Tạo file `android/local.properties` (Capacitor thường tạo auto, nếu không thì tạo tay):
```properties
sdk.dir=C:\\Users\\<YOURNAME>\\AppData\\Local\\Android\\Sdk
```
hoặc trên macOS/Linux:
```properties
sdk.dir=/Users/<YOURNAME>/Library/Android/sdk
```

---

### ❌ APK cài xong nhưng Camera/GPS crash / không mở

**Kiểm tra 3 chỗ:**
1. [AndroidManifest.xml](./android/app/src/main/AndroidManifest.xml) có khai báo đủ `uses-permission` (Camera, ACCESS_FINE_LOCATION, POST_NOTIFICATIONS)
2. Thiết bị Android Settings → Apps → VKU Inspector → Permissions: Camera/Location/Notifications = **Allowed**
3. Xóa app cũ → cài lại APK release mới nhất (permission đôi khi không reset khi update)

---

### ❌ Chụp ảnh xong không lưu vào Gallery

**Android 13+**: Plugin Camera dùng MediaStore → yêu cầu `READ_MEDIA_IMAGES` (có rồi). Nếu `saveToGallery:true` mà vẫn không thấy → kiểm tra app **Photos → Albums → Camera** (không phải thư mục Pictures).

---

### ❌ `npm run cap:sync` nhưng thay đổi HTML/CSS không cập nhật

- Xoá cache WebView: Settings → Apps → VKU Inspector → Storage/Cache → Clear cache
- Hoặc uninstall app hoàn toàn → build lại từ Android Studio
- Kiểm tra thư mục `www/` có chứa file mới nhất (chạy `npm run copy:www` một mình để xem output)

---

### ❌ Local Notification không hiện trên Android 13+

1. Settings → Apps → VKU Inspector → Notifications = ON
2. Đã gọi `LocalNotifications.requestPermissions()` trong `init()` (có trong app.js)
3. Kiểm tra channel notification (Android 8+) — Capacitor tự tạo channel mặc định

---

## 11. Liên hệ / Deploy Play Store

### Checklist trước khi publish lên Play Console:

- [ ] Thay `versionCode` & `versionName` trong [android/app/build.gradle](./android/app/build.gradle) (tăng dần mỗi lần publish)
- [ ] **Sign** AAB bằng **Keystore chính thức** (không dùng debug.keystore)
- [ ] Điền **Store Listing**: 512×512 icon, banner 1024×500, 2-8 screenshots, mô tả tiếng Việt + tiếng Anh
- [ ] **Content Rating** làm bảng câu hỏi (Data Safety: "không thu thập/lưu dữ liệu user ID" – ảnh chỉ lưu local IndexedDB + Sheets của bạn)
- [ ] Android 14 targetSdk = 34 (đã set sẵn)
- [ ] **App signing by Google Play**: Enable để Play Store quản lý khóa

### Cấu hình app đã sẵn sàng (file tham khảo):

| Tệp | Mục đích |
|---|---|
| [capacitor.config.json](./capacitor.config.json) | Cấu hình appId, appName, webDir, plugin defaults, permissions list |
| [android/variables.gradle](./android/variables.gradle) | compileSdk / targetSdk / minSdk versions |
| [android/app/src/main/res/values/strings.xml](./android/app/src/main/res/values/strings.xml) | app_name = "VKU Inspector" |
| [android/app/capacitor.build.gradle](./android/app/capacitor.build.gradle) | 4 plugins auto-declare |
| [android/app/src/main/AndroidManifest.xml](./android/app/src/main/AndroidManifest.xml) | Permissions + application attributes |

---

## 📚 Tài liệu tham khảo (Capacitor Official)

- **Capacitor 6 Docs**: https://capacitorjs.com/docs/v6
- **@capacitor/camera**: https://capacitorjs.com/docs/v6/apis/camera
- **@capacitor/network**: https://capacitorjs.com/docs/v6/apis/network
- **@capacitor/geolocation**: https://capacitorjs.com/docs/v6/apis/geolocation
- **@capacitor/local-notifications**: https://capacitorjs.com/docs/v6/apis/local-notifications
- **Android Permissions Best Practices**: https://developer.android.com/guide/topics/permissions/overview
- **PWA gốc README**: [README.md](./README.md)

---

Made with ❤️ for VKU — Đại học Việt-Hàn  
Mini-Project: PWA → Capacitor Native Migration (4 plugins)
