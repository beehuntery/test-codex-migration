import { z } from 'zod';

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'waiting', 'pending', 'done']);

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: TaskStatusSchema,
  dueDate: z.string().regex(isoDateRegex).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }).nullable(),
  order: z.number(),
  tags: z.array(z.string())
});

export const TaskListSchema = z.array(TaskSchema);

export const TaskCreateInputSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  status: TaskStatusSchema,
  dueDate: z.string().regex(isoDateRegex).nullable(),
  tags: z.array(z.string())
});

export const TaskUpdateInputSchema = TaskCreateInputSchema.partial().extend({
  order: z.number().int().optional()
});

export const TagListSchema = z.array(z.string());

export const TagMutationResponseSchema = z.object({
  name: z.string(),
  tags: TagListSchema
});

export const ErrorResponseSchema = z.object({
  error: z.string()
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>;
export type TaskUpdateInput = z.infer<typeof TaskUpdateInputSchema>;
