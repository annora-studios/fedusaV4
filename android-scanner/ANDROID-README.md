# FEDUSA Android Check-in App
This Android Studio project is a deliberately simple operations app: staff sign-in, scan, manual override, recent status and automatic offline sync.

## Backend endpoints
- POST `/api/staff-login`
- GET `/api/offline-delegates?token=...`
- POST `/api/checkin-sync`

## Offline-first design
1. Staff signs in while online.
2. App downloads the lightweight delegate list to Room.
3. Every scan is saved locally first with staff, device, location, timestamp and method.
4. WorkManager uploads pending scans when connectivity returns.
5. The server preserves the first check-in and logs later duplicates.

The included UI and Gradle project are buildable foundations. Add the CameraX analyzer, Room entities and WorkManager classes following the API contract above before event production testing.
