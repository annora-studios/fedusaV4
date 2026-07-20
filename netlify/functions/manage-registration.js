import { json, findRegistrationByToken, recordsStore, assetsStore, dataUrlToBuffer, now, appendAudit, assertNoHardDuplicate, normalizeEmail, normalizeMobile } from './_shared.js';
import { sendConfirmation } from './_email.js';
async function hydrate(reg){const store=recordsStore(),people=[];for(const id of reg.delegateIds||[]){const d=await store.get(`delegate/${id}`,{type:'json'});if(d)people.push({...d,headshotUrl:`/api/asset/${encodeURIComponent(d.headshotKey)}?editToken=${encodeURIComponent(reg.editToken)}`});}return {...reg,editToken:undefined,people};}
export default async(req)=>{try{const url=new URL(req.url),payload=req.method!=='GET'?await req.clone().json():{},editToken=url.searchParams.get('token')||payload.token;const reg=await findRegistrationByToken(editToken);if(!reg)return json({error:'Registration link is invalid or expired.'},404);
 if(req.method==='GET')return json({registration:await hydrate(reg)});
 if(req.method!=='PUT')return json({error:'Method not allowed'},405);const body=await req.json(),store=recordsStore(),assets=assetsStore();
 for(const update of body.people||[]){if(!reg.delegateIds.includes(update.delegateId))continue;await assertNoHardDuplicate(update,{excludeDelegateIds:reg.delegateIds});}
 for(const update of body.people||[]){if(!reg.delegateIds.includes(update.delegateId))continue;const d=await store.get(`delegate/${update.delegateId}`,{type:'json'});if(!d)continue;
  for(const key of ['fullName','jobTitle','email','mobile','dietary','accessibility','shirtJacketSize','conferenceDates','inboundFlight','outboundFlight'])if(update[key]!==undefined)d[key]=update[key];
  d.normalizedEmail=normalizeEmail(d.email);d.normalizedMobile=normalizeMobile(d.mobile);
  if(reg.registrationType==='main'){if(update.votingMember!==undefined)d.votingMember=update.votingMember==='Yes'?'Yes':'No';if(update.accommodation!==undefined)d.accommodation=update.accommodation;}
  if(update.headshot?.dataUrl){const up=dataUrlToBuffer(update.headshot.dataUrl);if(!['image/jpeg','image/png','image/webp'].includes(up.mime))throw new Error('Unsupported headshot format.');await assets.set(d.headshotKey,up.buffer,{metadata:{contentType:up.mime}});} d.updatedAt=now();await store.setJSON(`delegate/${d.delegateId}`,d);
 }
 if(reg.registrationType==='affiliate'&&body.primaryContact){reg.primaryContact={...reg.primaryContact,...body.primaryContact};reg.ownerEmail=reg.primaryContact.email;}else if(reg.registrationType==='main'&&body.people?.[0]?.email){reg.ownerEmail=body.people[0].email;}
 reg.delegateNames=[];for(const did of reg.delegateIds){const d=await store.get(`delegate/${did}`,{type:'json'});reg.delegateNames.push(d?.fullName||did);}
 reg.updatedAt=now();reg.status='Updated';await store.setJSON(`registration/${reg.registrationId}`,reg);await appendAudit({registrationId:reg.registrationId,actor:'Registrant',action:'Registration updated'});
 try{await sendConfirmation({to:reg.ownerEmail,registration:reg,baseUrl:process.env.SITE_URL||url.origin,updated:true});}catch(e){console.error(e)}return json({ok:true,registration:await hydrate(reg)});
}catch(e){return json({error:e.message,code:e.code},e.code==='DUPLICATE_DELEGATE'?409:400)}};
