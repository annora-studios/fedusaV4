import {json,requireAdmin,recordsStore,appendAudit,now,token,readAudit,assertNoHardDuplicate,normalizeEmail,normalizeMobile} from './_shared.js';
import {sendConfirmation} from './_email.js';
export default async(req)=>{try{
 const url=new URL(req.url);if(req.method==='GET'){requireAdmin(url.searchParams.get('pin'));return json({audit:await readAudit(Number(url.searchParams.get('limit')||200))});}
 if(req.method!=='POST')return json({error:'Method not allowed'},405);const b=await req.json();requireAdmin(b.pin);const store=recordsStore();
 const d=b.delegateId?await store.get(`delegate/${b.delegateId}`,{type:'json'}):null;const reg=d?await store.get(`registration/${d.registrationId}`,{type:'json'}):b.registrationId?await store.get(`registration/${b.registrationId}`,{type:'json'}):null;
 if(!reg)return json({error:'Registration not found.'},404);
 if(b.action==='resend'){await sendConfirmation({to:reg.ownerEmail,registration:reg,baseUrl:process.env.SITE_URL||url.origin});await appendAudit({registrationId:reg.registrationId,actor:'Admin',action:'Confirmation email resent'});return json({ok:true});}
 if(b.action==='regenerate-link'){reg.editToken=token();reg.updatedAt=now();await store.setJSON(`registration/${reg.registrationId}`,reg);await sendConfirmation({to:reg.ownerEmail,registration:reg,baseUrl:process.env.SITE_URL||url.origin});await appendAudit({registrationId:reg.registrationId,actor:'Admin',action:'Management link regenerated'});return json({ok:true});}
 if(b.action==='change-category'){
  if(!d)return json({error:'Delegate not found.'},404);const target=b.registrationType;if(!['main','affiliate'].includes(target))return json({error:'Invalid registration type.'},400);
  d.registrationType=target;d.affiliate=target==='affiliate'?(b.affiliate||d.affiliate||''):'';d.votingMember=target==='main'?(d.votingMember||'No'):'No';d.accommodation=target==='main'?(d.accommodation||{required:'No'}):{required:'No'};d.updatedAt=now();await store.setJSON(`delegate/${d.delegateId}`,d);
  reg.registrationType=target;reg.affiliate=d.affiliate;reg.primaryContact=target==='affiliate'?(b.primaryContact||reg.primaryContact||{fullName:d.fullName,email:d.email,mobile:d.mobile}):null;reg.ownerEmail=target==='affiliate'?reg.primaryContact.email:d.email;reg.updatedAt=now();await store.setJSON(`registration/${reg.registrationId}`,reg);
  await appendAudit({registrationId:reg.registrationId,delegateId:d.delegateId,actor:'Admin',action:'Registration category changed',details:{registrationType:target}});return json({ok:true});
 }
 return json({error:'Unknown action.'},400);
}catch(e){return json({error:e.message},401)}};
