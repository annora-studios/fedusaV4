# FEDUSA daily congress check-in

Prepared 15 October 2026. Includes the Excel export repair from 14 October.

## Behaviour

- Use the same existing delegate badge QR. No badge reprints or new QR codes are needed.
- Congress accepts one check-in per delegate per calendar day in Africa/Johannesburg time (UTC+2), including Day 2 on 15 October and Day 3 on 16 October 2026.
- A repeat congress scan on the same day displays ALREADY CHECKED IN TODAY and the saved time for that day.
- The scanner's Congress mode records today's attendance automatically. No staff date selection or manual reset is needed.
- Voting remains once for the entire conference. Eligibility and the requirement for a prior congress check-in remain in place. It does not require a fresh congress check-in on the voting day.
- Apparel remains once for the entire conference, with the existing confirmation of handover.

## Existing records

There is no bulk reset or migration. The original checkedInAt, checkedInBy and checkinMethod fields remain the first congress check-in. Existing timestamps are attributed to their original South African date. A new congress scan adds a date-keyed congressCheckIns entry, preserving earlier attendance. A delegate who first arrives on Day 2 receives no fabricated Day 1 record.

Congress scans do not reset voting or apparel timestamps. Conditional writes and strong reads protect against simultaneous scanner requests recording duplicate same-day attendance or overwriting each other's fields. These protections apply to the updated scanner endpoints, not unrelated legacy administration writers.

## Admin and Excel

Admin shows congress check-in separately for 14, 15 and 16 October.

The workbook retains the original 35 columns and appends three date-specific congress check-in columns (AJ, AK and AL). The original Congress Checked In At column continues to show the first congress check-in. Use the new day-specific columns to prepare Day 2 and Day 3 reports.

## Apply to the existing live portal

1. Extract the ZIP and update the existing GitHub repository connected to the existing FEDUSA Netlify project. Use the existing project and its environment variables so the same Netlify Blobs records remain in use.
2. If applying only the daily-attendance changes on top of the Excel-fix release, include ALL of these files:
   - netlify/lib/attendance.js (new file; required by the functions)
   - netlify/functions/checkin-sync.js
   - netlify/functions/checkin.js
   - netlify/functions/delegates.js
   - netlify/functions/offline-delegates.js
   - netlify/functions/export.js
   - public/checkin.html
   - public/admin.html
3. Commit and wait for the Netlify build to publish successfully. The full ZIP contains all source files, including the prior Excel fix, if updating the full source tree.
4. Refresh/reopen the scanner page on EVERY staff device, then select CONGRESS CHECK-IN. Staff may be asked to sign in again if yesterday's session has expired.
5. Check in an arriving delegate who attended yesterday. Confirm today's success message and time. A second scan should show ALREADY CHECKED IN TODAY. Inspect the admin day columns to confirm yesterday and today are both present.
6. Tomorrow the same QR will work once again in Congress mode, automatically using 16 October in South African time.

Do not clear stored check-in data and do not create a new Netlify project. This is source code requiring a Netlify build, not a static-only drag-and-drop deployment.

## Verification

- 17 daily-attendance, API, UI and workbook checks passed with synthetic records, including Day 2/3 reuse, same-day duplicates, South African midnight boundaries, Day 1 preservation, first arrival on Day 2, voting/apparel once-off rules, concurrent scanners, cancellation, invalid QR payloads and write conflicts.
- 13 existing export/admin/read regressions also passed, including a 1,500-delegate synthetic workbook.
- Updated function packages were built with Netlify's function packaging tool.
- Run the included focused tests with: node --test tests/daily-attendance.test.js
- No live deployment, live scanner or live-data writes were performed from this workspace. The included Android project remains a starter; this release targets the web scanner at /checkin.html. Offline clients must refresh their delegate snapshot for the current day; delayed offline timestamps are not used to backdate attendance.
