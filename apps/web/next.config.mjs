import { join } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['app', 'lib', 'styles']
  },
  typescript: {
    tsconfigPath: './tsconfig.json'
  },
  experimental: {
    // Next 15+ では experimental から昇格済み
    typedRoutes: true
  },
  outputFileTracingRoot: join(process.cwd(), '..', '..')
};

export default nextConfig;
