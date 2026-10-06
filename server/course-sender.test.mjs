import test from 'node:test'
import assert from 'node:assert/strict'
import {smtpConfigured,courseEmail} from './courses.mjs'
import {paidCourseEmail} from './nomod-courses.mjs'

test('course mail requires its independent orders mailbox configuration and preserves enquiry fields',()=>{
 const enquiries={SMTP_HOST:'smtp.hostinger.com',SMTP_PORT:'465',SMTP_USER:'info@ascore.ae',SMTP_PASSWORD:'fixture-only'}
 const courses={COURSE_SMTP_HOST:'smtp.hostinger.com',COURSE_SMTP_PORT:'465',COURSE_SMTP_USER:'orders@ascore.ae',COURSE_SMTP_PASSWORD:'fixture-only'}
 assert.equal(smtpConfigured(enquiries),false)
 assert.equal(smtpConfigured({...enquiries,...courses}),true)
 assert.equal(smtpConfigured({...courses,COURSE_SMTP_USER:'info@ascore.ae'}),false)
 assert.equal(smtpConfigured({...courses,COURSE_SMTP_PORT:'587'}),false)
 assert.equal(smtpConfigured({...courses,COURSE_SMTP_PASSWORD:''}),false)
 const row={id:'fixture-order',email:'learner@example.com',items:'["meta"]',secret:'fixture-secret',total_minor:5000,expires_at:1800000000000}
 for(const message of [courseEmail(row,'https://ascore.ae'),paidCourseEmail(row,'https://ascore.ae')]){
  assert.equal(message.from.address,'orders@ascore.ae')
  assert.equal(message.envelope.from,'orders@ascore.ae')
  assert.equal(message.to,'learner@example.com')
 }
 assert.equal(enquiries.SMTP_USER,'info@ascore.ae')
})
