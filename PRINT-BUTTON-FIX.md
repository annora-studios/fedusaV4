# FEDUSA Print Badges button fix — 13 October 2026

## Why the button was grey
`Print badges` is deliberately disabled until badge loading completes. Previously,
**one** headshot under 480 px, one QR image under 450 px, or one broken photo
would throw an error, leaving the button disabled for the entire delegate list.
The previous page also required an extra click on `Load badges` even if an
Admin PIN was already saved in the browser session.

## Changes
- If a PIN is already stored by the admin panel, the badges are prepared automatically.
- If there is no PIN, the page explains that it must be entered and `Load badges` clicked.
- Headshots below 480 px now show a visible quality warning rather than blocking everyone.
- Badges with broken photographs, broken QR images or unreadable QR dimensions are skipped
  individually and shown in a preparation-note list; valid badges remain printable.
- A missing common design asset continues to block printing, because the badge would be incomplete.
- Cancelled registrations are excluded.
- The same QR code continues to be used for congress, voting and apparel modes.
- NOB and Affiliate front designs and 2-up A4 folding layout are unchanged.

## Testing / deployment
- The project is not deployed by this download. Deploy the ZIP contents to the connected Netlify project.
- Open `/admin.html` and login with your Admin PIN, then select `Print badges`.
- The page should automatically prepare badges and enable printing when any valid badges exist.
- If it does not, read the red error and yellow preparation notes above the preview.
- Print at Actual size (100%), backgrounds enabled and browser headers/footers disabled.
- Use a phone to scan a real printed badge in all three web scanner modes.
