import {
  ErrorResponseSchema,
  TagListSchema,
  TagMutationResponseSchema,
  TaskCreateInputSchema,
  TaskListSchema,
  TaskSchema,
  TaskStatusSchema,
  TaskUpdateInputSchema,
  type Task,
  type TaskCreateInput,
  type TaskStatus,
  type TaskUpdateInput
} from '../shared/api';

export {
  ErrorResponseSchema,
  TagListSchema,
  TagMutationResponseSchema,
  TaskCreateInputSchema,
  TaskListSchema,
  TaskSchema,
  TaskStatusSchema,
  TaskUpdateInputSchema
};

export type { Task, TaskCreateInput, TaskStatus, TaskUpdateInput };

export const ALLOWED_STATUSES = Object.freeze([...TaskStatusSchema.options]);
export const DEFAULT_STATUS: TaskStatus = 'todo';
