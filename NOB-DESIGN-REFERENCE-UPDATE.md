# FEDUSA NOB Badge — Artwork Alignment
Date: 13 October 2026

## New design source
- `NOB BADGES.pdf` supplied as the approved reference (one 95 x 145 mm NOB front).
- Header and footer graphics were extracted from this PDF at approximately 300 dpi to preserve the original logo, illustration, lettering and event details.
- NOB-only front badge styling now matches the supplied front: navy circular photograph border, mixed-case centered name, narrow rounded navy NOB label and an organization line. No NOB/INTERNATIONAL wording is printed.
- Only NOB front styling was changed. Affiliate badge styling remains as previously built; its external approved PDF was not available to cross-check in this update.

## QR and scanner logic
- The badge BACK still displays the delegate's existing stored `badgeQrUrl` once.
- The single QR identifies the same delegate for congress, eligible voting and apparel collection depending on the selected web scanner mode.
- The apparel workflow requires a staff confirmation before recording `apparelCollectedAt`; duplicate collections produce a warning.
- No QR value regeneration or changes to registration QR encoding were made.

## Page setup and validation
- A4 portrait: two delegates per page, each front immediately adjacent to its back for folding (95 x 145 mm per panel, 190 x 145 mm per foldable strip).
- Browser print proof generated with one NOB reference sample and one synthetic Affiliate sample.
- QR on both print samples decoded from the rendered PDF (test QR values only; not connected to live registration records).
- Existing local web-scanner backend unit tests passed with congress, voting, apparel, duplicate and cancelled-registration cases.
- Existing photo and QR print-resolution validation continues to apply.

## Before live printing
1. Test Netlify live/staging scanner login and camera scanning over HTTPS using a phone.
2. Print on an actual A4 printer at 100% / Actual size; disable browser headers/footers and enable background graphics.
3. Use actual delegate headshots and stored QR codes; sample QR values in the proof are NOT valid delegate badges.
4. Verify the NOB organization line. Current main registration data provides `jobTitle`, not an explicit NOB organization/union field. The badge prefers an organization/company/union field if one exists and otherwise falls back to job title.
5. Check the Affiliate artwork against its approved PDF when supplied.

No live Netlify project was modified or deployed by this ZIP update.
