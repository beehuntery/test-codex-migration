import 'server-only';

import { TaskListSchema, type Task } from '@shared/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function fetchFromApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, API_BASE_URL);
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    },
    ...init
  });

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
