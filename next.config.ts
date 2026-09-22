import type { NextConfig } from 'next';
import { imageHosts } from './src/lib/validation';
const config: NextConfig = { distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next', images: { remotePatterns: imageHosts.map(hostname => ({ protocol: 'https' as const, hostname })) }, async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }] }]; } };
export default config;
