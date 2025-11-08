import React, { useCallback, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { Task } from '@shared/api';
import { TaskReorderList } from './task-reorder-list';
import { TaskNotificationProvider } from './task-notification-provider';
import { emitTaskCompleted } from '../_lib/task-events';

const fixtureTasks: Task[] = [
  {
    id: 'storybook-1',
    title: '通知とハイライトの確認',
    description: '完了イベントを送って、ハイライト表示を確認できます。',
    status: 'in_progress',
    dueDate: '2025-11-30',
    createdAt: '2025-10-20T09:00:00.000Z',
    updatedAt: '2025-10-25T10:00:00.000Z',
    order: 0,
    tags: ['storybook', 'highlight']
  },
  {
    id: 'storybook-2',
    title: 'ドラッグ＆ドロップのデモ',
    description: 'タスクをドラッグすると並び替えが即座に反映されます。',
    status: 'todo',
    dueDate: '2025-12-05',
    createdAt: '2025-10-22T11:00:00.000Z',
    updatedAt: null,
    order: 1,
    tags: ['drag', 'demo']
  },
  {
    id: 'storybook-3',
    title: 'キーボード操作のテスト',
    description: 'Alt + ↑/↓ キーで移動し、並び替えを体験できます。',
    status: 'todo',
    dueDate: null,
    createdAt: '2025-10-25T14:00:00.000Z',
    updatedAt: '2025-10-28T18:30:00.000Z',
    order: 2,
    tags: ['keyboard', 'accessibility']
  }
];

function cloneFixture() {
  return fixtureTasks.map((task) => ({ ...task }));
}

function ReorderListPlayground() {
  const [tasks, setTasks] = useState<Task[]>(() => cloneFixture());

  const persistOrder = useCallback(
    async (orderedIds: string[]) => {
      setTasks((current) => {
        const taskMap = new Map(current.map((task) => [task.id, task]));
        return orderedIds
          .map((id, index) => {
            const task = taskMap.get(id);
            return task ? { ...task, order: index } : undefined;
          })
          .filter((task): task is Task => Boolean(task));
      });
      return { success: true as const };
    },
    []
  );

  const triggerHighlight = useCallback(
    (taskId: string) => {
      emitTaskCompleted(taskId);
    },
    []
  );

  const handleReset = useCallback(() => {
    setTasks(cloneFixture());
  }, []);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tasks]
  );

  return (
    <TaskNotificationProvider>
      <div className="flex flex-col gap-6">
        <TaskReorderList tasks={sortedTasks} persistOrder={persistOrder} />
        <div className="rounded-2xl border border-[rgba(107,102,95,0.16)] bg-white/95 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[color:var(--color-text)]">Story 操作ガイド</h3>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-6 text-sm text-[color:var(--color-text-muted)]">
            <li>タスクをドラッグ＆ドロップして順序を入れ替えると、上のリストに即時反映されます。</li>
            <li>
              フォーカスを当てた状態で <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">Alt</kbd> +
              <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">↑/↓</kbd> でキーボード並び替えができます。
            </li>
            <li>タスクの「次の状態へ」ボタンやフォームから完了状態にするとハイライトが点灯します。</li>
            <li>下のショートカットボタンでも完了イベントを手動で送信できます。</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            {sortedTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="btn-secondary text-xs"
                onClick={() => triggerHighlight(task.id)}
              >
                {task.title} を完了扱いにする
              </button>
            ))}
            <button type="button" className="btn-secondary text-xs" onClick={handleReset}>
              並び順をリセット
            </button>
          </div>
        </div>
      </div>
    </TaskNotificationProvider>
  );
}

const meta = {
  title: 'Tasks/ReorderList',
  component: TaskReorderList,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'タスク並び替えリストの Storybook プレイグラウンド。ドラッグ・キーボード操作・完了ハイライトの挙動を確認できます。'
      }
    }
  }
} satisfies Meta<typeof TaskReorderList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    tasks: fixtureTasks,
    persistOrder: async () => ({ success: true as const })
  },
  render: () => <ReorderListPlayground />
};