# FEDUSA Excel export repair — 14 October 2026

## What changed

- Fixed the error caused by a delegate record without a headshot key.
- Preserved all 35 existing columns and the All Delegates, Affiliate Attendees and Main Delegates worksheets, including apparel collection times.
- Fetches each photo/QR asset once and reuses its workbook image across worksheets.
- Uses at most 12 concurrent delegate reads for exports. Other features retain their existing read behaviour.
- Limits image downloads to eight concurrent requests, with individual and total time budgets. Missing, unreadable, unsupported or oversized images no longer stop the export. Their cells explain why the image is not embedded; original images remain available in the admin portal.
- Caps embedded media at 2 MiB. If the completed workbook exceeds 4 MiB, regenerates it without embedded images. If delegate data alone exceeds that limit, reports a controlled error rather than attempting an oversized response.
- Distinguishes authentication failures from export failures. Export failures are logged in Netlify and shown on the admin page.
- The Download Excel button shows progress and saves the workbook without navigating away from admin. An image omission notice appears when applicable.

No stored delegate data is modified by exporting. Registration closure, badge printing, QR payloads, check-in and apparel collection code are unchanged.

## Deploy to the existing portal

1. Extract this ZIP.
2. Update these files in the same GitHub repository already connected to the FEDUSA Netlify project:
   - `netlify/functions/export.js`
   - `netlify/functions/_shared.js`
   - `public/admin.html`
3. Commit the changes and let Netlify build/deploy the existing project. The full ZIP also contains the unchanged portal files if replacing the project source in full is preferred. Keep all existing environment variables and the same Netlify project so it uses the existing Blobs stores.
4. After deployment, refresh `/admin.html`, enter the admin PIN and choose Download Excel.
5. Confirm the three worksheets, delegate counts and apparel collection column. Image cells may contain an explanatory note where embedding was not possible.

This is source code for a Netlify build, not a prebuilt static-only drag-and-drop deployment.

## Verification and limits

- Reproduced the original missing-headshot failure locally: HTTP 401 with `Cannot read properties of undefined (reading 'endsWith')`.
- 13 automated regression checks passed using synthetic data, actual ExcelJS workbook creation/reopening, mocked storage, and a simulated admin DOM.
- Verified missing images, supported image reuse, oversized/WebP/missing/failed assets, empty register, 1,500 delegates, authentication rejection, storage errors, bounded record reads, and admin download/error handling.
- The 1,500-delegate synthetic workbook was approximately 328 KB. Live data and photos will have different sizes and response times.
- Packaged the export with Netlify's function packaging tool and checked that its packaged module starts and rejects an invalid PIN.
- No live deployment or live-data test was performed. Without the failed request's Netlify logs, the exact production crash cause remains unconfirmed. This package addresses the verified missing-headshot fault and export size/performance risks; live validation is still required.
