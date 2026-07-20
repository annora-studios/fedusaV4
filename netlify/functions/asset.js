import { assetsStore, requireAdmin, findRegistrationByToken } from "./_shared.js";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const pin=url.searchParams.get("pin"), editToken=url.searchParams.get("editToken");
    if(pin) requireAdmin(pin); else if(editToken){ const reg=await findRegistrationByToken(editToken); if(!reg) throw new Error("Invalid registration link."); } else throw new Error("Access denied.");
    const key = url.searchParams.get("key");
    if (!key) return new Response("Missing key", { status: 400 });
    const store = assetsStore();
    const data = await store.get(key, { type: "arrayBuffer" });
    if (!data) return new Response("Not found", { status: 404 });
    const meta = await store.getMetadata(key);
    return new Response(data, { headers: { "content-type": meta?.metadata?.contentType || "application/octet-stream", "cache-control": "private, max-age=300" } });
  } catch (error) {
    return new Response(error.message, { status: 401 });
  }
};
