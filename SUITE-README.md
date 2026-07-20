# FEDUSA Conference Suite — Netlify / HTML

This suite contains:

- Interactive conference website with video-ready hero and keynote-speaker section
- Two registration paths: Affiliate Attendees and VIP / Main Delegates
- Netlify Functions backend and Netlify Blobs storage
- Admin, badge printing, QR check-in and Excel export pages
- Android Studio QR scanner project under `android-scanner/android-app`

## Deploy website

Upload the repository contents to GitHub and connect the repository to Netlify. Keep `netlify.toml` at the repository root. Add an `ADMIN_PIN` environment variable, then deploy.

## Build Android scanner

Open `android-scanner/android-app` in Android Studio. Build a signed APK for event use. In the app settings, enter the deployed website URL and the same `ADMIN_PIN`.

Each scan updates the live record immediately. The next Excel download is generated from the updated records and includes the check-in timestamp.
