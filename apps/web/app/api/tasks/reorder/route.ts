import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TaskListSchema, TaskStatusSchema } from '@shared/api';

const mapTask = (task: {
  id: string;
  title: string;
  description: string;
  status: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  order: number | null;
  tags: { name: string }[];
}) => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: TaskStatusSchema.parse(task.status ?? 'todo'),
  dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt ? task.updatedAt.toISOString() : null,
  order: task.order ?? 0,
  tags: task.tags.map((t) => t.name)
});

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

  const tasks = await prisma.task.findMany({
    orderBy: { order: 'asc' },
    include: { tags: { select: { name: true } } }
  });

  const parsed = TaskListSchema.safeParse(tasks.map(mapTask));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Failed to parse tasks' }, { status: 500 });
  }
  return NextResponse.json(parsed.data);
}
