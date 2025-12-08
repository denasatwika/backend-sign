import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.ts';
import logger from '../utils/logger.ts'

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.error('DATABASE_URL environment variable is not set!');
  throw new Error('DATABASE_URL environment variable is not set!');
}

logger.info({ dbHost: connectionString.split('@')[1]?.split('/')[0] }, 'Connecting to database...');

const pool = new Pool({
  connectionString: connectionString,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle database client');
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

export const db = drizzle(pool, { schema });
export { schema };