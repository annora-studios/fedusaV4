import {json,requireAdmin,recordsStore,assetsStore,appendAudit,now,token,readAudit} from './_shared.js';
import {sendConfirmation,sendAdminNotification} from './_email.js';
export default async(req)=>{try{
 const url=new URL(req.url);if(req.method==='GET'){requireAdmin(url.searchParams.get('pin'));return json({audit:await readAudit(Number(url.searchParams.get('limit')||200))});}
 if(req.method!=='POST')return json({error:'Method not allowed'},405);const b=await req.json();requireAdmin(b.pin);const store=recordsStore();
 const d=b.delegateId?await store.get(`delegate/${b.delegateId}`,{type:'json'}):null;const reg=d?await store.get(`registration/${d.registrationId}`,{type:'json'}):b.registrationId?await store.get(`registration/${b.registrationId}`,{type:'json'}):null;
 if(!reg)return json({error:'Registration not found.'},404);const baseUrl=process.env.SITE_URL||url.origin;
 if(b.action==='resend'){await sendConfirmation({to:reg.ownerEmail,registration:reg,baseUrl});await appendAudit({registrationId:reg.registrationId,actor:'Admin',action:'Confirmation email resent'});return json({ok:true});}
 if(b.action==='regenerate-link'){reg.editToken=token();reg.updatedAt=now();await store.setJSON(`registration/${reg.registrationId}`,reg);await sendConfirmation({to:reg.ownerEmail,registration:reg,baseUrl});await appendAudit({registrationId:reg.registrationId,actor:'Admin',action:'Management link regenerated'});return json({ok:true});}
 if(b.action==='cancel'){
  if(reg.status==='Cancelled')return json({ok:true,alreadyCancelled:true});reg.status='Cancelled';reg.cancelledAt=now();reg.updatedAt=reg.cancelledAt;await store.setJSON(`registration/${reg.registrationId}`,reg);
  for(const delegateId of reg.delegateIds||[]){const row=await store.get(`delegate/${delegateId}`,{type:'json'});if(row){row.registrationStatus='Cancelled';row.updatedAt=reg.cancelledAt;await store.setJSON(`delegate/${delegateId}`,row);}}
  await appendAudit({registrationId:reg.registrationId,actor:'Admin',action:'Registration cancelled'});try{await sendAdminNotification({type:'cancelled',registration:reg,baseUrl,actor:'Admin',cancelledAt:reg.cancelledAt});}catch(e){console.error('Cancellation notification error',e)}return json({ok:true});
 }
 if(b.action==='delete'){
  if(b.confirmation!=='CONFIRMED')return json({error:'Deletion confirmation is required.'},400);
  const assets=assetsStore();
  const delegateIds=Array.isArray(reg.delegateIds)?reg.delegateIds:[];
  const deletedDelegates=[];
  for(const delegateId of delegateIds){
   const row=await store.get(`delegate/${delegateId}`,{type:'json'});
   if(row){
    if(row.headshotKey){try{await assets.delete(row.headshotKey);}catch(e){console.error('Headshot delete error',row.headshotKey,e)}}
    if(row.badgeQrKey){try{await assets.delete(row.badgeQrKey);}catch(e){console.error('QR delete error',row.badgeQrKey,e)}}
    await store.delete(`delegate/${delegateId}`);deletedDelegates.push(delegateId);
   }
  }
  const delegateIndex=(await store.get('delegates-index',{type:'json'}))||[];
  await store.setJSON('delegates-index',delegateIndex.filter(key=>!delegateIds.some(id=>key===`delegate/${id}`)));
  const registrationIndex=(await store.get('registrations-index',{type:'json'}))||[];
  await store.setJSON('registrations-index',registrationIndex.filter(key=>key!==`registration/${reg.registrationId}`));
  await store.delete(`registration/${reg.registrationId}`);
  await appendAudit({registrationId:reg.registrationId,actor:'Admin',action:'Registration permanently deleted',details:{registrationType:reg.registrationType,ownerEmail:reg.ownerEmail,delegateIds:deletedDelegates,delegateNames:reg.delegateNames||[]}});
  return json({ok:true,deletedRegistrationId:reg.registrationId,deletedDelegateIds:deletedDelegates});
 }
 if(b.action==='change-category'){
  if(!d)return json({error:'Delegate not found.'},404);const target=b.registrationType;if(!['main','affiliate'].includes(target))return json({error:'Invalid registration type.'},400);
  d.registrationType=target;d.affiliate=target==='affiliate'?(b.affiliate||d.affiliate||''):'';d.votingMember=target==='main'?(d.votingMember||'No'):'No';d.accommodation=target==='main'?(d.accommodation||{required:'No'}):{required:'No'};d.updatedAt=now();await store.setJSON(`delegate/${d.delegateId}`,d);
  reg.registrationType=target;reg.affiliate=d.affiliate;reg.primaryContact=target==='affiliate'?(b.primaryContact||reg.primaryContact||{fullName:d.fullName,email:d.email,mobile:d.mobile}):null;reg.ownerEmail=target==='affiliate'?reg.primaryContact.email:d.email;reg.updatedAt=now();await store.setJSON(`registration/${reg.registrationId}`,reg);
  const changes=[`Registration category changed to ${target==='main'?'NOB / International Delegate':'Affiliate'}`];await appendAudit({registrationId:reg.registrationId,delegateId:d.delegateId,actor:'Admin',action:'Registration category changed',details:{registrationType:target}});try{await sendConfirmation({to:reg.ownerEmail,registration:reg,baseUrl,updated:true,changes});await sendAdminNotification({type:'updated',registration:reg,baseUrl,changes,actor:'Admin'});}catch(e){console.error('Category email error',e)}return json({ok:true});
 }
 return json({error:'Unknown action.'},400);
}catch(e){return json({error:e.message},401)}};
