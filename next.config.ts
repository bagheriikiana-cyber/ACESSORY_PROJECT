import type { NextConfig } from 'next';
const config: NextConfig = { distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next', images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }] }, async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }] }]; } };
export default config;
