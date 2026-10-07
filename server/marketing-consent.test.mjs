import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'

const source=await readFile(new URL('../public/marketing-consent.js',import.meta.url),'utf8')
function browser({path='/courses/meta-ads/',consent='granted',privacy=false,referrer=''}={}){
 const saved=new Map(),listeners=new Map(),scripts=[],calls=[]
 if(consent)saved.set('ascore-marketing-consent-v2',JSON.stringify({version:2,value:consent,at:Date.now()}))
 const location=new URL('https://ascore.test'+path),context={URL,URLSearchParams,Date,Set,Object,Array,Number,String,JSON,location,navigator:{globalPrivacyControl:privacy},localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},document:{referrer,readyState:'loading',addEventListener(){},createElement:()=>({}),head:{append:script=>scripts.push(script)}},history:{pushState(_state,_title,url){location.href=new URL(url,location).href},replaceState(_state,_title,url){location.href=new URL(url,location).href}},addEventListener:(name,callback)=>listeners.set(name,callback)}
 context.window=context;runInNewContext(source,context)
 const sync=()=>listeners.get('pageshow')()
 const load=()=>{for(const script of scripts.splice(0)){if(script.src.includes('facebook.net')){context.fbq.callMethod=function(){calls.push([...arguments])};for(const args of context.fbq.queue)context.fbq.callMethod(...args)}script.onload()}}
 const withdraw=()=>{saved.delete('ascore-marketing-consent-v2');listeners.get('storage')({key:'ascore-marketing-consent-v2'})}
 const events=name=>calls.filter(call=>call[0]==='trackSingle'&&call[2]===name)
 sync();return {context,scripts,calls,sync,load,withdraw,events}
}
test('consented course views and actual cart additions have exact course values, without fake purchases',()=>{
 const b=browser();b.context.AscoreMarketing.addedToCart(['meta']);b.load()
 assert.equal(b.events('PageView').length,1);assert.equal(b.events('ViewContent').length,1);assert.equal(b.events('AddToCart').length,1)
 const data=b.events('AddToCart')[0][3];assert.equal(data.currency,'AED');assert.equal(data.value,2);assert.deepEqual([...data.content_ids],['meta']);assert.equal(data.email,undefined)
 b.sync();assert.equal(b.events('ViewContent').length,1)
 b.context.history.pushState({},'','/courses/practical-ai/');assert.equal(b.events('ViewContent').length,2)
 assert.equal(b.context.AscoreMarketing.addedToCart(['meta','meta']),false);assert.equal(b.context.AscoreMarketing.addedToCart(['unknown']),false)
 assert.equal(b.context.AscoreMarketing.startedCheckout(['ai']),false)
 b.context.history.pushState({},'','/courses/checkout/');assert.equal(b.context.AscoreMarketing.startedCheckout(['meta','ai']),true)
 assert.equal(b.events('InitiateCheckout')[0][3].value,4);assert.equal(b.events('Purchase').length,0)
})
test('denied consent, privacy signals, sensitive URLs and private routes send no course events',()=>{
 for(const options of [{consent:'denied'},{consent:null},{privacy:true},{path:'/courses/checkout/?payment=success&order=private'},{path:'/portal/'},{referrer:'https://ascore.test/portal/'}]){
  const b=browser(options);assert.equal(b.scripts.length,0);assert.equal(b.context.AscoreMarketing.addedToCart(['meta']),false);assert.equal(b.context.AscoreMarketing.startedCheckout(['meta']),false);assert.equal(b.calls.length,0)
 }
 const b=browser();b.context.AscoreMarketing.addedToCart(['meta']);b.withdraw();b.load();assert.equal(b.events('AddToCart').length,0);assert.equal(b.events('PageView').length,0)
 const changed=browser();changed.context.AscoreMarketing.addedToCart(['meta']);changed.context.history.pushState({},'','/portal/');changed.load();assert.equal(changed.events('AddToCart').length,0)
})
test('Purchase remains limited to exact paid receipts and stable opaque event deduplication',()=>{
 const b=browser({path:'/courses/checkout/'});b.load()
 const receipt={paymentStatus:'paid',currency:'AED',items:['meta'],totalMinor:4999,paymentEventId:'a'.repeat(64)}
 for(const change of [{paymentStatus:'pending'},{totalMinor:5000},{items:['meta','meta']},{paymentEventId:'order-secret'}])assert.equal(b.context.AscoreMarketing.verifiedPurchase({...receipt,...change}),false)
 assert.equal(b.events('Purchase').length,0);assert.equal(b.context.AscoreMarketing.verifiedPurchase(receipt),true);b.context.AscoreMarketing.verifiedPurchase(receipt);assert.equal(b.events('Purchase').length,1)
 b.withdraw();assert.equal(b.context.AscoreMarketing.verifiedPurchase({...receipt,paymentEventId:'b'.repeat(64)}),true);assert.equal(b.events('Purchase').length,1)
})

test('GA4 keeps validated campaign attribution after consent without sharing Meta click IDs, referrers or private queries',()=>{
 const b=browser({path:'/courses/meta-ads/?utm_source=facebook&utm_medium=paid_social&utm_campaign=meta-course&utm_content=creative-1&fbclid=private-meta-click',referrer:'https://facebook.com/private-route?private=query'});b.load()
 const calls=b.context.dataLayer.map(args=>[...args]),page=calls.find(call=>call[0]==='event'&&call[1]==='page_view')[2]
 assert.equal(page.page_location,'https://ascore.test/courses/meta-ads/?utm_source=facebook&utm_medium=paid_social&utm_campaign=meta-course&utm_content=creative-1')
 assert.equal(page.page_referrer,'');assert.ok(!JSON.stringify(calls).includes('private-meta-click'));assert.ok(!JSON.stringify(calls).includes('private-route'))
 for(const options of [{consent:'denied',path:'/courses/?utm_source=facebook'},{privacy:true,path:'/courses/?utm_source=facebook'},{path:'/courses/?utm_source=facebook&token=private-secret'},{path:'/courses/?utm_content=buyer%40example.test'}]){const blocked=browser(options);assert.equal(blocked.scripts.length,0);assert.equal(blocked.context.dataLayer,undefined)}
})

test('public AED2 and historical AED49.99 receipts report matching item and total prices once',()=>{
 for(const price of [200,4999])for(const items of [['meta'],['meta','ai']]){
  const b=browser({path:'/courses/checkout/'});b.load()
  const receipt={paymentStatus:'paid',currency:'AED',items,totalMinor:price*items.length,paymentEventId:'c'.repeat(64)}
  assert.equal(b.context.AscoreMarketing.verifiedPurchase(receipt),true)
  b.context.AscoreMarketing.verifiedPurchase(receipt)
  const events=b.events('Purchase');assert.equal(events.length,1);assert.equal(events[0][3].value,receipt.totalMinor/100)
  for(const item of events[0][3].contents)assert.equal(item.item_price,price/100)
  const ga=b.context.dataLayer.map(args=>[...args]).filter(call=>call[0]==='event'&&call[1]==='purchase')
  assert.equal(ga.length,1);assert.equal(ga[0][2].value,receipt.totalMinor/100)
  for(const item of ga[0][2].items)assert.equal(item.price,price/100)
 }
})
