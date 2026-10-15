import {json,verifySession,readAllDelegates,recordsStore,appendAudit,now} from './_shared.js';
import {matchesBadge,saveScan,congressCheckInAt} from '../lib/attendance.js';

const MODES = new Set(['congress','voting','apparel']);
const ACTIONS = new Set(['lookup','collect']);

function summary(d,day){
  return {delegateId:d.delegateId,badgeId:d.badgeId,fullName:d.fullName,
    registrationType:d.registrationType,shirtJacketSize:d.shirtJacketSize||'',
    votingStatus:d.votingStatus||(d.votingMember==='Yes'?'Primary Member':'Observer'),
    votingMember:d.votingMember,affiliate:d.affiliate||'',jobTitle:d.jobTitle||'',
    headshotKey:d.headshotKey||'',checkedInAt:d.checkedInAt||null,
    congressCheckInDate:day,congressCheckedInAt:congressCheckInAt(d,day),
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
    if(body.checkins.some(x=>!x||!MODES.has(x.mode)||(x.mode==='apparel'&&x.action!==undefined&&!ACTIONS.has(x.action))))
      return json({error:'Invalid scanner mode or action.'},400);
    const rows=await readAllDelegates({concurrency:12}),store=recordsStore(),results=[];
    for(const item of body.checkins){
      const d=rows.find(row=>matchesBadge(row,item.code));
      const result={localId:item.localId,mode:item.mode};
      if(!d){results.push({...result,status:'not_found'});continue;}
      const saved=await saveScan(store,d.delegateId,item,staff,now());
      if(!saved.delegate){results.push({...result,status:saved.status});continue;}
      const delegate=saved.delegate;
      let action,reason=item.reason||'';
      if(saved.status==='congress_checkin_required'||saved.status==='not_eligible'){
        action='Voting access denied';
        reason=saved.status==='congress_checkin_required'?'Delegate has not completed congress check-in':'Delegate is not eligible for voting';
      }else if(saved.status==='duplicate'){
        action=item.mode==='apparel'?'Duplicate apparel collection attempt':`Duplicate ${item.mode} check-in attempt`;
      }else if(saved.status==='checked_in'){
        action=item.mode==='voting'?'Voting session check-in':item.mode==='apparel'?'Apparel collected':'Congress check-in';
      }
      if(action)await appendAudit({registrationId:delegate.registrationId,delegateId:delegate.delegateId,actor:staff.name,
        action,details:{mode:item.mode,method:item.method||'scan',location:staff.location||'',reason,
          ...(item.mode==='congress'?{conferenceDate:saved.day}:{})}});
      results.push({...result,status:saved.status,delegate:summary(delegate,saved.day)});
    }
    return json({ok:true,results});
  }catch(e){console.error('Scan save failed:',e);return json({error:staff?'Unable to save scan. Please retry.':e.message},staff?500:401);}
};
