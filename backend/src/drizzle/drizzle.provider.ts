import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';
import * as schema from './schema';

export const DrizzleAsyncProvider = 'drizzleProvider';

export const drizzleProvider = [
  {
    provide: DrizzleAsyncProvider,
    useFactory: async () => {
      const client = postgres(process.env.DATABASE_URL);
      const db = drizzle(client, { schema });
      return db;
    },
    exports: [DrizzleAsyncProvider],
  },
];
