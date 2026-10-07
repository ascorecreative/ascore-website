import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createNomodLinks,nomodMinor} from './nomod-links.mjs'
import {courseCatalog} from './courses.mjs'

function fixture(){
 const id=randomUUID(),linkId=randomUUID(),chargeId=randomUUID(),origin='https://ascore.test'
 const row={id,provider_id:linkId,provider_url:`https://pay.nomod.example/${linkId}`,items:'["meta"]',total_minor:200,delivery:JSON.stringify({status:'pending',providerMode:'api-links',providerReference:'26280-TEST'})}
 const note=`Ascore order ${id}`,link={id:linkId,url:row.provider_url,reference_id:'26280-TEST',currency:'AED',amount:'2.00',status:'enabled',note,payment_block_reason:null,allow_tip:false,allow_service_fee:false,shipping_address_required:false,payment_expiry_limit:1,discount:'0.00',tax:'0.00',tip:'0.00',service_fee:'0.00',items:[{name:courseCatalog.meta.name,quantity:1,amount:'2.00'}]}
 const charge={id:chargeId,currency:'AED',status:'paid',total:'2.000',refund_total:'0.000',note,success_url:`${origin}/courses/checkout/?payment=success&order=${id}`,discount:'0.000',tax:'0.000',tip:'0.000',service_fee:'0.000'}
 let list={count:0,next:null,results:[]};const calls=[]
 const fetcher=async(url,options)=>{calls.push({url,options});const path=new URL(url).pathname;const body=path.endsWith('/charges/'+chargeId)?charge:path.endsWith('/charges')?list:link;return new Response(JSON.stringify(body),{status:options.method==='POST'?201:200})}
 const client=createNomodLinks({env:{NOMOD_API_KEY:'mock-general-key',NOMOD_CHECKOUT_HOSTS:'pay.nomod.example'},origin,fetcher})
 return {client,row,link,charge,calls,paid(){list={count:1,next:null,results:[{id:chargeId,status:'paid'}]}},refunded(){charge.status='refunded';charge.refund_total='2.00';list={count:1,next:null,results:[{id:chargeId,status:'refunded'}]}},badPage(){list={count:1,next:null,results:[]}}}
}
test('Nomod decimals preserve cents and reject fractional cents or unsafe values',()=>{
 assert.equal(nomodMinor('2.000'),200);assert.equal(nomodMinor('49.990'),4999)
 for(const value of ['2.001','-2','2e1','1.0000',NaN,Infinity,'900719925474099100'])assert.equal(nomodMinor(value),null)
})
test('API Links creation uses server prices, one-payment expiry, zero extras and private key headers',async()=>{
 const f=fixture(),result=await f.client.create(f.row),call=f.calls[0],body=JSON.parse(call.options.body)
 assert.equal(call.url,'https://api.nomod.com/v1/links');assert.equal(call.options.headers['X-API-KEY'],'mock-general-key')
 assert.equal(body.items[0].amount,'2.00');assert.equal(body.payment_expiry_limit,1);assert.equal(body.allow_tip,false);assert.equal(body.allow_service_fee,false)
 assert.equal(body.note,`Ascore order ${f.row.id}`);assert.equal(body.success_url,f.charge.success_url)
 assert.equal(result.reference_id,f.row.id);assert.equal(result.providerReference,f.link.reference_id);assert.equal(result.status,'enabled')
 assert.equal(body.email,undefined);assert.equal(body.expiry_date,undefined);assert.equal(body.amount,undefined)
})
test('an enabled link without captures remains unpaid; capture is independently retrieved and checked',async()=>{
 const f=fixture();assert.equal((await f.client.read(f.row)).status,'enabled')
 f.paid();const result=await f.client.read(f.row)
 assert.equal(result.status,'paid');assert.equal(result.charges.length,1)
 assert.ok(f.calls.some(c=>c.url.includes('/charges?link_id='+f.row.provider_id+'&type=link')))
 assert.ok(f.calls.some(c=>c.url.endsWith('/charges/'+f.charge.id)))
})
test('wrong link mapping, amount, currency, extras, payer redirect or captured state cannot fulfill',async()=>{
 const mutations=[f=>f.link.note='different order',f=>f.link.reference_id='different reference',f=>f.link.amount='1.99',f=>f.link.currency='USD',f=>f.link.allow_service_fee=true,f=>f.link.tax='0.10',f=>f.link.url='https://evil.example/pay',f=>f.charge.note='different order',f=>f.charge.success_url='https://evil.example/paid',f=>f.charge.success_url+='&order='+randomUUID(),f=>f.charge.total='1.99',f=>f.charge.status='authorised',f=>f.charge.refund_total='2.01']
 for(const mutate of mutations){const f=fixture();f.paid();mutate(f);await assert.rejects(f.client.read(f.row),{status:502})}
})
test('refunds require review and incomplete charge pagination never produces confirmation',async()=>{
 const f=fixture();f.refunded();assert.equal((await f.client.read(f.row)).status,'review')
 assert.equal((await f.client.read(f.row)).charges[0].id,f.charge.id)
 const partial=fixture();partial.paid();partial.charge.refund_total='1.00';assert.equal((await partial.client.read(partial.row)).status,'review')
 f.badPage();await assert.rejects(f.client.read(f.row),{status:502})
})
