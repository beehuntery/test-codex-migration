import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  TaskListSchema,
  TaskCreateInputSchema,
  TaskSchema,
  type TaskCreateInput
} from '@shared/api';

// GET /api/tasks
export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { order: 'asc' },
    include: { tags: true }
  });
  // Reuse existing zod schema for safety
  const parsed = TaskListSchema.safeParse(tasks);
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

  const created = await prisma.task.create({
    data: {
      title: input.title.trim(),
      description: (input.description ?? '').trim(),
      status: input.status ?? 'todo',
      dueDate: input.dueDate ?? null,
      tags: {
        connect: (input.tags ?? []).map((tagId) => ({ id: tagId }))
      }
    },
    include: { tags: true }
  });

  const parsedTask = TaskSchema.safeParse(created);
  if (!parsedTask.success) {
    return NextResponse.json({ error: 'Failed to parse created task' }, { status: 500 });
  }

  return NextResponse.json(parsedTask.data, { status: 201 });
}

