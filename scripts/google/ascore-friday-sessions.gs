// Owned by ascorecreative@gmail.com. MailApp grants sending only, without inbox access.
// Store ASCORE_SESSION_KEY as a private Script Property, never in this source.
const ASCORE_SENDER = 'ascorecreative@gmail.com';
const ASCORE_ENDPOINT = 'https://ascore.ae/api/courses/sessions/cloud';
function ascoreRequest(action, claim, state) {
  const key = PropertiesService.getScriptProperties().getProperty('ASCORE_SESSION_KEY');
  if (!/^[a-f0-9]{64}$/.test(key || '')) throw new Error('Configure the private automation key.');
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== ASCORE_SENDER) throw new Error('Run from the Ascore Creative account.');
  const payload = {action: action, sender: ASCORE_SENDER};
  if (claim) { payload.week = claim.week; payload.recipient = claim.recipient; payload.token = claim.token; }
  if (state) payload.state = state;
  const response = UrlFetchApp.fetch(ASCORE_ENDPOINT, {method: 'post', contentType: 'application/json', headers: {Authorization: 'Bearer ' + key}, payload: JSON.stringify(payload), muteHttpExceptions: true, followRedirects: false});
  if (response.getResponseCode() !== 200) throw new Error('Ascore session service returned HTTP ' + response.getResponseCode() + '. No automatic resend.');
  return JSON.parse(response.getContentText());
}
function verifyAscoreSetup() {
  const status = ascoreRequest('status');
  console.log(JSON.stringify({ready: status.ready, emailTime: status.emailTime, meetingTime: status.meetingTime, dailyQuota: MailApp.getRemainingDailyQuota(), sender: ASCORE_SENDER}));
  if (!status.ready) throw new Error('Ascore payment verification is not ready.');
  // This function sends no email and claims no recipient.
}
function installAscoreSchedule() {
  verifyAscoreSetup();
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'sendFridaySessions')) ScriptApp.newTrigger('sendFridaySessions').timeBased().everyMinutes(1).create();
  console.log('Cloud schedule installed: Friday at 09:00 Asia/Dubai, meeting 14:00.');
}
function sendFridaySessions() {
  const local = Utilities.formatDate(new Date(), 'Asia/Dubai', 'EEE HH');
  if (!/^Fri (09|10|11|12|13)$/.test(local)) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  const started = Date.now();
  try {
    while (Date.now() - started < 180000 && MailApp.getRemainingDailyQuota() > 0) {
      const claim = ascoreRequest('claim').claim;
      if (!claim) return;
      let state = 'uncertain';
      try {
        if (!ascoreRequest('validate', claim).valid) state = 'skipped';
        else {
          if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(claim.to) || typeof claim.text !== 'string' || !claim.text.includes('https://meet.google.com/')) throw new Error('Invalid session email.');
          MailApp.sendEmail({to: claim.to, subject: claim.subject, body: claim.text, name: 'Ascore Creative', replyTo: ASCORE_SENDER});
          state = 'accepted';
        }
      } catch (error) { state = 'uncertain'; }
      // If completion fails after a send, the durable claim remains held. Never retry that email.
      ascoreRequest('complete', claim, state);
    }
  } finally { lock.releaseLock(); }
}
