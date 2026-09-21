ĐỨC ANH MAINTENANCE — PWA V2

Đã chỉnh đúng theo cấu trúc repository hiện tại:
assets/
  icons/
    icon-192.png
    icon-512.png
    apple-touch-icon-180.png

1. Copy vào root repository:
   - manifest.webmanifest
   - service-worker.js
   - assets/icons/*
   - js/pwa.js

2. Trong index.html và dashboard.html, trong <head> thêm:
<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#0b0b0b">
<link rel="apple-touch-icon" href="./assets/icons/apple-touch-icon-180.png">

3. Trước </body> thêm:
<script src="./js/pwa.js"></script>

4. Commit và chờ GitHub Pages publish.

Lưu ý:
- Không di chuyển assets/icons.
- Không thay đổi Firebase Auth.
- Service Worker không intercept /__ của Firebase.
- Không bật offline Firestore hoặc push notification ở V2.
- Không cache các CSS/JS nghiệp vụ chưa xác nhận tên file.
