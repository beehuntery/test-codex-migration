import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Task } from '@shared/api';
import { TaskDetailPane } from './task-detail-pane';
import { TaskNotificationProvider } from './task-notification-provider';

const AVAILABLE_TAGS = ['frontend', 'backend', 'design', 'ops', 'story', 'waiting', 'pending'];

const baseTask: Task = {
  id: 'detail-1',
  title: '詳細ペインの確認',
  description: '右側インスペクタでタスク詳細を編集する画面です。',
  status: 'waiting',
  dueDate: '2025-12-20',
  createdAt: '2025-12-01T10:00:00.000Z',
  updatedAt: '2025-12-05T12:30:00.000Z',
  order: 0,
  tags: ['design', 'ops']
};

function DetailPaneWrapper({ task }: { task: Task }) {
  const [open, setOpen] = useState(true);

  return (
    <TaskNotificationProvider>
      <div className="w-[420px] max-w-full">
        {open ? (
          <TaskDetailPane
            task={task}
            availableTags={AVAILABLE_TAGS}
            onClose={() => setOpen(false)}
            onDeleted={() => setOpen(false)}
          />
        ) : (
          <div className="rounded-xl border border-[color:var(--color-divider)] bg-white px-4 py-3 text-sm text-[color:var(--color-text-muted)]">
            詳細ペインは閉じています（Storybook 内の簡易プレビュー）。
          </div>
        )}
      </div>
    </TaskNotificationProvider>
  );
}

const meta = {
  title: 'Tasks/DetailPane',
  component: TaskDetailPane,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof TaskDetailPane>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DetailPaneWrapper task={baseTask} />
};

export const EmptyDescription: Story = {
  render: () => (
    <DetailPaneWrapper
      task={{
        ...baseTask,
        id: 'detail-2',
        title: '説明なしのタスク',
        description: '',
        status: 'pending',
        tags: []
      }}
    />
  )
};
