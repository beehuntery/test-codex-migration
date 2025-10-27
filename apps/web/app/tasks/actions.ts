'use server';

import { revalidatePath } from 'next/cache';
import { TaskStatusSchema } from '@shared/api';
import { updateTaskStatusRequest } from '../../lib/api';

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
