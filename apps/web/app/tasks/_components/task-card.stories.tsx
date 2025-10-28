import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { StoryContext } from '@storybook/react';
import { within } from '@storybook/test';
import type { Task } from '@shared/api';
import { TaskCard } from './task-card';

const baseTask: Task = {
  id: 'task-1',
  title: 'ストーリーブック対応の整備',
  description: 'Next.js フロントの Storybook ワークショップ環境を構築し、主要コンポーネントを追加する。',
  status: 'in_progress',
  dueDate: '2025-11-10',
  createdAt: '2025-10-20T08:30:00.000Z',
  updatedAt: '2025-10-26T16:00:00.000Z',
  order: 1,
  tags: ['frontend', 'storybook']
};

const TagPreview = ({ tags }: { tags: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {tags.map((tag) => (
      <span
        key={tag}
        className="inline-flex items-center rounded-full bg-[color:var(--color-accent)]/30 px-3 py-1 text-xs font-medium text-[color:var(--color-text)]"
      >
        {tag}
      </span>
    ))}
  </div>
);

const meta = {
  title: 'Tasks/TaskCard',
  component: TaskCard,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof TaskCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    task: baseTask,
    titleContent: <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{baseTask.title}</h3>,
    descriptionContent: (
      <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--color-text-muted)]">{baseTask.description}</p>
    ),
    statusControls: undefined,
    statusActions: (
      <button type="button" className="btn-secondary text-xs" disabled>
        ステータス変更ボタン（Storybookでは無効）
      </button>
    ),
    dueDateContent: <dd>2025/11/10</dd>,
    tagContent: <TagPreview tags={baseTask.tags} />
  },
  play: async ({ canvasElement }: StoryContext<typeof TaskCard>) => {
    const canvas = within(canvasElement);
    await canvas.findByText('ストーリーブック対応の整備');
  }
};

export const Completed: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'task-2',
      title: 'バックエンド移行の完了',
      status: 'done',
      tags: ['backend'],
      updatedAt: '2025-10-25T09:30:00.000Z'
    },
    titleContent: (
      <h3 className="text-xl font-semibold text-[color:var(--color-text)]">バックエンド移行の完了</h3>
    ),
    descriptionContent: (
      <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--color-text-muted)]">
        完了したタスクのフォローアップ内容を示す説明文です。
      </p>
    ),
    statusControls: undefined,
    statusActions: (
      <button type="button" className="btn-secondary text-xs" disabled>
        ステータス変更ボタン（Storybookでは無効）
      </button>
    ),
    dueDateContent: <dd>2025/10/25</dd>,
    tagContent: <TagPreview tags={['backend']} />
  }
};

export const NoTags: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'task-3',
      title: 'タグ未設定のタスク例',
      tags: [],
      description: ''
    },
    titleContent: (
      <h3 className="text-xl font-semibold text-[color:var(--color-text)]">タグ未設定のタスク例</h3>
    ),
    descriptionContent: (
      <p className="text-sm text-[color:var(--color-disabled)]">説明はまだありません</p>
    ),
    statusControls: undefined,
    statusActions: (
      <button type="button" className="btn-secondary text-xs" disabled>
        ステータス変更ボタン（Storybookでは無効）
      </button>
    ),
    dueDateContent: <dd>期限なし</dd>,
    tagContent: <TagPreview tags={[]} />
  }
};
