import { Resend } from 'resend';
import { recordsStore } from './_shared.js';

function client(){
  if(!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function sendEmail(resend,payload,{retries=3,initialDelay=0}={}){
  if(initialDelay>0)await sleep(initialDelay);
  let lastError=null;
  for(let attempt=0;attempt<retries;attempt++){
    const result=await resend.emails.send(payload);
    if(!result?.error)return result;
    lastError=result.error;
    const status=Number(result.error.statusCode||result.error.status||0);
    const retryable=status===429||status>=500||/rate|timeout|temporar/i.test(String(result.error.message||''));
    if(!retryable||attempt===retries-1)break;
    await sleep(700*(attempt+1));
  }
  const message=lastError?.message||'Email delivery failed';
  const error=new Error(message);
  error.details=lastError;
  throw error;
}

function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function manageUrl(baseUrl,registration){return `${baseUrl}/manage.html?token=${encodeURIComponent(registration.editToken)}`;}
function adminUrl(baseUrl){return `${baseUrl}/admin.html`;}
function adminRecipients(){
  return String(process.env.ADMIN_NOTIFICATION_EMAILS || process.env.ADMIN_NOTIFICATION_EMAIL || '')
    .split(',').map(x=>x.trim()).filter(Boolean);
}
const copy={
 en:{title:'FEDUSA Congress Registration',received:'Registration confirmed',updated:'Registration updated',reference:'Registration reference',affiliate:'Affiliate',attendees:'Registered attendees',delegate:'Delegate',summary:'Registration summary',changes:'Changes made',instruction:'Use the secure button below to review or amend this registration.',manageAffiliate:'Manage Affiliate Registration',manageMine:'Manage My Registration',privacy:'Keep this link private. It provides access to edit this registration.',subjectReceived:'FEDUSA Congress registration confirmed',subjectAffiliate:'FEDUSA affiliate registration confirmed',subjectUpdated:'Your FEDUSA Congress registration has been updated',none:'No changes were identified.'},
 fr:{title:'Inscription au congrès FEDUSA',received:'Inscription confirmée',updated:'Inscription mise à jour',reference:'Référence de l’inscription',affiliate:'Affilié',attendees:'Participants inscrits',delegate:'Délégué',summary:'Résumé de l’inscription',changes:'Modifications apportées',instruction:'Utilisez le bouton sécurisé ci-dessous pour consulter ou modifier cette inscription.',manageAffiliate:'Gérer l’inscription affiliée',manageMine:'Gérer mon inscription',privacy:'Gardez ce lien confidentiel. Il permet de modifier cette inscription.',subjectReceived:'Inscription au congrès FEDUSA confirmée',subjectAffiliate:'Inscription affiliée FEDUSA confirmée',subjectUpdated:'Votre inscription au congrès FEDUSA a été mise à jour',none:'Aucune modification n’a été identifiée.'},
 pt:{title:'Inscrição no Congresso FEDUSA',received:'Inscrição confirmada',updated:'Inscrição atualizada',reference:'Referência da inscrição',affiliate:'Afiliado',attendees:'Participantes inscritos',delegate:'Delegado',summary:'Resumo da inscrição',changes:'Alterações efetuadas',instruction:'Utilize o botão seguro abaixo para consultar ou alterar esta inscrição.',manageAffiliate:'Gerir inscrição de afiliado',manageMine:'Gerir a minha inscrição',privacy:'Mantenha este link privado. Permite editar esta inscrição.',subjectReceived:'Inscrição no Congresso FEDUSA confirmada',subjectAffiliate:'Inscrição de afiliado FEDUSA confirmada',subjectUpdated:'A sua inscrição no Congresso FEDUSA foi atualizada',none:'Não foram identificadas alterações.'},
 es:{title:'Inscripción al Congreso FEDUSA',received:'Inscripción confirmada',updated:'Inscripción actualizada',reference:'Referencia de inscripción',affiliate:'Afiliado',attendees:'Asistentes inscritos',delegate:'Delegado',summary:'Resumen de la inscripción',changes:'Cambios realizados',instruction:'Utilice el botón seguro de abajo para revisar o modificar esta inscripción.',manageAffiliate:'Gestionar inscripción de afiliado',manageMine:'Gestionar mi inscripción',privacy:'Mantenga este enlace privado. Permite editar esta inscripción.',subjectReceived:'Inscripción al Congreso FEDUSA confirmada',subjectAffiliate:'Inscripción de afiliado FEDUSA confirmada',subjectUpdated:'Su inscripción al Congreso FEDUSA ha sido actualizada',none:'No se identificaron cambios.'}
};
function languageCopy(registration){return copy[registration.language]||copy.en;}
function shell(title,body){return `<div style="background:#f4f7fb;padding:24px"><div style="font-family:Arial,sans-serif;color:#102043;max-width:680px;margin:auto;background:#fff"><div style="background:#08275c;padding:24px;color:white"><h1 style="font-size:24px;margin:0">${esc(title)}</h1></div><div style="padding:28px;border:1px solid #dce3ed;border-top:0">${body}</div></div></div>`;}
function button(url,label){return `<p style="margin:24px 0"><a href="${esc(url)}" style="display:inline-block;background:#20a651;color:white;padding:13px 20px;text-decoration:none;border-radius:7px;font-weight:bold">${esc(label)}</a></p>`;}
function field(label,value){return `<tr><td style="padding:7px 10px;color:#667085;border-bottom:1px solid #edf0f4">${esc(label)}</td><td style="padding:7px 10px;font-weight:600;border-bottom:1px solid #edf0f4">${esc(value||'—')}</td></tr>`;}
async function hydratePeople(registration){
  const store=recordsStore(),people=[];
  for(const delegateId of registration.delegateIds||[]){const d=await store.get(`delegate/${delegateId}`,{type:'json'});if(d)people.push(d);}
  return people;
}
function attendeeTable(people){
  const rows=people.map(p=>`<tr><td style="padding:8px;border-bottom:1px solid #edf0f4">${esc(p.fullName)}</td><td style="padding:8px;border-bottom:1px solid #edf0f4">${esc(p.email)}</td><td style="padding:8px;border-bottom:1px solid #edf0f4">${esc(p.votingStatus||(p.votingMember==='Yes'?'Primary Member':'Observer'))}</td></tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:8px;background:#eef3f8">Name</th><th style="text-align:left;padding:8px;background:#eef3f8">Email</th><th style="text-align:left;padding:8px;background:#eef3f8">Voting status</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function delegateSummary(person){return `<table style="width:100%;border-collapse:collapse">${field('Name',person?.fullName)}${field('Organisation / Job title',person?.jobTitle)}${field('Email',person?.email)}${field('Mobile',person?.mobile)}${field('Voting status',person?.votingStatus||(person?.votingMember==='Yes'?'Primary Member':'Observer'))}${field('Conference dates',person?.conferenceDates?.checkIn&&person?.conferenceDates?.checkOut?`${person.conferenceDates.checkIn} to ${person.conferenceDates.checkOut}`:'')}</table>`;}
function changeList(changes,c){
  const list=(changes||[]).filter(Boolean);
  if(!list.length)return `<p>${esc(c.none)}</p>`;
  return `<ul>${list.map(x=>`<li style="margin:6px 0">${esc(x)}</li>`).join('')}</ul>`;
}
export async function sendConfirmation({to,registration,baseUrl,updated=false,changes=[]}){
  const resend=client();if(!resend)return {skipped:true,reason:'Email is not configured'};
  const affiliate=registration.registrationType==='affiliate',url=manageUrl(baseUrl,registration),c=languageCopy(registration),people=await hydratePeople(registration);
  const subject=updated?c.subjectUpdated:affiliate?c.subjectAffiliate:c.subjectReceived;
  const body=`<h2>${esc(updated?c.updated:c.received)}</h2><p>${esc(c.reference)}: <strong>${esc(registration.registrationId)}</strong></p>${affiliate?`<p>${esc(c.affiliate)}: <strong>${esc(registration.affiliate)}</strong></p><h3>${esc(c.attendees)}</h3>${attendeeTable(people)}`:`<h3>${esc(c.summary)}</h3>${delegateSummary(people[0])}`}${updated?`<h3>${esc(c.changes)}</h3>${changeList(changes,c)}`:''}<p>${esc(c.instruction)}</p>${button(url,affiliate?c.manageAffiliate:c.manageMine)}<p style="font-size:12px;color:#667085">${esc(c.privacy)}</p>`;
  return sendEmail(resend,{from:process.env.EMAIL_FROM,to:[to],subject,html:shell(c.title,body)});
}
export async function sendManageLink({to,registration,baseUrl}){
  const resend=client();if(!resend)return {skipped:true};const affiliate=registration.registrationType==='affiliate',c=languageCopy(registration),url=manageUrl(baseUrl,registration);
  return sendEmail(resend,{from:process.env.EMAIL_FROM,to:[to],subject:`${c.title} - ${c.reference}`,html:shell(c.title,`<h2>${esc(c.reference)}</h2><p><strong>${esc(registration.registrationId)}</strong></p>${button(url,affiliate?c.manageAffiliate:c.manageMine)}<p style="font-size:12px;color:#667085">${esc(c.privacy)}</p>`) });
}
export async function sendAdminNotification({type,registration,baseUrl,changes=[],actor='',cancelledAt=''}){
  const resend=client(),to=adminRecipients();if(!resend||!to.length)return {skipped:true,reason:'Admin email is not configured'};
  const people=await hydratePeople(registration);let subject='',heading='',details='';
  if(type==='new-main'){subject='New NOB / International Delegate Registration';heading=subject;details=delegateSummary(people[0]);}
  else if(type==='new-affiliate'){subject='New Affiliate Registration';heading=subject;details=`<table style="width:100%;border-collapse:collapse">${field('Affiliate',registration.affiliate)}${field('Logistics contact',registration.primaryContact?.fullName)}${field('Logistics email',registration.primaryContact?.email)}${field('Number of attendees',people.length)}</table><h3>Attendees</h3>${attendeeTable(people)}`;}
  else if(type==='updated'){subject='FEDUSA Registration Updated';heading='Registration updated';details=`<p><strong>Updated by:</strong> ${esc(actor||'Unknown')}</p><h3>Changes</h3>${changeList(changes,copy.en)}`;}
  else if(type==='cancelled'){subject='FEDUSA Registration Cancelled';heading='Registration cancelled';details=`<table style="width:100%;border-collapse:collapse">${field('Name / Affiliate',registration.registrationType==='affiliate'?registration.affiliate:people[0]?.fullName)}${field('Cancelled at',cancelledAt||registration.cancelledAt)}${field('Cancelled by',actor||'Admin')}</table>`;}
  else return {skipped:true,reason:'Unknown notification type'};
  const body=`<h2>${esc(heading)}</h2><p>Registration reference: <strong>${esc(registration.registrationId)}</strong></p>${details}${button(adminUrl(baseUrl),'Open Admin Portal')}`;
  return sendEmail(resend,{from:process.env.EMAIL_FROM,to,subject:`${subject} - ${registration.registrationId}`,html:shell('FEDUSA Admin Notification',body)},{initialDelay:650});
}
