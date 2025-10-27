'use server';

import { revalidatePath } from 'next/cache';
import { TaskStatusSchema } from '@shared/api';
import { updateTaskStatusRequest, updateTaskTagsRequest } from '../../lib/api';

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
