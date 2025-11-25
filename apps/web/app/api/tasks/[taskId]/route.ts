import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { TaskSchema, TaskUpdateInputSchema, TaskStatusSchema } from '@shared/api';

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

const fromDateString = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value ? new Date(value) : null;
};

type RouteContext = { params: { taskId: string } };

// GET /api/tasks/[taskId]
export async function GET(_: NextRequest, { params }: RouteContext) {
  const taskId = params.taskId;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { tags: { select: { name: true } } }
  });

  if (!task) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const mapped = mapTask(task);
  const parsed = TaskSchema.safeParse(mapped);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Failed to parse task' }, { status: 500 });
  }

  return NextResponse.json(parsed.data);
}

// PATCH /api/tasks/[taskId]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const taskId = params.taskId;
  const body = await req.json().catch(() => null);
  const parsed = TaskUpdateInputSchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};

      if (data.title !== undefined) updateData.title = data.title.trim();
      if (data.description !== undefined) updateData.description = data.description.trim();
      if (data.status !== undefined) updateData.status = data.status;
      if (data.dueDate !== undefined) updateData.dueDate = fromDateString(data.dueDate);
      if (data.order !== undefined) updateData.order = data.order;

      if (data.tags !== undefined) {
        const tagRecords = await Promise.all(
          data.tags.map((name) =>
            tx.tag.upsert({
              where: { name },
              update: {},
              create: { name }
            })
          )
        );

        updateData.tags = {
          set: tagRecords.map((tag) => ({ id: tag.id }))
        };
      }

      const result = await tx.task.update({
        where: { id: taskId },
        data: updateData,
        include: { tags: { select: { name: true } } }
      });

      return result;
    });

    const mapped = mapTask(updated);
    const parsedTask = TaskSchema.safeParse(mapped);
    if (!parsedTask.success) {
      return NextResponse.json({ error: 'Failed to parse updated task' }, { status: 500 });
    }

    return NextResponse.json(parsedTask.data);
  } catch (error) {
    return NextResponse.json({ error: 'Task update failed' }, { status: 500 });
  }
}

// DELETE /api/tasks/[taskId]
export async function DELETE(_: NextRequest, { params }: RouteContext) {
  const taskId = params.taskId;
  try {
    const deleted = await prisma.task.delete({
      where: { id: taskId },
      include: { tags: { select: { name: true } } }
    });

    const mapped = mapTask(deleted);
    const parsed = TaskSchema.safeParse(mapped);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Failed to parse deleted task' }, { status: 500 });
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return NextResponse.json({ error: 'Task delete failed' }, { status: 500 });
  }
}
