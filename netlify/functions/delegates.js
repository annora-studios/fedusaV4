import { json, requireAdmin, readAllDelegates } from "./_shared.js";

export default async (req) => {
  try {
    const url = new URL(req.url);
    requireAdmin(url.searchParams.get("pin"));
    const rows = await readAllDelegates();
    return json({ delegates: rows.map(x => ({
      ...x,
      primaryContact: undefined,
      headshotUrl: `/api/asset/${encodeURIComponent(x.headshotKey)}?pin=${encodeURIComponent(url.searchParams.get("pin"))}`,
      badgeQrUrl: `/api/asset/${encodeURIComponent(x.badgeQrKey)}?pin=${encodeURIComponent(url.searchParams.get("pin"))}`,
      votingQrUrl: x.votingQrKey ? `/api/asset/${encodeURIComponent(x.votingQrKey)}?pin=${encodeURIComponent(url.searchParams.get("pin"))}` : null
    }))});
  } catch (error) {
    return json({ error: error.message }, 401);
  }
};
