import type { Meta, StoryObj } from '@storybook/react';
import { TaskCard } from './task-card';
import type { Task } from '@shared/api';
import { within } from '@storybook/test';
import type { StoryContext } from '@storybook/react';

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
    statusControls: undefined,
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
    statusControls: undefined,
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
    statusControls: undefined,
    tagContent: <TagPreview tags={[]} />
  }
};
