import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TaskCreateInputSchema, TaskSchema, TaskStatusSchema, type TaskCreateInput } from '@shared/api';

const toIsoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

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
  dueDate: toIsoDate(task.dueDate),
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt ? task.updatedAt.toISOString() : null,
  order: task.order ?? 0,
  tags: task.tags.map((t) => t.name)
});

// GET /api/tasks
export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { order: 'asc' },
    include: { tags: { select: { name: true } } }
  });
  const mapped = tasks.map(mapTask);
  const parsed = TaskSchema.array().safeParse(mapped);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Failed to parse tasks' }, { status: 500 });
  }
  return NextResponse.json(parsed.data);
}

// POST /api/tasks
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = TaskCreateInputSchema.safeParse(body as TaskCreateInput);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const input = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const aggregate = await tx.task.aggregate({ _max: { order: true } });
      const order = (aggregate._max.order ?? -1) + 1;

      return tx.task.create({
        data: {
          title: input.title.trim(),
          description: (input.description ?? '').trim(),
          status: input.status ?? 'todo',
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          order,
          tags: {
            connectOrCreate: (input.tags ?? []).map((name) => ({
              where: { name },
              create: { name }
            }))
          }
        },
        include: { tags: { select: { name: true } } }
      });
    });

    const mapped = mapTask(created);
    const parsedTask = TaskSchema.safeParse(mapped);
    if (!parsedTask.success) {
      return NextResponse.json({ error: 'Failed to parse created task' }, { status: 500 });
    }

    return NextResponse.json(parsedTask.data, { status: 201 });
  } catch (error) {
    // ログに詳細を出力して 5xx を返す
    console.error('[api/tasks POST] failed', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 503 });
  }
}
