'use server';

import { revalidatePath } from 'next/cache';
import { TaskStatusSchema, type TaskStatus } from '@shared/api';
import {
  createTaskRequest,
  updateTaskStatusRequest,
  updateTaskTagsRequest,
  updateTaskTitleRequest,
  updateTaskDescriptionRequest,
  updateTaskDueDateRequest,
  reorderTasksRequest,
  deleteTaskRequest
} from '../../lib/api';

export async function updateTaskStatusAction(formData: FormData) {
  const idValue = formData.get('taskId');
  const statusValue = formData.get('status');

  if (typeof idValue !== 'string' || !idValue.trim()) {
    return { error: 'タスク ID が無効です。' };
  }

  const parsedStatus = TaskStatusSchema.safeParse(statusValue);
  if (!parsedStatus.success) {
    return { error: 'ステータスの値が正しくありません。' };
  }

  try {
    await updateTaskStatusRequest(idValue, parsedStatus.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'タスクの更新に失敗しました。'
    };
  }

  revalidatePath('/tasks');
  return { success: true };
}

export async function updateTaskTagsAction(taskId: string, tags: string[]) {
  'use server';

  const parsedTags = tags
    .map((tag) => tag.trim())
    .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index);

  try {
    await updateTaskTagsRequest(taskId, parsedTags);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'タグの更新に失敗しました。');
  }

  revalidatePath('/tasks');
}

export async function updateTaskTitleAction(taskId: string, title: string) {
  'use server';

  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('タイトルは空にできません。');
  }

  try {
    await updateTaskTitleRequest(taskId, trimmed);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'タイトルの更新に失敗しました。');
  }

  revalidatePath('/tasks');
}

export async function updateTaskDescriptionAction(taskId: string, description: string) {
  'use server';

  const normalized = description.trim();

  try {
    await updateTaskDescriptionRequest(taskId, normalized);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '説明の更新に失敗しました。');
  }

  revalidatePath('/tasks');
}

export async function setTaskStatusAction(taskId: string, status: TaskStatus) {
  'use server';

  const parsedStatus = TaskStatusSchema.parse(status);
  try {
    await updateTaskStatusRequest(taskId, parsedStatus);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'ステータスの更新に失敗しました。');
  }
  revalidatePath('/tasks');
}

export async function updateTaskDueDateAction(taskId: string, dueDate: string | null) {
  'use server';

  const normalized = dueDate ? dueDate.trim() : null;
  const parsed = normalized && normalized.length > 0 ? normalized : null;

  try {
    await updateTaskDueDateRequest(taskId, parsed);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '期限の更新に失敗しました。');
  }

  revalidatePath('/tasks');
}

export async function createTaskAction(formData: FormData) {
  const title = (formData.get('title') ?? '').toString().trim();
  const description = (formData.get('description') ?? '').toString().trim();
  const dueDateRaw = (formData.get('dueDate') ?? '').toString().trim();
  const tagsRaw = (formData.get('tags') ?? '').toString().trim();

  if (!title) {
    return { error: 'タイトルは必須です。' };
  }

  const tags = tagsRaw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index);

  try {
    await createTaskRequest({
      title,
      description,
      status: 'todo',
      dueDate: dueDateRaw ? dueDateRaw : null,
      tags
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'タスクの作成に失敗しました。'
    };
  }

  revalidatePath('/tasks');
  return { success: true };
}

export async function reorderTasksAction(order: string[]) {
  'use server';

  if (!Array.isArray(order) || order.length === 0) {
    return { error: 'タスクの順序が空です。' };
  }

  try {
    await reorderTasksRequest(order);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'タスクの並び替えに失敗しました。'
    };
  }

  revalidatePath('/tasks');
  return { success: true };
}

export async function deleteTaskAction(taskId: string) {
  'use server';

  if (typeof taskId !== 'string' || !taskId.trim()) {
    return { error: 'タスク ID が無効です。' };
  }

  try {
    await deleteTaskRequest(taskId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'タスクの削除に失敗しました。'
    };
  }

  revalidatePath('/tasks');
  return { success: true };
}
