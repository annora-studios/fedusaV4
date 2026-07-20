import { json, readAllDelegates, recordsStore, normalizeEmail, normalizeMobile, appendAudit } from './_shared.js';
import { sendManageLink } from './_email.js';
export default async(req)=>{if(req.method!=='POST')return json({error:'Method not allowed'},405);try{
 const body=await req.json();const email=normalizeEmail(body.email),mobile=normalizeMobile(body.mobile);if(!email&&!mobile)return json({error:'Enter your email address or mobile number.'},400);
 const delegates=await readAllDelegates();const delegate=delegates.find(d=>(email&&normalizeEmail(d.email)===email)||(mobile&&normalizeMobile(d.mobile)===mobile));
 // Always return a neutral response to avoid exposing registration data.
 if(delegate){const store=recordsStore(),reg=await store.get(`registration/${delegate.registrationId}`,{type:'json'});if(reg){await sendManageLink({to:reg.ownerEmail,registration:reg,baseUrl:process.env.SITE_URL||new URL(req.url).origin});await appendAudit({registrationId:reg.registrationId,delegateId:delegate.delegateId,actor:'Registrant',action:'Management link retrieved'});}}
 return json({ok:true,message:'If a matching registration was found, the management link has been emailed to the registered contact.'});
}catch(e){console.error(e);return json({error:'Unable to retrieve the registration link right now.'},500)}};
