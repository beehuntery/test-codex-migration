import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV ?? 'production',
    serviceId: process.env.RENDER_SERVICE_ID ?? 'unknown',
    serviceName: process.env.RENDER_SERVICE_NAME ?? process.env.RENDER_EXTERNAL_HOSTNAME ?? 'unknown'
  });
}

