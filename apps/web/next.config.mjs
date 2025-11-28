import { join } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['app', 'lib', 'styles']
  },
  typescript: {
    tsconfigPath: './tsconfig.json'
  },
  typedRoutes: true,
  outputFileTracingRoot: join(process.cwd(), '..', '..')
};

export default nextConfig;
