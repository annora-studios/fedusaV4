import { json, requireAdmin, readAllDelegates, recordsStore, now } from './_shared.js';
import { matchesBadge, saveScan, congressCheckInAt } from '../lib/attendance.js';

export default async (req) => {
  if (req.method !== 'POST') return json({error: 'Method not allowed'}, 405);
  let authenticated = false;
  try {
    const body = await req.json();
    requireAdmin(body.pin);
    authenticated = true;
    const delegates = await readAllDelegates({concurrency: 12});
    const found = delegates.find(x => matchesBadge(x, body.code, true));
    if (!found) return json({error: 'Delegate QR code not found.'}, 404);
    const saved = await saveScan(recordsStore(), found.delegateId,
      {code: body.code, mode: 'congress', method: 'scan'},
      {sub: 'admin', name: 'Admin', location: ''}, now(), true);
    if (saved.status === 'not_found') return json({error: 'Delegate QR code not found.'}, 404);
    if (saved.status === 'cancelled') return json({error: 'Registration cancelled.'}, 403);
    const d = saved.delegate;
    return json({ok: true, status: saved.status, delegate: {
      fullName: d.fullName, affiliate: d.affiliate, registrationType: d.registrationType,
      checkedInAt: congressCheckInAt(d, saved.day), firstCheckedInAt: d.checkedInAt,
      congressCheckInDate: saved.day
    }});
  } catch (error) {
    return json({error: authenticated ? 'Unable to save scan. Please retry.' : error.message}, authenticated ? 500 : 401);
  }
};
