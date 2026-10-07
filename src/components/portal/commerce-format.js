export const courseNames={meta:'Meta Ads',ai:'Practical AI'}
export const commerceMoney=n=>new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED'}).format(n/100)
export const commerceDate=n=>n?new Date(n).toLocaleString('en-AE',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Dubai'}):'Not recorded'
export const orderNumber=o=>'AS-'+o.id.slice(0,8).toUpperCase()
export const customerName=o=>o.customerName||o.name||(o.kind==='private_test'?'Private test':'Name not provided')
export const paymentLabel=o=>o.kind==='zero_payment_test'?'No payment · test':({paid:'Paid',review:'Needs review',uncertain:'Uncertain',pending:'Unpaid',creating:'Creating checkout',cancelled:'Cancelled',expired:'Expired'}[o.paymentStatus]||o.paymentStatus)
export const deliveryLabel=o=>({delivered:'Email delivered',accepted:'Email sent',pending:'Email pending',sending:'Email sending',uncertain:'Email needs review',failed:'Email rejected'}[o.delivery]||'No customer email')
export const parseTags=value=>value.split(',').map(t=>t.trim()).filter(Boolean)
