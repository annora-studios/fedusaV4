import { getStore } from "@netlify/blobs";
import QRCode from "qrcode";
import crypto from "node:crypto";

export const recordsStore = () => getStore("fedusa-records");
export const assetsStore = () => getStore("fedusa-assets");

export function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });
}

export function requireAdmin(pin) {
  const expected = process.env.ADMIN_PIN;
  if (!expected) throw new Error("ADMIN_PIN is not configured in Netlify.");
  if (!pin || pin !== expected) throw new Error("Invalid admin PIN.");
}

export function id(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export function dataUrlToBuffer(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
  if (!match) throw new Error("Invalid uploaded image.");
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

export async function makeQr(text) {
  return QRCode.toBuffer(text, { type: "png", width: 600, margin: 2, errorCorrectionLevel: "H" });
}

export function token(bytes=24){ return crypto.randomBytes(bytes).toString('hex'); }
export function now(){ return new Date().toISOString(); }
export function safeEqual(a,b){
  if(typeof a!=='string'||typeof b!=='string') return false;
  const aa=Buffer.from(a),bb=Buffer.from(b); return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}
export function normalizeEmail(value=''){ return String(value).trim().toLowerCase(); }
export function normalizeMobile(value=''){
  let digits=String(value).replace(/\D/g,'');
  if(digits.startsWith('0027')) digits=digits.slice(2);
  if(digits.startsWith('0') && digits.length>=10) digits=`27${digits.slice(1)}`;
  return digits;
}
export function normalizeName(value=''){ return String(value).trim().toLowerCase().replace(/\s+/g,' '); }
export function normalizeOrganisation(value=''){ return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,''); }

export async function readAllDelegates() {
  const store = recordsStore();
  const index = (await store.get("delegates-index", { type: "json" })) || [];
  const rows = [];
  for (const key of index) {
    const row = await store.get(key, { type: "json" });
    if (row) rows.push(row);
  }
  return rows.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function duplicateCheck(person,{excludeDelegateIds=[]}={}){
  const email=normalizeEmail(person.email), mobile=normalizeMobile(person.mobile);
  const name=normalizeName(person.fullName), organisation=normalizeOrganisation(person.jobTitle||person.organisation||'');
  const delegates=await readAllDelegates();
  const eligible=delegates.filter(d=>!excludeDelegateIds.includes(d.delegateId));
  const emailMatch=email?eligible.find(d=>normalizeEmail(d.email)===email):null;
  const mobileMatch=mobile?eligible.find(d=>normalizeMobile(d.mobile)===mobile):null;
  const possible=name?eligible.find(d=>normalizeName(d.fullName)===name && (!organisation || normalizeOrganisation(d.jobTitle||d.affiliate||'')===organisation)):null;
  return {emailMatch,mobileMatch,possible};
}

export async function assertNoHardDuplicate(person,options={}){
  const match=await duplicateCheck(person,options);
  if(match.emailMatch || match.mobileMatch){
    const field=match.emailMatch?'email address':'mobile number';
    const error=new Error(`This delegate is already registered using the same ${field}. Use Manage Registration or Retrieve My Registration instead.`);
    error.code='DUPLICATE_DELEGATE';
    error.match=match.emailMatch||match.mobileMatch;
    throw error;
  }
  return match;
}

export function staffUsers(){
  try { return JSON.parse(process.env.STAFF_USERS||'[]'); } catch { return []; }
}
export function createSession(user){
  const secret=process.env.SESSION_SECRET||process.env.ADMIN_PIN;
  if(!secret) throw new Error('SESSION_SECRET is not configured.');
  const payload=Buffer.from(JSON.stringify({sub:user.username,name:user.name,role:user.role||'scanner',location:user.location||'',exp:Date.now()+12*60*60*1000})).toString('base64url');
  const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
export function verifySession(value){
  const secret=process.env.SESSION_SECRET||process.env.ADMIN_PIN;
  if(!secret||!value) throw new Error('Staff session required.');
  const [payload,sig]=value.split('.');
  const expected=crypto.createHmac('sha256',secret).update(payload||'').digest('base64url');
  if(!safeEqual(sig||'',expected)) throw new Error('Invalid staff session.');
  const data=JSON.parse(Buffer.from(payload,'base64url').toString());
  if(data.exp<Date.now()) throw new Error('Staff session expired.');
  return data;
}
export async function appendAudit(entry){
  const store=recordsStore(); const key=`audit/${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  await store.setJSON(key,{...entry,at:entry.at||now()});
  const index=(await store.get('audit-index',{type:'json'}))||[]; index.push(key); await store.setJSON('audit-index',index.slice(-20000));
}
export async function readAudit(limit=200){
  const store=recordsStore(); const index=(await store.get('audit-index',{type:'json'}))||[]; const rows=[];
  for(const key of index.slice(-limit).reverse()){const row=await store.get(key,{type:'json'});if(row)rows.push(row);} return rows;
}
export async function findRegistrationByToken(editToken){
  const store=recordsStore(); const index=(await store.get('registrations-index',{type:'json'}))||[];
  for(const key of index){ const r=await store.get(key,{type:'json'}); if(r&&safeEqual(r.editToken||'',editToken||'')) return r; }
  return null;
}
export async function findRegistrationById(registrationId){
  return recordsStore().get(`registration/${registrationId}`,{type:'json'});
}
