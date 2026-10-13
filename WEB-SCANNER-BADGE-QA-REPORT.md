# FEDUSA Web Scanner & Badge QA Report
Date: 13 October 2026

## Scope
Only the WEB scanner is intended for use. The legacy `android-scanner/` directory is
retained as archived source; it was not modified, tested or approved for use.

## Verified with mocked delegate records / in a local browser
- One existing stored `badgeQrValue` identifies each delegate for CONGRESS, VOTING and APPAREL.
- The scan mode controls the independent timestamp: `checkedInAt`, `votingCheckedInAt`,
  or `apparelCollectedAt`. Scanning for apparel does not change the other two.
- Apparel is a two-step operation: scan/lookup (shows registered shirt/jacket size)
  followed by **CONFIRM APPAREL HANDED OVER**; only confirmation stores collection.
- Repeating apparel collection yields a duplicate warning in sequential tests.
- Voting requires an eligible voting member who has already completed congress check-in.
- Cancelled registrations are rejected for all three modes.
- Tampered JSON payloads that are not the exact stored QR value are rejected.
- The scanner portrait URL now matches the supported `/api/asset?key=...&token=...` route.
- Admin list and Excel export include apparel collection timestamps.
- A4 portrait page: two adjacent 95 x 145 mm front/back panels per delegate;
  two delegate strips per A4 (1 mm inter-strip cutting gap). Overall page is A4.
- PDF sample QR codes for BOTH sample delegates decoded successfully from the print proof.
- The badge NOB category shows `NOB`, not `NOB/INTERNATIONAL`.
- The badge print page waits for photos and QR codes to load and rejects low-resolution
  photos (< 480 pixels on a side) or QR images (< 450 pixels on a side).
- Badge artwork images supplied in this ZIP are approximately 300 pixels/inch at print size.

## Requires real-world acceptance testing BEFORE live event use
- Not deployed to Netlify; test against actual FEDUSA production/staging data.
- Real phone browser camera permissions, HTTPS access and actual QR camera scans were
  not tested on physical hardware. The browser tests simulate scanning.
- The sample PDF uses synthetic delegates and non-production QR codes and photos.
  DO NOT distribute it as a delegate badge batch.
- We did not have independently attached design reference PDFs in this audit. The print
  proof verifies the design AS PROVIDED BY THIS ZIP, not an exact visual match to
  external NOB or Affiliate reference artwork.
- Real delegate headshot sharpness depends on the source images saved in Netlify.
- Sequential duplicate collection is blocked. Near-simultaneous collection requests
  from two stations may still race because the Netlify Blobs read/write mechanism is
  not an atomic compare-and-set. Use one apparel desk for the same delegate and
  resolve concurrent issuance procedures before release.
- Physical print at 100% / Actual size, disable browser headers/footers, enable
  print backgrounds, and scan sample badges from the actual printer.

## Deploy only after acceptance
Deploy to the existing Netlify project; do not regenerate existing delegate QR codes.
The website scanner is at `/checkin.html`, badge print page at `/badges.html`.

## Audit files
`public/checkin.html`, `public/badges.html`, `public/app.js`,
`public/admin.html`, `netlify/functions/checkin-sync.js`,
`netlify/functions/export.js`.
