/**
 * Next.js 14 build configuration.
 * Transpiles workspace packages so their TS source is handled by the Next.js compiler.
 * O(1) — evaluated once at build/dev start.
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@cars24/shared', '@cars24/orchestrator'],
};

export default nextConfig;
