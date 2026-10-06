import {createPersistence} from './persistence.mjs'
import {initializePaymentSchema} from './payment-schema.mjs'
if(process.env.NODE_ENV!=='production'||process.env.ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP!=='1')throw Error('Run only against the approved production database with explicit payment schema setup enabled.')
const db=await createPersistence()
try{await initializePaymentSchema(db,process.env);console.log('Payment schema verified. No keys, charges, orders or emails created.')}finally{await db.close()}
