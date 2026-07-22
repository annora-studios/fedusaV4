import {json,verifySession,readAllDelegates,recordsStore,appendAudit,now} from './_shared.js';
function getId(code){try{const j=JSON.parse(code);return j.delegateId}catch{return null}}
export default async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const body=await req.json(),staff=verifySession(body.token),rows=await readAllDelegates(),results=[];
    for(const item of body.checkins||[]){
      const mode=item.mode==='voting'?'voting':'congress';
      const id=item.delegateId||getId(item.code);
      const d=rows.find(x=>x.delegateId===id||x.badgeId===item.code||x.badgeQrValue===item.code);
      if(!d){results.push({localId:item.localId,status:'not_found',mode});continue}
      if(mode==='voting'&&d.votingMember!=='Yes'){
        await appendAudit({registrationId:d.registrationId,delegateId:d.delegateId,actor:staff.name,action:'Voting access denied',details:{mode,reason:'Delegate is not a voting member',location:item.location||staff.location||''}});
        results.push({localId:item.localId,status:'not_eligible',mode,delegate:summary(d)});continue
      }
      const field=mode==='voting'?'votingCheckedInAt':'checkedInAt';
      const byField=mode==='voting'?'votingCheckedInBy':'checkedInBy';
      const duplicate=Boolean(d[field]);
      if(!duplicate){
        d[field]=item.scannedAt||now();
        d[byField]={username:staff.sub,name:staff.name,location:item.location||staff.location||''};
        if(mode==='congress')d.checkinMethod=item.method||'scan';
        await recordsStore().setJSON(`delegate/${d.delegateId}`,d);
      }
      await appendAudit({registrationId:d.registrationId,delegateId:d.delegateId,actor:staff.name,action:duplicate?`Duplicate ${mode} check-in attempt`:`${mode==='voting'?'Voting session':'Congress'} check-in`,details:{mode,method:item.method||'scan',location:item.location||staff.location||'',offline:Boolean(item.offline),reason:item.reason||''}});
      results.push({localId:item.localId,status:duplicate?'duplicate':'checked_in',mode,delegate:summary(d)});
    }
    return json({ok:true,results});
  }catch(e){return json({error:e.message},401)}
};
function summary(d){return{delegateId:d.delegateId,fullName:d.fullName,registrationType:d.registrationType,votingMember:d.votingMember,checkedInAt:d.checkedInAt||null,votingCheckedInAt:d.votingCheckedInAt||null,checkedInBy:d.checkedInBy||null,votingCheckedInBy:d.votingCheckedInBy||null}}
