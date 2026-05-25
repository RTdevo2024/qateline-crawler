/**
 * connection.ts — اتصال singleton به Redis با ioredis
 *
 * BullMQ نیاز دارد هر Queue و Worker اتصال مجزا داشته باشد.
 * برای همین از factory function استفاده می‌کنیم، نه یک singleton مشترک.
 */

import { Redis } from 'ioredis';

/**
 * createRedisConnection — یک اتصال جدید ioredis می‌سازد.
 *
 * گزینه‌های ضروری برای BullMQ:
 *   - maxRetriesPerRequest: null  → BullMQ به retry نامحدود نیاز دارد
 *   - enableReadyCheck: false     → از block شدن اتصال جلوگیری می‌کند
 */
export function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      'REDIS_URL environment variable is not set — add it to .env.local',
    );
  }

  const conn = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });

  conn.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message);
  });

  conn.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  return conn;
}
