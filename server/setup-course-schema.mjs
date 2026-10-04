import {createPersistence} from './persistence.mjs'
import {initializeCourseSchema} from './course-schema.mjs'
if(process.env.NODE_ENV!=='production'||process.env.ASCORE_ALLOW_COURSE_SCHEMA_SETUP!=='1')throw Error('Run only against the approved production database with explicit course schema setup enabled.')
const db=await createPersistence()
try{await initializeCourseSchema(db,process.env);console.log('Course schema verified. No accounts, payments or emails created.')}finally{await db.close()}
