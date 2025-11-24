import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TagListSchema } from '@shared/api';

// GET /api/tags
export async function GET() {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  const parsed = TagListSchema.safeParse(tags.map((t) => t.id));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Failed to parse tags' }, { status: 500 });
  }
  return NextResponse.json(parsed.data);
}

