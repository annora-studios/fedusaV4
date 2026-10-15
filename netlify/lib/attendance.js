export const CONGRESS_DATES = ['2026-10-14', '2026-10-15', '2026-10-16'];
export const CONGRESS_TIME_ZONE = 'Africa/Johannesburg';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CONGRESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});

export function congressDate(value = new Date()) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(x => [x.type, x.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// The original timestamp stays intact. Older records need no bulk migration.
export function congressHistory(delegate) {
  const history = {...(delegate.congressCheckIns || {})};
  const firstDate = congressDate(delegate.checkedInAt);
  if (firstDate && !history[firstDate]?.checkedInAt) {
    history[firstDate] = {
      checkedInAt: delegate.checkedInAt,
      checkedInBy: delegate.checkedInBy || null,
      method: delegate.checkinMethod || 'scan'
    };
  }
  return history;
}

export function congressCheckInAt(delegate, date) {
  return congressHistory(delegate)[date]?.checkedInAt || null;
}

export function matchesBadge(delegate, code, allowLegacy = false) {
  if (typeof code !== 'string' || !code.trim()) return false;
  return delegate.badgeQrValue === code || delegate.badgeId === code.trim() ||
    (allowLegacy && delegate.delegateQrValue === code);
}

// Re-read the delegate with strong consistency and compare-and-swap on writes.
// Concurrent scanners cannot overwrite each other's attendance/collection data.
export async function saveScan(store, delegateId, item, staff, timestamp, allowLegacy = false) {
  const day = congressDate(timestamp);
  if (!day) throw new Error('Invalid server scan timestamp.');
  const key = `delegate/${delegateId}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await store.getWithMetadata(key, {type: 'json', consistency: 'strong'});
    if (!snapshot?.data || !matchesBadge(snapshot.data, item.code, allowLegacy)) return {status: 'not_found', day};
    const d = snapshot.data;
    if (d.registrationStatus === 'Cancelled') return {status: 'cancelled', delegate: d, day};
    if (item.mode === 'voting' && !d.checkedInAt) return {status: 'congress_checkin_required', delegate: d, day};
    if (item.mode === 'voting' && d.votingMember !== 'Yes') return {status: 'not_eligible', delegate: d, day};

    const field = item.mode === 'voting' ? 'votingCheckedInAt' : item.mode === 'apparel' ? 'apparelCollectedAt' : 'checkedInAt';
    const byField = item.mode === 'voting' ? 'votingCheckedInBy' : item.mode === 'apparel' ? 'apparelCollectedBy' : 'checkedInBy';
    const duplicate = item.mode === 'congress' ? Boolean(congressCheckInAt(d, day)) : Boolean(d[field]);
    if (duplicate) return {status: 'duplicate', delegate: d, day};
    if (item.mode === 'apparel' && item.action !== 'collect') return {status: 'ready', delegate: d, day};

    const actor = {username: staff.sub, name: staff.name, location: staff.location || ''};
    if (item.mode === 'congress') {
      d.congressCheckIns = congressHistory(d);
      d.congressCheckIns[day] = {checkedInAt: timestamp, checkedInBy: actor, method: item.method || 'scan'};
      if (!d.checkedInAt) {
        d.checkedInAt = timestamp;
        d.checkedInBy = actor;
        d.checkinMethod = item.method || 'scan';
      }
    } else {
      d[field] = timestamp;
      d[byField] = actor;
      if (item.mode === 'apparel') d.apparelCollectionMethod = item.method || 'scan';
    }
    if (!snapshot.etag) throw new Error('Delegate version unavailable; scan was not saved.');
    const result = await store.setJSON(key, d, {onlyIfMatch: snapshot.etag, metadata: snapshot.metadata || {}});
    if (result.modified) return {status: 'checked_in', delegate: d, day};
  }
  throw new Error('Delegate changed during scanning. Please scan again.');
}
