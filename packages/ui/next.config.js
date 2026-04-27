/**
 * Next.js 14 build configuration.
 * Transpiles workspace packages so their TS source is handled by the Next.js compiler.
 * O(1) — evaluated once at build/dev start.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cars24/shared', '@cars24/agents', '@cars24/orchestrator'],
};

module.exports = nextConfig;
