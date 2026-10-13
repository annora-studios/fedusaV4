# FEDUSA Congress — registration closure update (13 October 2026)

## Public site
- Replaces public registration buttons and paths with a **Registrations Closed** notice.
- Keeps Congress date, venue, speakers, countdown, language selector, and a link for existing delegates.
- Does not remove any delegate records.

## Server-side protection
- `POST /api/register` returns HTTP **403**, code **REGISTRATION_CLOSED**, even if a cached form posts directly. This prevents new registrations without deleting older functionality.
- This closure is intentionally hard-coded. Reopening requires a deliberate code revision and redeployment.

## Kept operational
- `/admin.html`: existing delegate administration and exports.
- `/badges.html`: badge generation and printing, including the recent button fix.
- `/checkin.html`: congress check-in, voting check-in, apparel collection with the same delegate QR.
- `/retrieve.html` and `/manage.html`: existing-delegate link retrieval and editing remain available.
- No Netlify Blobs records or QR payloads are changed by this release.

## Post-deployment acceptance checks
1. Homepage displays Registrations Closed on desktop/mobile, with no new-registration form.
2. Test `POST /api/register` with a harmless dummy JSON request; expect 403/REGISTRATION_CLOSED, no record created.
3. Test an existing delegate via Retrieve / Manage link (view/edit).
4. Confirm admin access, badge print button, and web scanner with an authorized test record.
5. No live deployment performed in this package.

**IMPORTANT:** Existing-delegate changes are still allowed. If the event organizer intends to freeze those as well, that must be separately enabled after a decision.
