const formShell=document.querySelector('#formShell');
const form=document.querySelector('#registrationForm');
const steps=document.querySelector('#stepsPanel');
const summaryPath=document.querySelector('#summaryPath');
const summaryContent=document.querySelector('#summaryContent');
const commonTemplate=document.querySelector('#commonPersonFields');
const modal=document.querySelector('#promoModal');
let currentPath=null;
let attendeeSeq=0;

const flightFields=(prefix)=>`<div class="flight-card"><div class="section-head"><h4>${prefix==='inbound'?'Inbound flight':'Outbound flight'}</h4><label class="inline-check"><input type="checkbox" class="${prefix}-not-booked"> No flight booked yet</label></div><div class="form-grid ${prefix}-fields"><label>Airline<input class="${prefix}-airline"></label><label>Flight Number<input class="${prefix}-number"></label><label>${prefix==='inbound'?'Arrival':'Departure'} Date<input class="${prefix}-date" type="date"></label><label>${prefix==='inbound'?'Arrival':'Departure'} Time<input class="${prefix}-time" type="time"></label></div></div>`;

function stepsHtml(path){return path==='affiliate'?`<div class="step active"><div class="step-number">1</div><div><h3>Affiliate Details</h3><p>Main representative and affiliate information</p></div></div><div class="step active"><div class="step-number">2</div><div><h3>Add Attendees</h3><p>Personal, clothing, headshot and flight details</p></div></div><div class="step"><div class="step-number">3</div><div><h3>Review & Submit</h3><p>Confirm and create attendee badges</p></div></div>`:`<div class="step active"><div class="step-number">1</div><div><h3>Delegate Details</h3><p>Personal and conference information</p></div></div><div class="step active"><div class="step-number">2</div><div><h3>Travel & Stay</h3><p>Accommodation and flight information</p></div></div><div class="step"><div class="step-number">3</div><div><h3>Review & Submit</h3><p>Confirm voting and badge details</p></div></div>`}

function affiliateForm(){return `<section class="form-section"><h2 class="section-title">Affiliate Registration</h2><p class="section-subtitle">Please indicate the person who will be the main contact for all Congress logistics (travel, accommodation, and registration-related communication).</p><div class="affiliate-grid"><div class="field-card"><h3>Affiliate Details</h3><label>Affiliate Name *<select id="affiliateName" required><option value="">Select affiliate</option><option>ALTSA</option><option>HOSPERSA</option><option>IBSA</option><option>MISA</option><option>MTWU</option><option>NAPTOSA</option><option>NATU</option><option>NTEU</option><option>NULAW</option><option>NUHRCCHAW</option><option>PEU</option><option>PSA</option><option>SACU</option><option>SAOU</option><option>SAPTU</option><option>TENUSA</option><option>UASA</option><option>UNIPSAWU</option></select></label></div><div class="field-card"><h3>Logistics Contact Person</h3><div class="form-grid"><label>Full Name *<input id="repName" required></label><label>Organisation<input id="repRole"></label><label>Email Address *<input id="repEmail" type="email" required></label><label>Mobile Number *<input id="repPhone" required></label></div></div></div></section><section class="form-section"><div class="section-head"><div><h2 class="section-title">Affiliate Attendees</h2><p class="section-subtitle">Affiliate attendees cannot select voting status.</p></div><button type="button" id="addAttendee" class="outline-btn">+ Add attendee</button></div><div id="attendeeList"></div></section>${consentAndActions()}`}

function mainForm(){return `<section class="form-section"><h2 class="section-title">VIP / Main Delegate Registration</h2><p class="section-subtitle">Register individually. No affiliate information is required.</p><div id="mainPerson" class="field-card"></div></section><section class="form-section"><h2 class="section-title">Voting & Accommodation</h2><div class="form-grid"><label>Voting Member? *<select id="mainVoting" required><option value="No">No</option><option value="Yes">Yes</option></select></label><label>Accommodation Required? *<select id="accommodationRequired" required><option value="No">No</option><option value="Yes">Yes</option></select></label></div><div class="form-grid" style="margin-top:16px"><label>Check-in Date *<input id="conferenceCheckIn" type="date" required></label><label>Check-out Date *<input id="conferenceCheckOut" type="date" required></label></div></section><section class="form-section"><h2 class="section-title">Flight Information</h2><p class="section-subtitle">Provide inbound and outbound flight details, or select “No flight booked yet”.</p>${flightFields('inbound')}${flightFields('outbound')}</section>${consentAndActions()}`}

function consentAndActions(){return `<section class="form-section"><label class="inline-check"><input id="consent" type="checkbox" required> I confirm that the information is correct and may be used for conference administration, badges and check-in.</label><div id="success" class="success hidden"></div><div id="error" class="error hidden"></div></section><div class="actions"><button type="button" id="changePath" class="outline-btn">Change registration path</button><button type="submit" class="primary-btn">Submit Registration</button></div>`}

function commonFields(container){container.appendChild(commonTemplate.content.cloneNode(true))}

function createAttendee(){attendeeSeq++;const card=document.createElement('article');card.className='delegate-card';card.dataset.id=attendeeSeq;card.innerHTML=`<div class="delegate-head"><h3>Attendee</h3><button type="button" class="remove-btn">Remove</button></div><div class="person-fields"></div><div class="form-grid" style="margin-top:16px"><label>Check-in Date *<input class="conference-check-in" type="date" required></label><label>Check-out Date *<input class="conference-check-out" type="date" required></label></div>${flightFields('inbound')}${flightFields('outbound')}`;commonFields(card.querySelector('.person-fields'));document.querySelector('#attendeeList').appendChild(card);renumber();bindPhoto(card);bindFlightToggles(card);updateSummary()}

function bindPhoto(scope){scope.querySelectorAll('.person-photo').forEach(input=>input.addEventListener('change',()=>{const file=input.files[0],preview=input.closest('.form-grid').querySelector('.photo-preview');if(!file){preview.textContent='Photo preview';delete input.dataset.preview;return}const reader=new FileReader();reader.onload=()=>{input.dataset.preview=reader.result;preview.innerHTML=`<img src="${reader.result}" alt="Headshot preview">`;updateSummary()};reader.readAsDataURL(file)}))}

function bindFlightToggles(scope){['inbound','outbound'].forEach(prefix=>{const check=scope.querySelector(`.${prefix}-not-booked`);if(!check)return;check.addEventListener('change',()=>{scope.querySelector(`.${prefix}-fields`).classList.toggle('hidden',check.checked);scope.querySelectorAll(`.${prefix}-fields input`).forEach(i=>{i.required=!check.checked;i.disabled=check.checked});updateSummary()});scope.querySelectorAll(`.${prefix}-fields input`).forEach(i=>i.required=true)})}

function renumber(){const cards=[...document.querySelectorAll('.delegate-card')];cards.forEach((c,i)=>{c.querySelector('h3').textContent=`Attendee ${i+1}`;c.querySelector('.remove-btn').style.visibility=cards.length===1?'hidden':'visible'})}

function selectPath(path){currentPath=path;formShell.classList.remove('hidden','affiliate-theme','main-theme');formShell.classList.add(path==='affiliate'?'affiliate-theme':'main-theme');steps.innerHTML=stepsHtml(path);summaryPath.textContent=path==='affiliate'?'AFFILIATE ATTENDEE PATH':'VIP / MAIN DELEGATE PATH';form.innerHTML=path==='affiliate'?affiliateForm():mainForm();if(path==='affiliate'){document.querySelector('#addAttendee').onclick=createAttendee;createAttendee()}else{commonFields(document.querySelector('#mainPerson'));bindPhoto(form);bindFlightToggles(form)}document.querySelector('#changePath').onclick=resetPath;form.querySelectorAll('input,select,textarea').forEach(el=>{el.addEventListener('input',updateSummary);el.addEventListener('change',updateSummary)});form.scrollIntoView({behavior:'smooth',block:'start'});updateSummary()}

function resetPath(){currentPath=null;formShell.classList.add('hidden');form.innerHTML='';window.scrollTo({top:document.querySelector('#registration-start').offsetTop-25,behavior:'smooth'})}

function initials(name){return(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?'}
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function personSummary(scope,label){const name=scope.querySelector('.person-name')?.value||'Not entered';const title=scope.querySelector('.person-title')?.value||'';const preview=scope.querySelector('.person-photo')?.dataset.preview;return `<div class="summary-person"><div class="summary-avatar">${preview?`<img src="${preview}">`:initials(name)}</div><div><strong>${esc(name)}</strong><p>${esc(title||label)}</p></div></div>`}

function updateSummary(){if(!currentPath)return;if(currentPath==='affiliate'){const affiliate=document.querySelector('#affiliateName')?.value||'Not selected';const rep=document.querySelector('#repName')?.value||'Not entered';const cards=[...document.querySelectorAll('.delegate-card')];summaryContent.innerHTML=`<div class="summary-block"><h3>Affiliate</h3><p>${esc(affiliate)}</p></div><div class="summary-block"><h3>Main Member</h3><p>${esc(rep)}</p><p>${esc(document.querySelector('#repEmail')?.value||'')}</p></div><div class="summary-block"><h3>Attendees (${cards.length})</h3>${cards.map(c=>personSummary(c,'Affiliate attendee')).join('')}</div>`}else{const scope=document.querySelector('#mainPerson');summaryContent.innerHTML=`<div class="summary-block"><h3>Main Delegate</h3>${personSummary(scope,'VIP / Main Delegate')}</div><div class="summary-block"><h3>Voting</h3><p>${esc(document.querySelector('#mainVoting')?.value||'No')}</p></div><div class="summary-block"><h3>Accommodation Required</h3><p>${esc(document.querySelector('#accommodationRequired')?.value||'No')}</p></div><div class="summary-block"><h3>Conference Dates</h3><p>${esc(document.querySelector('#conferenceCheckIn')?.value||'')} ${document.querySelector('#conferenceCheckOut')?.value?'to '+esc(document.querySelector('#conferenceCheckOut').value):''}</p></div>`}}

async function filePayload(input){const file=input.files[0];if(!file)throw new Error('A headshot is required.');if(file.size>4*1024*1024)throw new Error('Each headshot must be smaller than 4 MB.');return{name:file.name,type:file.type,dataUrl:input.dataset.preview||await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}}
function flightPayload(scope,prefix){const noFlight=scope.querySelector(`.${prefix}-not-booked`).checked;return{status:noFlight?'Not booked':'Booked',airline:noFlight?'':scope.querySelector(`.${prefix}-airline`).value.trim(),flightNumber:noFlight?'':scope.querySelector(`.${prefix}-number`).value.trim(),date:noFlight?'':scope.querySelector(`.${prefix}-date`).value,time:noFlight?'':scope.querySelector(`.${prefix}-time`).value}}
async function personPayload(scope){return{fullName:scope.querySelector('.person-name').value.trim(),jobTitle:scope.querySelector('.person-title').value.trim(),email:scope.querySelector('.person-email').value.trim(),mobile:scope.querySelector('.person-phone').value.trim(),dietary:scope.querySelector('.person-diet').value,accessibility:scope.querySelector('.person-access').value.trim(),shirtJacketSize:scope.querySelector('.person-size').value,headshot:await filePayload(scope.querySelector('.person-photo'))}}

form.addEventListener('submit',async e=>{e.preventDefault();const error=form.querySelector('#error'),success=form.querySelector('#success');error.classList.add('hidden');success.classList.add('hidden');if(!form.checkValidity()){form.reportValidity();return}const button=e.submitter;button.disabled=true;button.textContent='Submitting…';try{let payload;if(currentPath==='affiliate'){const attendees=[];for(const card of document.querySelectorAll('.delegate-card')){const checkIn=card.querySelector('.conference-check-in').value,checkOut=card.querySelector('.conference-check-out').value;if(checkOut<=checkIn)throw new Error('Conference check-out must be after the check-in date.');attendees.push({...await personPayload(card),conferenceDates:{checkIn,checkOut},inboundFlight:flightPayload(card,'inbound'),outboundFlight:flightPayload(card,'outbound')})}payload={registrationType:'affiliate',affiliate:document.querySelector('#affiliateName').value,primaryContact:{fullName:document.querySelector('#repName').value.trim(),role:document.querySelector('#repRole').value.trim(),email:document.querySelector('#repEmail').value.trim(),mobile:document.querySelector('#repPhone').value.trim()},attendees}}else{const checkIn=document.querySelector('#conferenceCheckIn').value,checkOut=document.querySelector('#conferenceCheckOut').value;if(checkOut<=checkIn)throw new Error('Conference check-out must be after the check-in date.');payload={registrationType:'main',delegate:{...await personPayload(document.querySelector('#mainPerson')),votingMember:document.querySelector('#mainVoting').value,accommodation:{required:document.querySelector('#accommodationRequired').value},conferenceDates:{checkIn,checkOut},inboundFlight:flightPayload(form,'inbound'),outboundFlight:flightPayload(form,'outbound')}}}const response=await fetch('/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Registration failed.');success.textContent=`Registration successful. ${data.delegates.length} attendee record(s) created.`;success.classList.remove('hidden');showPromo(currentPath)}catch(err){error.textContent=err.message;error.classList.remove('hidden')}finally{button.disabled=false;button.textContent='Submit Registration'}})

function resetRegistrationForm(){
    currentPath = null;
    formShell.classList.add('hidden');
    form.innerHTML = '';
    summaryContent.innerHTML = '';
    summaryPath.textContent = '';
    window.scrollTo({
        top: document.querySelector('#registration-start').offsetTop - 25,
        behavior: 'smooth'
    });
}

function showPromo(path){
    modal.classList.remove('hidden','affiliate-theme','main-theme');
    modal.classList.add(path==='affiliate'?'affiliate-theme':'main-theme');

    const kicker=document.querySelector('#promoKicker');
    const title=document.querySelector('#promoTitle');
    const text=document.querySelector('#promoText');
    const link=document.querySelector('#promoLink');
    const dismiss=document.querySelector('#promoDismiss');

    if(path==='main'){
        kicker.textContent='REGISTRATION SUCCESSFUL';
        title.textContent='Registration Submitted Successfully!';
        text.textContent='Your registration has been submitted successfully. Optional excursions are available should you wish to join.';
        link.textContent='View Details';
        link.href='/excursions.html';
        dismiss.textContent='Maybe Later';
    }else{
        kicker.textContent='SUCCESS!!!';
        title.textContent='Registration Submitted Successfully!!!';
        text.textContent='Thank you for completing your conference registration. A confirmation will be sent to your email address.';
        link.textContent='Refresh';
        link.href='/#';
        dismiss.textContent='Close';
    }

    setTimeout(()=>{
        modal.classList.add('show');
    },10);

    if(path==='affiliate'){
        setTimeout(()=>{
            closeModal();
            resetRegistrationForm();
            window.scrollTo({top:0,behavior:'smooth'});
        },3000);
    }
}


function closeModal(){
    modal.classList.remove('show');

    // Wait for fade animation before hiding completely
    setTimeout(()=>{
        modal.classList.add('hidden');
    },400);
}


document.querySelectorAll('.path-card')
.forEach(b=>b.onclick=()=>selectPath(b.dataset.path));

document.querySelector('.modal-close').onclick=closeModal;
document.querySelector('#promoDismiss').onclick=()=>{
    if(currentPath==='main'){
        closeModal();
        resetRegistrationForm();
        window.scrollTo({top:0,behavior:'smooth'});
    }else{
        closeModal();
    }
};

modal.addEventListener('click',e=>{
    if(e.target===modal) closeModal();
});

// Interactive hero controls and countdown
const heroVideo=document.querySelector('#heroVideo');
const videoToggle=document.querySelector('#videoToggle');
const muteToggle=document.querySelector('#muteToggle');
if(heroVideo&&videoToggle){videoToggle.addEventListener('click',()=>{if(heroVideo.paused){heroVideo.play().catch(()=>{});videoToggle.textContent='Pause';videoToggle.setAttribute('aria-label','Pause background video')}else{heroVideo.pause();videoToggle.textContent='Play';videoToggle.setAttribute('aria-label','Play background video')}})}
if(heroVideo&&muteToggle){muteToggle.addEventListener('click',()=>{heroVideo.muted=!heroVideo.muted;muteToggle.textContent=heroVideo.muted?'Sound off':'Sound on';muteToggle.setAttribute('aria-label',heroVideo.muted?'Unmute background video':'Mute background video')})}
const eventStart=new Date('2026-10-14T09:00:00+02:00').getTime();
function updateCountdown(){const distance=eventStart-Date.now();const values=distance>0?{d:Math.floor(distance/86400000),h:Math.floor(distance%86400000/3600000),m:Math.floor(distance%3600000/60000),s:Math.floor(distance%60000/1000)}:{d:0,h:0,m:0,s:0};[['countDays',values.d],['countHours',values.h],['countMinutes',values.m],['countSeconds',values.s]].forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=String(value).padStart(2,'0')})}
updateCountdown();setInterval(updateCountdown,1000);
document.querySelectorAll('.speaker-more').forEach(button=>button.addEventListener('click',()=>{const bio=button.nextElementSibling;const opening=bio.classList.contains('hidden');bio.classList.toggle('hidden');button.textContent=opening?'Hide speaker details':'View speaker details'}));
