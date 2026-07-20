import { json, requireAdmin, readAllDelegates, recordsStore } from "./_shared.js";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    requireAdmin(body.pin);
    const delegates = await readAllDelegates();
    const found = delegates.find(x => x.delegateQrValue === body.code || x.badgeId === body.code);
    if (!found) return json({ error: "Delegate QR code not found. Voting QR codes cannot be used for check-in." }, 404);
    if (!found.checkedInAt) {
      found.checkedInAt = new Date().toISOString();
      await recordsStore().setJSON(`delegate/${found.delegateId}`, found);
    }
    return json({ ok: true, delegate: { fullName: found.fullName, affiliate: found.affiliate, registrationType: found.registrationType, checkedInAt: found.checkedInAt } });
  } catch (error) {
    return json({ error: error.message }, 401);
  }
};
