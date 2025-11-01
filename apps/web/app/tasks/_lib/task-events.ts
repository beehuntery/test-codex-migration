'use client';

type TaskCompletedDetail = {
  taskId: string;
};

const TASK_COMPLETED_EVENT = 'tasks:completed';

function isClient() {
  return typeof window !== 'undefined';
}

export function emitTaskCompleted(taskId: string) {
  if (!isClient()) {
    return;
  }
  const event = new CustomEvent<TaskCompletedDetail>(TASK_COMPLETED_EVENT, { detail: { taskId } });
  window.dispatchEvent(event);
}

export function subscribeTaskCompleted(handler: (taskId: string) => void): () => void {
  if (!isClient()) {
    return () => {};
  }
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<TaskCompletedDetail>).detail;
    if (detail?.taskId) {
      handler(detail.taskId);
    }
  };
  window.addEventListener(TASK_COMPLETED_EVENT, listener);
  return () => {
    window.removeEventListener(TASK_COMPLETED_EVENT, listener);
  };
}
