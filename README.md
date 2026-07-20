# FEDUSA Congress Management Platform v4

Version 4 adds central delegate identity checking, duplicate prevention, secure management links, registration-link retrieval, confirmation emails and expanded admin controls to the existing Netlify platform.

## Main features

- VIP / Main Delegate registration
- Affiliate group registration through a Logistics Contact
- Central delegate register stored in Netlify Blobs
- Hard duplicate prevention using normalised email and mobile number
- Soft possible-duplicate warnings using name and organisation
- Confirmation and update emails through Resend
- Secure `Manage My Registration` and `Manage Affiliate Registration` links
- `Retrieve My Registration` page
- Admin email resend, management-link regeneration and category changes
- Audit logging
- Badge, QR, check-in, Excel export and Android scanner compatibility

## Deploy

1. Upload the contents of this folder to the root of the GitHub repository connected to Netlify.
2. Configure the variables below in Netlify.
3. Trigger **Clear cache and deploy site**.
4. Run the tests in `V4-TEST-CHECKLIST.md`.

## Required Netlify variables

- `ADMIN_PIN` - strong private admin password
- `SESSION_SECRET` - long random value, minimum 32 characters
- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM` - verified sender, for example `FEDUSA Congress <congress@fedusa.org.za>`
- `SITE_URL` - production URL without a trailing slash
- `STAFF_USERS` - JSON array for scanner staff accounts

The platform uses Netlify Blobs and does not require a separate SQL database for v4.

## Main URLs

- Registration: `/`
- Retrieve link: `/retrieve.html`
- Manage registration: `/manage.html?token=...`
- Admin: `/admin.html`
- Badges: `/badges.html`
- Check-in: `/checkin.html`

## Security notes

- Never commit API keys, passwords or session secrets to GitHub.
- Management tokens are long random values and must be kept private.
- Retrieval responses are intentionally neutral so they do not reveal whether a person is registered.
- Duplicate checks are applied to new registrations and edits.
