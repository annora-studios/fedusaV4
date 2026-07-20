import { Resend } from 'resend';
function client(){if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return null;return new Resend(process.env.RESEND_API_KEY)}
function manageUrl(baseUrl,registration){return `${baseUrl}/manage.html?token=${encodeURIComponent(registration.editToken)}`}
export async function sendConfirmation({to,registration,baseUrl,updated=false}){
  const resend=client();if(!resend)return {skipped:true};
  const affiliate=registration.registrationType==='affiliate';
  const url=manageUrl(baseUrl,registration);
  const subject=updated?'Your FEDUSA Congress registration has been updated':affiliate?'Your FEDUSA Affiliate Registration has been received':'Your FEDUSA Congress Registration has been received';
  const names=(registration.delegateIds||[]).map((id,i)=>registration.delegateNames?.[i]||id).join(', ');
  const html=`<div style="font-family:Arial,sans-serif;color:#102043;max-width:650px;margin:auto"><div style="background:#08275c;padding:24px;color:white"><h1 style="margin:0">FEDUSA Congress Registration</h1></div><div style="padding:28px;border:1px solid #dce3ed"><h2>${updated?'Registration updated':'Registration received successfully'}</h2><p>Registration reference: <strong>${registration.registrationId}</strong></p>${affiliate?`<p>Affiliate: <strong>${registration.affiliate}</strong></p><p>Registered attendees: ${names}</p>`:`<p>Delegate: <strong>${names}</strong></p>`}<p>Use the secure button below to review or amend the existing registration.</p><p><a href="${url}" style="display:inline-block;background:#20a651;color:white;padding:13px 20px;text-decoration:none;border-radius:7px;font-weight:bold">${affiliate?'Manage Affiliate Registration':'Manage My Registration'}</a></p><p style="font-size:12px;color:#667085">Keep this link private. It provides access to edit this registration.</p></div></div>`;
  return resend.emails.send({from:process.env.EMAIL_FROM,to:[to],subject,html});
}
export async function sendManageLink({to,registration,baseUrl}){
 const resend=client();if(!resend)return {skipped:true};const affiliate=registration.registrationType==='affiliate';const url=manageUrl(baseUrl,registration);
 return resend.emails.send({from:process.env.EMAIL_FROM,to:[to],subject:'Your FEDUSA Congress management link',html:`<div style="font-family:Arial,sans-serif;color:#102043;max-width:650px;margin:auto"><div style="background:#08275c;padding:24px;color:white"><h1 style="margin:0">FEDUSA Congress Registration</h1></div><div style="padding:28px;border:1px solid #dce3ed"><h2>Your secure management link</h2><p>Registration reference: <strong>${registration.registrationId}</strong></p><p><a href="${url}" style="display:inline-block;background:#20a651;color:white;padding:13px 20px;text-decoration:none;border-radius:7px;font-weight:bold">${affiliate?'Manage Affiliate Registration':'Manage My Registration'}</a></p><p style="font-size:12px;color:#667085">If you did not request this email, no action is required.</p></div></div>`});
}
