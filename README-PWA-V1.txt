ĐỨC ANH MAINTENANCE — PWA V1

Copy these into the repository root:
- manifest.webmanifest
- service-worker.js
- icons/
- js/pwa.js

In index.html and dashboard.html, inside <head> add:
<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#0b0b0b">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon-180.png">

Before </body> add:
<script src="./js/pwa.js"></script>

Then commit and wait for GitHub Pages to publish.

On iPhone/iPad:
Safari → Share → Add to Home Screen → enable Open as Web App (if shown) → Add.

V1 does not modify Firebase Auth/Firestore and does not enable offline Firestore or push notifications.
