import { getStore } from "@netlify/blobs";

const siteID = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_AUTH_TOKEN;
const confirmation = process.env.CONFIRM_RESET;

if (!siteID || !token) {
  throw new Error("Missing NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN.");
}

if (confirmation !== "RESET FEDUSA DATA") {
  throw new Error("Reset confirmation did not match.");
}

const recordsStore = getStore("fedusa-records", {
  siteID,
  token,
  consistency: "strong",
});

const assetsStore = getStore("fedusa-assets", {
  siteID,
  token,
  consistency: "strong",
});

const recordsResult = await recordsStore.deleteAll();
const assetsResult = await assetsStore.deleteAll();

console.log(`Deleted record objects: ${recordsResult.deletedBlobs}`);
console.log(`Deleted asset objects: ${assetsResult.deletedBlobs}`);
console.log("FEDUSA database reset complete.");
