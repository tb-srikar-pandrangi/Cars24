/**
 * Shared postgres connection pool — hard capped at 3 connections per process.
 * Throws at startup if DATABASE_URL is unset (intentional fast-fail).
 * O(1) amortised acquire from fixed-size pool.
 */
import postgres from 'postgres';
export declare const sql: postgres.Sql<{}>;
export type Sql = typeof sql;
//# sourceMappingURL=db.d.ts.map