import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaskNotificationProvider, useTaskNotifications } from './task-notification-provider';
import { emitTaskCompleted } from '../_lib/task-events';

function NotificationDemo() {
  const { notify, dismiss } = useTaskNotifications();

  return (
    <div className="flex w-[420px] max-w-full flex-col gap-3 rounded-2xl border border-[rgba(107,102,95,0.16)] bg-white/95 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[color:var(--color-text)]">通知プレビュー</h2>
      <p className="text-sm text-[color:var(--color-text-muted)]">
        Storybook 上で新しいトースト通知システムと完了アニメーションイベントをテストできます。
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() =>
            notify({
              type: 'success',
              title: 'タスクを追加しました',
              description: 'Storybook でのサンプルです'
            })
          }
        >
          成功通知
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() =>
            notify({
              type: 'error',
              title: 'エラーが発生しました',
              description: 'ネットワークを確認してください'
            })
          }
        >
          エラー通知
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() =>
            notify({
              type: 'info',
              title: 'インフォメーション',
              description: 'タスク一覧が最新の状態です'
            })
          }
        >
          情報通知
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => {
            notify({
              type: 'success',
              title: '完了アニメーションをトリガー',
              description: 'task-demo-id に完了イベントを送信しました',
              id: 'demo-animation'
            });
            emitTaskCompleted('task-demo-id');
          }}
        >
          完了アニメーション
        </button>
        <button
          type="button"
          className="btn-secondary text-sm md:col-span-2"
          onClick={() => dismiss('demo-animation')}
        >
          デモ通知を閉じる
        </button>
      </div>
      <p className="text-xs text-[color:var(--color-text-muted)]">
        成功通知で `emitTaskCompleted` が発火すると、Next.js 側では該当タスクカードにハイライトが適用されます。
      </p>
    </div>
  );
}

const meta = {
  title: 'Tasks/Notifications',
  component: NotificationDemo,
  parameters: {
    layout: 'centered'
  },
  render: () => (
    <TaskNotificationProvider>
      <NotificationDemo />
    </TaskNotificationProvider>
  )
} satisfies Meta<typeof NotificationDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
