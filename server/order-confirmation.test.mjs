import test from 'node:test'
import assert from 'node:assert/strict'
import {confirmedOrderMarkup} from '../public/courses/order-confirmation.mjs'
const id='11111111-2222-4333-8444-555555555555',products={meta:{short:'Meta Ads',pages:54,image:'/meta.webp'},ai:{short:'Practical AI',pages:42,image:'/ai.webp'}}
const receipt={id,paymentStatus:'paid',currency:'AED',totalMinor:200,items:['meta'],email:'buyer@example.test',customerName:'Learner',delivery:'accepted',createdAt:1791384000000,expiresAt:1791470400000,downloads:[{courseId:'meta',url:`/api/courses/paid/download/${id}/meta?token=${'a'.repeat(64)}`}]}
test('verified completion renders receipt-owned downloads and total, not a second checkout or current cart',()=>{
 const html=confirmedOrderMarkup(receipt,products);assert.match(html,/Your order is complete/);assert.match(html,/Download Meta Ads PDF/);assert.match(html,/AED 2.00/);assert.match(html,/buyer@example.test/);assert.ok(!html.includes('start-paid-checkout'));assert.ok(!html.includes('Practical AI'))
 const bundle=confirmedOrderMarkup({...receipt,totalMinor:400,items:['meta','ai'],downloads:[...receipt.downloads,{courseId:'ai',url:`/api/courses/paid/download/${id}/ai?token=${'b'.repeat(64)}`}]},products)
 assert.match(bundle,/AED 4.00/);assert.match(bundle,/Download Practical AI PDF/)
 for(const paymentStatus of ['pending','review','cancelled'])assert.throws(()=>confirmedOrderMarkup({...receipt,paymentStatus},products))
})
test('confirmation escapes customer text and rejects unrelated/external download URLs',()=>{
 const html=confirmedOrderMarkup({...receipt,email:'<script>alert(1)</script>',customerName:'<img src=x>',downloads:[{courseId:'meta',url:'https://attacker.test/?token=private'}]},products)
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x>'));assert.ok(!html.includes('attacker.test'));assert.ok(!html.includes('Download Meta Ads PDF'));assert.match(html,/&lt;script&gt;/)
})
