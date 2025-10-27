import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(process.cwd(), '../../.env'), override: true });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

/** @type {import('next').NextConfig} */
const workspaceRoot = path.resolve(process.cwd(), '../../');

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      '@shared': path.resolve(process.cwd(), '../../src/shared')
    }
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: API_BASE_URL
  },
  eslint: {
    dirs: ['app', 'lib']
  },
  output: 'standalone',
  poweredByHeader: false,
  outputFileTracingRoot: workspaceRoot,
  async rewrites() {
    const target = process.env.EXPRESS_BASE_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
