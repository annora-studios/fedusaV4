import {test} from 'node:test';
import assert from 'node:assert/strict';
import {congressDate,congressHistory,congressCheckInAt,saveScan} from '../netlify/lib/attendance.js';

const staff={sub:'staff-1',name:'Test Staff',location:'Entrance'};
const original={delegateId:'D-1',registrationId:'R-1',badgeId:'B-1',badgeQrValue:'original-qr',fullName:'Test Delegate',registrationType:'main',votingMember:'Yes',checkedInAt:'2026-10-14T06:00:00.000Z',checkedInBy:{name:'Day 1 Staff'},checkinMethod:'scan',votingCheckedInAt:null,apparelCollectedAt:'2026-10-14T07:00:00.000Z',apparelCollectedBy:{name:'Apparel Staff'}};
const clone=x=>structuredClone(x);
class Store{
 constructor(record){this.record=clone(record);this.version=1;this.writes=0;this.conflicts=false;}
 async getWithMetadata(key,options){assert.equal(key,'delegate/D-1');assert.equal(options.consistency,'strong');return this.record?{data:clone(this.record),etag:`v${this.version}`,metadata:{source:'test'}}:null;}
 async setJSON(key,value,options){assert.ok(options.onlyIfMatch);if(this.conflicts||options.onlyIfMatch!==`v${this.version}`)return {modified:false};this.record=clone(value);this.version++;this.writes++;return {modified:true,etag:`v${this.version}`};}
}
const item=(mode='congress',extra={})=>({code:'original-qr',mode,method:'scan',...extra});

await test('Day 1 legacy scan is recognised without rewriting yesterday',async()=>{
 const store=new Store(original);const result=await saveScan(store,'D-1',item(),staff,'2026-10-14T10:00:00Z');
 assert.equal(result.status,'duplicate');assert.equal(store.writes,0);assert.equal(congressCheckInAt(store.record,'2026-10-14'),original.checkedInAt);
});
await test('same QR works on Day 2 and Day 3, once each, preserving first check-in and apparel',async()=>{
 const store=new Store(original);
 for(const day of ['15','16']){
  const at=`2026-10-${day}T06:00:00.000Z`;
  assert.equal((await saveScan(store,'D-1',item(),staff,at)).status,'checked_in');
  assert.equal((await saveScan(store,'D-1',item(),staff,`2026-10-${day}T07:00:00Z`)).status,'duplicate');
  assert.equal(congressCheckInAt(store.record,`2026-10-${day}`),at);
 }
 assert.deepEqual(Object.keys(congressHistory(store.record)).sort(),['2026-10-14','2026-10-15','2026-10-16']);
 for(const field of ['checkedInAt','checkedInBy','checkinMethod','votingCheckedInAt','apparelCollectedAt','apparelCollectedBy','badgeQrValue'])assert.deepEqual(store.record[field],original[field]);
 assert.equal(store.writes,2);
});
await test('a Day 1 non-attendee gets Day 2 only, without a fabricated Day 1 attendance',async()=>{
 const store=new Store({...original,checkedInAt:null,checkedInBy:null});
 const result=await saveScan(store,'D-1',item(),staff,'2026-10-15T06:00:00Z');
 assert.equal(result.status,'checked_in');assert.equal(congressCheckInAt(store.record,'2026-10-14'),null);assert.equal(store.record.checkedInAt,'2026-10-15T06:00:00Z');
});
await test('South African midnight changes the day, including before UTC midnight',async()=>{
 assert.equal(congressDate('2026-10-14T21:59:59.999Z'),'2026-10-14');
 assert.equal(congressDate('2026-10-14T22:00:00.000Z'),'2026-10-15');
 assert.equal(congressDate('2026-10-15T22:00:00.000Z'),'2026-10-16');
 const store=new Store(original);assert.equal((await saveScan(store,'D-1',item(),staff,'2026-10-14T22:00:00Z')).status,'checked_in');
 assert.equal(congressDate(null),'');assert.equal(congressDate('invalid'),'');
});
await test('voting remains once for the whole conference, even across different dates',async()=>{
 const store=new Store(original);
 assert.equal((await saveScan(store,'D-1',item('voting'),staff,'2026-10-15T10:00:00Z')).status,'checked_in');
 assert.equal((await saveScan(store,'D-1',item('voting'),staff,'2026-10-16T10:00:00Z')).status,'duplicate');
 assert.equal(store.record.votingCheckedInAt,'2026-10-15T10:00:00Z');
 assert.equal(store.record.congressCheckIns,undefined);
});
await test('voting eligibility and prior congress check-in remain required',async()=>{
 const a=new Store({...original,checkedInAt:null});const b=new Store({...original,votingMember:'No'});
 assert.equal((await saveScan(a,'D-1',item('voting'),staff,'2026-10-15T10:00:00Z')).status,'congress_checkin_required');
 assert.equal((await saveScan(b,'D-1',item('voting'),staff,'2026-10-15T10:00:00Z')).status,'not_eligible');
 assert.equal(a.writes+b.writes,0);
});
await test('apparel remains once-off; lookup never records a handover',async()=>{
 const old=new Store(original);assert.equal((await saveScan(old,'D-1',item('apparel',{action:'collect'}),staff,'2026-10-15T10:00:00Z')).status,'duplicate');
 const fresh=new Store({...original,apparelCollectedAt:null,apparelCollectedBy:null});
 assert.equal((await saveScan(fresh,'D-1',item('apparel',{action:'lookup'}),staff,'2026-10-15T10:00:00Z')).status,'ready');assert.equal(fresh.writes,0);
 assert.equal((await saveScan(fresh,'D-1',item('apparel',{action:'collect'}),staff,'2026-10-15T10:00:00Z')).status,'checked_in');
 assert.equal((await saveScan(fresh,'D-1',item('apparel',{action:'collect'}),staff,'2026-10-16T10:00:00Z')).status,'duplicate');
});
await test('simultaneous congress scans record one success and one duplicate',async()=>{
 const store=new Store(original);
 const results=await Promise.all([saveScan(store,'D-1',item(),staff,'2026-10-15T06:00:00Z'),saveScan(store,'D-1',item(),staff,'2026-10-15T06:00:01Z')]);
 assert.deepEqual(results.map(x=>x.status).sort(),['checked_in','duplicate']);assert.equal(store.writes,1);
});
await test('simultaneous congress, voting and apparel writes preserve all three',async()=>{
 const store=new Store({...original,apparelCollectedAt:null});const at='2026-10-15T06:00:00Z';
 const results=await Promise.all(['congress','voting','apparel'].map(mode=>saveScan(store,'D-1',item(mode,{action:'collect'}),staff,at)));
 assert.ok(results.every(x=>x.status==='checked_in'));assert.equal(store.record.checkedInAt,original.checkedInAt);
 assert.equal(store.record.votingCheckedInAt,at);assert.equal(store.record.apparelCollectedAt,at);assert.equal(congressCheckInAt(store.record,'2026-10-15'),at);
});
await test('cancelled, deleted and wrong-code records cannot check in',async()=>{
 const cancelled=new Store({...original,registrationStatus:'Cancelled'});
 assert.equal((await saveScan(cancelled,'D-1',item(),staff,'2026-10-15T06:00:00Z')).status,'cancelled');
 const wrong=new Store(original);assert.equal((await saveScan(wrong,'D-1',item('congress',{code:'{"delegateId":"D-1"}'}),staff,'2026-10-15T06:00:00Z')).status,'not_found');
 const deleted=new Store(null);assert.equal((await saveScan(deleted,'D-1',item(),staff,'2026-10-15T06:00:00Z')).status,'not_found');
 assert.equal(cancelled.writes+wrong.writes+deleted.writes,0);
});
await test('repeated write conflicts fail visibly and never report success',async()=>{
 const store=new Store(original);store.conflicts=true;
 await assert.rejects(saveScan(store,'D-1',item(),staff,'2026-10-15T06:00:00Z'),/Please scan again/);
 assert.equal(store.writes,0);assert.deepEqual(store.record,original);
});
