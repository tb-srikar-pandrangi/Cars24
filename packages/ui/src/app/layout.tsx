/**
 * Root layout — sets global metadata and wraps every route in the shell.
 * O(1) — rendered once per navigation tree mount.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'CARS24 Growth Operator',
  description:
    'Real-time performance intelligence across SELL · BUY · FINANCE · SERVICES funnels',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; }
          html { font-size: 14px; }
          body { margin: 0; background: #0c0c0e; color: #f0f0f0; font-family: 'IBM Plex Sans', sans-serif; }
          .font-mono { font-family: 'IBM Plex Mono', monospace; }
          .color-accent { color: #f5a623; }
          .color-critical { color: #e63946; }
          .color-warning { color: #ff9f1c; }
          .color-ok { color: #2dc653; }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
