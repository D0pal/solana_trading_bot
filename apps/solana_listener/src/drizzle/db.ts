import { drizzle } from 'drizzle-orm/postgres-js'
import * as postgres from 'postgres'
import * as schema from './schema'
import 'dotenv/config'

const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client, { schema })
export default db
