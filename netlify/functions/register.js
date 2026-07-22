import { assetsStore, recordsStore, json, id, token, now, dataUrlToBuffer, makeQr, appendAudit, assertNoHardDuplicate, duplicateCheck, normalizeEmail, normalizeMobile } from './_shared.js';
import { sendConfirmation } from './_email.js';
function validateFlight(f){if(!f||f.status==='Not booked')return;if(!f.airline||!f.flightNumber||!f.date||!f.time)throw new Error('Complete all booked flight details or select No flight booked yet.');}
export default async(req)=>{if(req.method!=='POST')return json({error:'Method not allowed'},405);try{
 const body=await req.json(); if(!['affiliate','main'].includes(body.registrationType))return json({error:'Select a valid registration type.'},400);
 if(body.registrationType==='affiliate'&&(!body.affiliate||!body.primaryContact?.fullName||!body.primaryContact?.email||!Array.isArray(body.attendees)||!body.attendees.length))return json({error:'Affiliate and logistics contact information is required.'},400);
 if(body.registrationType==='main'&&!body.delegate)return json({error:'Main delegate information is required.'},400);
 const people=body.registrationType==='affiliate'?body.attendees:[body.delegate];
 const localEmails=new Set(),localMobiles=new Set(); const possibleWarnings=[];
 for(const person of people){
  if(!person.fullName||!person.email||!person.mobile||!person.shirtJacketSize||!person.headshot?.dataUrl)throw new Error('A required attendee field is missing.');
  const ne=normalizeEmail(person.email),nm=normalizeMobile(person.mobile);
  if(localEmails.has(ne)||localMobiles.has(nm))throw new Error('The same delegate has been added more than once in this submission.');
  localEmails.add(ne);localMobiles.add(nm);
  const match=await assertNoHardDuplicate(person); if(match.possible)possibleWarnings.push({fullName:person.fullName,possibleDelegateId:match.possible.delegateId});
 }
 const records=recordsStore(),assets=assetsStore();
 const delegateIndex=(await records.get('delegates-index',{type:'json'}))||[],registrationIndex=(await records.get('registrations-index',{type:'json'}))||[];
 const registrationId=id(body.registrationType==='affiliate'?'AFFREG':'MAINREG'),editToken=token(),created=[],delegateIds=[],delegateNames=[];
 for(const person of people){
  validateFlight(person.inboundFlight);validateFlight(person.outboundFlight);
  if(!person.conferenceDates?.checkIn||!person.conferenceDates?.checkOut)throw new Error('Check-in and check-out dates are required.'); if(person.conferenceDates.checkOut<=person.conferenceDates.checkIn)throw new Error('Check-out must be after check-in.');
  const delegateId=id('DEL'),badgeId=id('BADGE'),voting=body.registrationType==='main'&&person.votingMember==='Yes'?'Yes':'No';
  const badgeQrValue=JSON.stringify({type:'FEDUSA_CHECKIN',delegateId,name:person.fullName,badgeId,attendeeType:body.registrationType==='main'?'VIP':'AFFILIATE',voting:voting==='Yes'});
  const upload=dataUrlToBuffer(person.headshot.dataUrl); if(!['image/jpeg','image/png','image/webp'].includes(upload.mime))throw new Error('Unsupported headshot format.'); if(upload.buffer.length>4*1024*1024)throw new Error('A headshot exceeds 4 MB.');
  const ext=upload.mime==='image/png'?'png':upload.mime==='image/webp'?'webp':'jpg',headshotKey=`headshots/${delegateId}.${ext}`,badgeQrKey=`qrcodes/${delegateId}-badge.png`;
  await assets.set(headshotKey,upload.buffer,{metadata:{contentType:upload.mime}}); await assets.set(badgeQrKey,await makeQr(badgeQrValue),{metadata:{contentType:'image/png'}});
  const row={registrationId,registrationType:body.registrationType,delegateId,badgeId,createdAt:now(),updatedAt:now(),affiliate:body.registrationType==='affiliate'?body.affiliate:'',primaryContact:body.registrationType==='affiliate'?body.primaryContact:null,fullName:person.fullName,jobTitle:person.jobTitle||'',email:person.email,mobile:person.mobile,normalizedEmail:normalizeEmail(person.email),normalizedMobile:normalizeMobile(person.mobile),dietary:person.dietary||'None',accessibility:person.accessibility||'',shirtJacketSize:person.shirtJacketSize,votingMember:voting,accommodation:body.registrationType==='main'?(person.accommodation||{required:'No'}):{required:'No'},conferenceDates:person.conferenceDates,inboundFlight:person.inboundFlight||{status:'Not booked'},outboundFlight:person.outboundFlight||{status:'Not booked'},headshotKey,badgeQrKey,badgeQrValue,checkedInAt:null,votingCheckedInAt:null,votingCheckedInBy:null,checkedInBy:null,checkinMethod:null,badgePrintedAt:null};
  const key=`delegate/${delegateId}`;await records.setJSON(key,row);delegateIndex.push(key);delegateIds.push(delegateId);delegateNames.push(person.fullName);created.push({delegateId,badgeId,fullName:person.fullName,singleQrGenerated:true});
 }
 const ownerEmail=body.registrationType==='affiliate'?body.primaryContact.email:body.delegate.email;
 const registration={registrationId,registrationType:body.registrationType,affiliate:body.affiliate||'',primaryContact:body.primaryContact||null,ownerEmail,delegateIds,delegateNames,editToken,status:'Submitted',createdAt:now(),updatedAt:now()};
 await records.setJSON(`registration/${registrationId}`,registration);registrationIndex.push(`registration/${registrationId}`);await records.setJSON('registrations-index',registrationIndex);await records.setJSON('delegates-index',delegateIndex);
 await appendAudit({registrationId,actor:'Registrant',action:'Registration submitted',details:{registrationType:body.registrationType,delegateIds,possibleWarnings}});
 const baseUrl=process.env.SITE_URL||new URL(req.url).origin; let email={skipped:true}; try{email=await sendConfirmation({to:ownerEmail,registration,baseUrl});}catch(e){console.error('Email error',e)}
 return json({ok:true,registrationId,delegates:created,emailSent:!email?.skipped,possibleDuplicateWarnings:possibleWarnings},201);
}catch(error){console.error(error);if(error.code==='DUPLICATE_DELEGATE'){await appendAudit({actor:'Registrant',action:'Duplicate registration blocked',details:{delegateId:error.match?.delegateId,registrationId:error.match?.registrationId}});return json({error:error.message,code:error.code},409)}return json({error:error.message||'Registration failed.'},400)}};
