/**
 * Shared postgres connection pool — hard capped at 3 connections per process.
 * Throws at startup if DATABASE_URL is unset (intentional fast-fail).
 * O(1) amortised acquire from fixed-size pool.
 */
import postgres from 'postgres';
const url = process.env['DATABASE_URL'];
if (!url)
    throw new Error('DATABASE_URL is required — copy .env.example to .env and fill it in');
export const sql = postgres(url, {
    max: 3,
    idle_timeout: 30,
    connect_timeout: 10,
    transform: postgres.camel,
});
//# sourceMappingURL=db.js.map