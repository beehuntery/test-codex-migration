'use server';

import { revalidatePath } from 'next/cache';
import { deleteTaskRequest } from '../../lib/api';

export async function deleteTasksAction(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: '削除対象がありません。' };
  }

  try {
    await Promise.all(ids.map((id) => deleteTaskRequest(id)));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'タスクの一括削除に失敗しました。'
    };
  }

  revalidatePath('/tasks');
  return { success: true };
}
