import { join } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    dirs: ['app', 'lib', 'styles']
  },
  typescript: {
    tsconfigPath: './tsconfig.json'
  },
  experimental: {
    typedRoutes: true
  },
  outputFileTracingRoot: join(process.cwd(), '..', '..')
};

export default nextConfig;
