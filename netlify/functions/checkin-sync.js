import {json,verifySession,readAllDelegates,recordsStore,appendAudit,now} from './_shared.js';

const MODES = new Set(['congress','voting','apparel']);
const ACTIONS = new Set(['lookup','collect']);

// Treat QR payloads as opaque stored values; a claimed delegateId in arbitrary
// JSON is not sufficient proof that the scanned QR belongs to that delegate.
function findByBadge(rows,code){
  if(typeof code!=='string'||!code.trim())return null;
  return rows.find(d=>d.badgeQrValue===code||d.badgeId===code.trim())||null;
}
function summary(d){
  return {delegateId:d.delegateId,badgeId:d.badgeId,fullName:d.fullName,
    registrationType:d.registrationType,shirtJacketSize:d.shirtJacketSize||'',
    votingStatus:d.votingStatus||(d.votingMember==='Yes'?'Primary Member':'Observer'),
    votingMember:d.votingMember,affiliate:d.affiliate||'',jobTitle:d.jobTitle||'',
    headshotKey:d.headshotKey||'',checkedInAt:d.checkedInAt||null,
    votingCheckedInAt:d.votingCheckedInAt||null,apparelCollectedAt:d.apparelCollectedAt||null,
    checkedInBy:d.checkedInBy||null,votingCheckedInBy:d.votingCheckedInBy||null,
    apparelCollectedBy:d.apparelCollectedBy||null};
}
export default async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  let staff;
  try{
    const body=await req.json();
    staff=verifySession(body.token);
    if(!Array.isArray(body.checkins)||body.checkins.length<1||body.checkins.length>25)
      return json({error:'Provide between 1 and 25 scans.'},400);
    if(body.checkins.some(x=>!MODES.has(x.mode)||(x.mode==='apparel'&&x.action!==undefined&&!ACTIONS.has(x.action))))
      return json({error:'Invalid scanner mode or action.'},400);
    const rows=await readAllDelegates(),results=[];
    for(const item of body.checkins){
      const mode=item.mode;
      const d=findByBadge(rows,item.code);
      if(!d){results.push({localId:item.localId,status:'not_found',mode});continue;}
      const result={localId:item.localId,mode};
      if(d.registrationStatus==='Cancelled'){
        results.push({...result,status:'cancelled',delegate:summary(d)});continue;
      }
      if(mode==='voting'&&!d.checkedInAt){
        await appendAudit({registrationId:d.registrationId,delegateId:d.delegateId,actor:staff.name,action:'Voting access denied',details:{mode,reason:'Delegate has not completed congress check-in',location:staff.location||''}});
        results.push({...result,status:'congress_checkin_required',delegate:summary(d)});continue;
      }
      if(mode==='voting'&&d.votingMember!=='Yes'){
        await appendAudit({registrationId:d.registrationId,delegateId:d.delegateId,actor:staff.name,action:'Voting access denied',details:{mode,reason:'Delegate is not eligible for voting',location:staff.location||''}});
        results.push({...result,status:'not_eligible',delegate:summary(d)});continue;
      }
      const field=mode==='voting'?'votingCheckedInAt':mode==='apparel'?'apparelCollectedAt':'checkedInAt';
      const byField=mode==='voting'?'votingCheckedInBy':mode==='apparel'?'apparelCollectedBy':'checkedInBy';
      const duplicate=Boolean(d[field]);
      // Apparel must be physically handed over before it is recorded. Scanning
      // first returns a lookup result (with size), not a collection event.
      if(mode==='apparel'&&!duplicate&&item.action!=='collect'){
        results.push({...result,status:'ready',delegate:summary(d)});continue;
      }
      if(!duplicate){
        d[field]=now();  // record server timestamp, not a client-supplied date
        d[byField]={username:staff.sub,name:staff.name,location:staff.location||''};
        if(mode==='congress')d.checkinMethod=item.method||'scan';
        if(mode==='apparel')d.apparelCollectionMethod=item.method||'scan';
        await recordsStore().setJSON(`delegate/${d.delegateId}`,d);
      }
      await appendAudit({registrationId:d.registrationId,delegateId:d.delegateId,actor:staff.name,
        action:duplicate?(mode==='apparel'?'Duplicate apparel collection attempt':`Duplicate ${mode} check-in attempt`):
          (mode==='voting'?'Voting session check-in':mode==='apparel'?'Apparel collected':'Congress check-in'),
        details:{mode,method:item.method||'scan',location:staff.location||'',reason:item.reason||''}});
      results.push({...result,status:duplicate?'duplicate':'checked_in',delegate:summary(d)});
    }
    return json({ok:true,results});
  }catch(e){return json({error:staff?'Unable to save scan. Please retry.':e.message},staff?500:401);}
};
