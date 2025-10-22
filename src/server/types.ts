export const ALLOWED_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof ALLOWED_STATUSES)[number];
export const DEFAULT_STATUS: TaskStatus = 'todo';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string | null;
  order: number;
  tags: string[];
}
