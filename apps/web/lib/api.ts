import 'server-only';

import {
  TaskListSchema,
  TaskSchema,
  TaskStatusSchema,
  TaskCreateInputSchema,
  TaskUpdateInputSchema,
  type Task,
  type TaskStatus,
  type TaskCreateInput,
  TagListSchema
} from '@shared/api';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const LOG_API_REQUESTS = process.env.LOG_API_REQUESTS === '1';

export async function fetchFromApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  const method = init?.method ?? 'GET';
  const startedAt = LOG_API_REQUESTS ? Date.now() : 0;

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    },
    ...init
  });

  if (LOG_API_REQUESTS) {
    const elapsed = Date.now() - startedAt;
    console.log(`[Next API] ${method} ${url.toString()} -> ${res.status} (${elapsed}ms)`);
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : `API request failed (${res.status})`;
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function getTasks(): Promise<Task[]> {
  const data = await fetchFromApi<unknown>('/api/tasks');
  const parsed = TaskListSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Failed to parse tasks response');
  }
  return parsed.data;
}

export async function getTags(): Promise<string[]> {
  const data = await fetchFromApi<unknown>('/api/tags');
  const parsed = TagListSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Failed to parse tags response');
  }
  return parsed.data;
}

export async function createTaskRequest(input: TaskCreateInput): Promise<Task> {
  const payload = TaskCreateInputSchema.parse(input);
  const data = await fetchFromApi<unknown>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const parsedTask = TaskSchema.safeParse(data);
  if (!parsedTask.success) {
    throw new Error('Failed to parse create task response');
  }
  return parsedTask.data;
}

export async function updateTaskStatusRequest(taskId: string, status: TaskStatus): Promise<Task> {
  const parsedStatus = TaskStatusSchema.parse(status);
  const data = await fetchFromApi<unknown>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: parsedStatus })
  });
  const parsedTask = TaskSchema.safeParse(data);
  if (!parsedTask.success) {
    throw new Error('Failed to parse updated task response');
  }
  return parsedTask.data;
}

export async function updateTaskTagsRequest(taskId: string, tags: string[]): Promise<Task> {
  const payload = TaskUpdateInputSchema.pick({ tags: true }).parse({ tags });
  const data = await fetchFromApi<unknown>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const parsedTask = TaskSchema.safeParse(data);
  if (!parsedTask.success) {
    throw new Error('Failed to parse tag update response');
  }
  return parsedTask.data;
}

export async function updateTaskTitleRequest(taskId: string, title: string): Promise<Task> {
  const payload = TaskUpdateInputSchema.pick({ title: true }).parse({ title });
  const data = await fetchFromApi<unknown>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const parsedTask = TaskSchema.safeParse(data);
  if (!parsedTask.success) {
    throw new Error('Failed to parse title update response');
  }
  return parsedTask.data;
}

export async function updateTaskDescriptionRequest(taskId: string, description: string): Promise<Task> {
  const payload = TaskUpdateInputSchema.pick({ description: true }).parse({ description });
  const data = await fetchFromApi<unknown>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const parsedTask = TaskSchema.safeParse(data);
  if (!parsedTask.success) {
    throw new Error('Failed to parse description update response');
  }
  return parsedTask.data;
}

export async function updateTaskDueDateRequest(taskId: string, dueDate: string | null): Promise<Task> {
  const payload = TaskUpdateInputSchema.pick({ dueDate: true }).parse({ dueDate });
  const data = await fetchFromApi<unknown>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const parsedTask = TaskSchema.safeParse(data);
  if (!parsedTask.success) {
    throw new Error('Failed to parse due date update response');
  }
  return parsedTask.data;
}

export async function reorderTasksRequest(order: string[]): Promise<Task[]> {
  if (!Array.isArray(order) || order.length === 0) {
    return getTasks();
  }

  const data = await fetchFromApi<unknown>('/api/tasks/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ order })
  });

  const parsed = TaskListSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Failed to parse task reorder response');
  }

  return parsed.data;
}

export async function deleteTaskRequest(taskId: string): Promise<Task> {
  const data = await fetchFromApi<unknown>(`/api/tasks/${taskId}`, {
    method: 'DELETE'
  });

  const parsedTask = TaskSchema.safeParse(data);
  if (!parsedTask.success) {
    throw new Error('Failed to parse delete task response');
  }

  return parsedTask.data;
}
