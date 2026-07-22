# FEDUSA Congress Management Platform v5

## Release focus
Version 5 keeps the Version 4 registration, management, email, admin, badge, export and offline foundations while moving attendance to a single-QR operating model.

## Changes
- Congress dates aligned to 14–16 October 2026.
- One badge QR per delegate. No separate voting QR is generated or displayed.
- New scanner mode selection: Congress Check-in or Voting Session.
- The same badge QR is accepted in both modes.
- Voting mode blocks delegates whose `votingMember` status is not `Yes`.
- Congress and voting attendance are stored separately.
- Duplicate detection works independently for congress and voting attendance.
- Admin view shows congress and voting check-in timestamps.
- Excel export includes both attendance timestamps and one badge QR.
- Offline delegate data includes voting check-in state.
- Audit records identify scanner mode, denied voting access and duplicate attempts.
- Web scanner UI improved for mobile event use.

## Data compatibility
Existing Version 4 delegate records remain compatible. New fields are optional and default to empty until a scan occurs:
- `votingCheckedInAt`
- `votingCheckedInBy`

Legacy `votingQrKey` fields may remain on old records but are ignored by the Version 5 interface.
