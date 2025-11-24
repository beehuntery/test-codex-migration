import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TaskListSchema } from '@shared/api';

// PATCH /api/tasks/reorder
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const order = Array.isArray(body?.order) ? (body.order as string[]) : [];

  if (!order.length) {
    return NextResponse.json({ error: 'order is required' }, { status: 400 });
  }

  await prisma.$transaction(
    order.map((id, idx) =>
      prisma.task.update({
        where: { id },
        data: { order: idx }
      })
    )
  );

  const tasks = await prisma.task.findMany({ orderBy: { order: 'asc' }, include: { tags: true } });
  const parsed = TaskListSchema.safeParse(tasks);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Failed to parse tasks' }, { status: 500 });
  }
  return NextResponse.json(parsed.data);
}

