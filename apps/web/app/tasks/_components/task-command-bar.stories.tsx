import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaskCommandBar } from './task-command-bar';
import { __resetMockNavigation, __setMockUrl } from 'next/navigation';
import { TaskStatusSchema } from '@shared/api';

const meta = {
  title: 'Tasks/CommandBar',
  component: TaskCommandBar,
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta<typeof TaskCommandBar>;

export default meta;

type Story = StoryObj<typeof meta>;

function NavigationInitializer({ initialUrl }: { initialUrl: string }) {
  useEffect(() => {
    __resetMockNavigation();
    __setMockUrl(initialUrl);
  }, [initialUrl]);
  return null;
}

const ALL_STATUSES = TaskStatusSchema.options;

export const Default: Story = {
  args: {
    searchQuery: '',
    activeStatuses: []
  },
  render: (args) => (
    <div className="min-h-[180px] bg-[color:var(--color-surface-muted)]">
      <NavigationInitializer initialUrl="/tasks" />
      <TaskCommandBar {...args} />
      <div className="px-6 py-8 text-sm text-[color:var(--color-text-muted)]">
        コマンドバー配下に続くコンテンツ領域のサンプルです。検索やステータスを切り替えると URL が更新されます。
      </div>
    </div>
  )
};

export const WithFilters: Story = {
  args: {
    searchQuery: 'design system',
    activeStatuses: ['waiting', 'pending']
  },
  render: (args) => (
    <div className="min-h-[180px] bg-[color:var(--color-surface-muted)]">
      <NavigationInitializer initialUrl="/tasks?search=design%20system&statuses=waiting,pending" />
      <TaskCommandBar {...args} />
      <div className="px-6 py-8 text-sm text-[color:var(--color-text-muted)]">
        待ち・保留のフィルタが有効な状態のサンプルです。
      </div>
    </div>
  )
};

export const AllStatusesActive: Story = {
  args: {
    searchQuery: 'migration',
    activeStatuses: ALL_STATUSES
  },
  render: (args) => (
    <div className="min-h-[180px] bg-[color:var(--color-surface-muted)]">
      <NavigationInitializer
        initialUrl={`/tasks?search=migration&statuses=${ALL_STATUSES.join(',')}`}
      />
      <TaskCommandBar {...args} />
      <div className="px-6 py-8 text-sm text-[color:var(--color-text-muted)]">
        すべてのステータスが選択されている状態です。
      </div>
    </div>
  )
};
