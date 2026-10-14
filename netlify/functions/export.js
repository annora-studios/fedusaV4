import { assetsStore, requireAdmin, readAllDelegates } from './_shared.js';

// Leave room for workbook XML and the platform's binary-response encoding.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_WORKBOOK_BYTES = 4 * 1024 * 1024;
const RESPONSE_HEADERS = { 'cache-control': 'no-store' };

const columns=[
  ['Registration ID','registrationId',22],['Registration Type','registrationType',20],['Delegate ID','delegateId',22],['Badge ID','badgeId',24],
  ['Affiliate','affiliate',20],['Main Member','primaryName',24],['Main Member Email','primaryEmail',30],['Main Member Mobile','primaryMobile',18],
  ['Delegate Name','fullName',26],['Job Title','jobTitle',24],['Delegate Email','email',30],['Mobile','mobile',18],['Dietary','dietary',16],
  ['Accessibility','accessibility',24],['Shirt / Jacket Size','shirtJacketSize',18],['Voting Status','votingStatus',18],['Voting Member','votingMember',15],
  ['Accommodation Required','accommodationRequired',20],['Conference Check-in','conferenceCheckIn',22],['Conference Check-out','conferenceCheckOut',22],
  ['Inbound Flight Status','inboundStatus',20],['Inbound Airline','inboundAirline',18],['Inbound Flight Number','inboundNumber',20],['Arrival Date','arrivalDate',16],['Arrival Time','arrivalTime',16],
  ['Outbound Flight Status','outboundStatus',20],['Outbound Airline','outboundAirline',18],['Outbound Flight Number','outboundNumber',20],['Departure Date','departureDate',16],['Departure Time','departureTime',16],
  ['Congress Checked In At','checkedInAt',24],['Voting Checked In At','votingCheckedInAt',24],['Apparel Collected At','apparelCollectedAt',24],['Headshot','headshot',18],['Badge QR','delegateQr',18]
].map(([header,key,width])=>({header,key,width}));


async function withTimeout(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Export operation timed out.')), milliseconds);
      })
    ]);
  } finally { clearTimeout(timer); }
}

function imageExtension(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpeg';
  if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) return 'gif';
  return null; // WebP is accepted by registration but cannot be embedded by ExcelJS.
}

async function loadImages(rows, assets) {
  const keys = [...new Set(rows.flatMap(x => [x.headshotKey, x.badgeQrKey])
    .filter(key => typeof key === 'string' && key.length > 0))];
  const images = new Map();
  const deadline = Date.now() + 18000;
  let next = 0, bytes = 0;
  await Promise.all(Array.from({length: Math.min(8, keys.length)}, async () => {
    while (next < keys.length) {
      const key = keys[next++];
      let result = {note: 'Not embedded (export limit); view in admin portal'};
      if (Date.now() < deadline && bytes < MAX_IMAGE_BYTES) {
        try {
          const data = await withTimeout(assets.get(key, {type: 'arrayBuffer'}),
            Math.max(1, Math.min(3000, deadline - Date.now())));
          if (!data) {
            result = {note: 'Image unavailable'};
          } else {
            const buffer = Buffer.from(data), extension = imageExtension(buffer);
            if (!extension) result = {note: 'Unsupported image format; view in admin portal'};
            else if (bytes + buffer.length <= MAX_IMAGE_BYTES) {
              bytes += buffer.length;
              result = {buffer, extension};
            }
          }
        } catch {
          // Images are optional; never discard delegate data for a failed asset read.
          result = {note: 'Image unavailable; view in admin portal'};
        }
      }
      images.set(key, result);
    }
  }));
  return images;
}

function addTableSheet(wb, name, rows, images, imageIds, includeImages) {
  const ws = wb.addWorksheet(name, {views: [{state: 'frozen', ySplit: 1}]});
  ws.columns = columns;
  ws.getRow(1).font = {bold: true};
  ws.getRow(1).height = 25;
  for (const x of rows) {
    const row = ws.addRow({registrationId:x.registrationId,registrationType:x.registrationType==='affiliate'?'Affiliate Attendee':'VIP / Main Delegate',delegateId:x.delegateId,badgeId:x.badgeId,affiliate:x.affiliate||'',primaryName:x.primaryContact?.fullName||'',primaryEmail:x.primaryContact?.email||'',primaryMobile:x.primaryContact?.mobile||'',fullName:x.fullName,jobTitle:x.jobTitle,email:x.email,mobile:x.mobile,dietary:x.dietary,accessibility:x.accessibility,shirtJacketSize:x.shirtJacketSize,votingStatus:x.votingStatus||(x.votingMember==='Yes'?'Primary Member':'Observer'),votingMember:x.votingMember,accommodationRequired:x.accommodation?.required||'No',conferenceCheckIn:x.conferenceDates?.checkIn||x.accommodation?.checkIn||'',conferenceCheckOut:x.conferenceDates?.checkOut||x.accommodation?.checkOut||'',inboundStatus:x.inboundFlight?.status||'',inboundAirline:x.inboundFlight?.airline||'',inboundNumber:x.inboundFlight?.flightNumber||'',arrivalDate:x.inboundFlight?.date||'',arrivalTime:x.inboundFlight?.time||'',outboundStatus:x.outboundFlight?.status||'',outboundAirline:x.outboundFlight?.airline||'',outboundNumber:x.outboundFlight?.flightNumber||'',departureDate:x.outboundFlight?.date||'',departureTime:x.outboundFlight?.time||'',checkedInAt:x.checkedInAt||'',votingCheckedInAt:x.votingCheckedInAt||'',apparelCollectedAt:x.apparelCollectedAt||''});
    row.height = 30;
    for (const [key, column] of [[x.headshotKey, 'headshot'], [x.badgeQrKey, 'delegateQr']]) {
      const cell = row.getCell(column);
      if (typeof key !== 'string' || !key) { cell.value = 'No image'; continue; }
      const asset = images.get(key);
      if (!includeImages || !asset?.buffer) {
        cell.value = includeImages ? (asset?.note || 'Image unavailable') : 'Not embedded (export limit); view in admin portal';
        cell.alignment = {wrapText: true, vertical: 'middle'};
        continue;
      }
      // One media file per asset, shared by the all-delegates and category sheets.
      if (!imageIds.has(key)) imageIds.set(key, wb.addImage(asset));
      ws.addImage(imageIds.get(key), {
        tl: {col: cell.col - 1 + .1, row: row.number - 1 + .1},
        ext: {width: 85, height: 85}
      });
      row.height = 95;
    }
  }
}

function buildWorkbook(ExcelJS, rows, images, includeImages = true) {
  const wb = new ExcelJS.Workbook(), imageIds = new Map();
  addTableSheet(wb, 'All Delegates', rows, images, imageIds, includeImages);
  addTableSheet(wb, 'Affiliate Attendees', rows.filter(x => x.registrationType === 'affiliate'), images, imageIds, includeImages);
  addTableSheet(wb, 'Main Delegates', rows.filter(x => x.registrationType === 'main'), images, imageIds, includeImages);
  return wb;
}

function errorResponse(message, status) {
  return new Response(JSON.stringify({error: message}), {
    status, headers: {...RESPONSE_HEADERS, 'content-type': 'application/json'}
  });
}

export default async (req) => {
  const url = new URL(req.url);
  try { requireAdmin(url.searchParams.get('pin')); }
  catch (error) { return errorResponse(error.message, 401); }

  try {
    // Keep module-load failures inside the error handler as well.
    const {default: ExcelJS} = await import('exceljs');
    const rows = await withTimeout(readAllDelegates({concurrency: 12}), 25000);
    const images = await loadImages(rows, assetsStore());
    let skipped = [...images.values()].filter(image => !image.buffer).length;
    let buffer = await buildWorkbook(ExcelJS, rows, images).xlsx.writeBuffer();
    if (buffer.byteLength > MAX_WORKBOOK_BYTES) {
      skipped = images.size;
      buffer = await buildWorkbook(ExcelJS, rows, images, false).xlsx.writeBuffer();
    }
    if (buffer.byteLength > MAX_WORKBOOK_BYTES) {
      return errorResponse('The Excel file exceeds the download limit even without images. Please contact the portal administrator.', 413);
    }
    return new Response(buffer, {headers: {
      ...RESPONSE_HEADERS,
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="FEDUSA_Conference_Registrations.xlsx"',
      'x-export-skipped-images': String(skipped)
    }});
  } catch (error) {
    console.error('FEDUSA Excel export failed:', error);
    return errorResponse('Unable to create the Excel file. Please retry. If it fails again, check the Netlify export function log.', 500);
  }
};
