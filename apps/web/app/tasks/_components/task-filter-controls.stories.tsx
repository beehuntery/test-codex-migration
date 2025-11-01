import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TaskTagFilterControls } from './task-tag-filter-controls';
import { TaskStatusFilterControls } from './task-status-filter-controls';
import { TaskAdvancedFilterControls } from './task-advanced-filter-controls';
import { __resetMockNavigation, __setMockUrl } from 'next/navigation';
import { TaskNotificationProvider } from './task-notification-provider';

const AVAILABLE_TAGS = ['frontend', 'backend', 'design', 'ops'];

const meta = {
  title: 'Tasks/Filters',
  component: TaskTagFilterControls,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof TaskTagFilterControls>;

export default meta;

type Story = StoryObj<typeof meta>;

function NavigationInitializer({ initialUrl }: { initialUrl: string }) {
  useEffect(() => {
    __resetMockNavigation();
    __setMockUrl(initialUrl);
  }, [initialUrl]);
  return null;
}

export const TagFilter: Story = {
  args: {
    availableTags: AVAILABLE_TAGS,
    selectedTags: ['frontend', 'design']
  },
  render: () => (
    <div className="w-[640px] max-w-full space-y-4">
      <NavigationInitializer initialUrl="/tasks?tags=frontend,design" />
      <TaskTagFilterControls availableTags={AVAILABLE_TAGS} selectedTags={['frontend', 'design']} />
      <p className="text-xs text-[color:var(--color-text-muted)]">
        タグボタンをクリックすると、モックの URL クエリが更新される様子を Storybook の Actions で確認できます。
      </p>
    </div>
  )
};

export const StatusFilter: Story = {
  args: {
    availableTags: AVAILABLE_TAGS,
    selectedTags: []
  },
  render: () => (
    <div className="w-[640px] max-w-full space-y-4">
      <NavigationInitializer initialUrl="/tasks?statuses=todo,in_progress" />
      <TaskStatusFilterControls selectedStatuses={['todo', 'in_progress']} />
      <p className="text-xs text-[color:var(--color-text-muted)]">
        ステータスの選択・解除でクエリパラメータが再計算されます。
      </p>
    </div>
  )
};

export const AdvancedFilter: Story = {
  args: {
    availableTags: AVAILABLE_TAGS,
    selectedTags: []
  },
  render: () => (
    <div className="w-[640px] max-w-full space-y-4">
      <NavigationInitializer initialUrl="/tasks?search=Playwright&dueFrom=2025-11-01&dueTo=2025-12-31&createdFrom=2025-10-01&updatedTo=2025-12-01" />
      <TaskAdvancedFilterControls
        initialQuery="Playwright"
        initialDueFrom="2025-11-01"
        initialDueTo="2025-12-31"
        initialCreatedFrom="2025-10-01"
        initialCreatedTo={null}
        initialUpdatedFrom={null}
        initialUpdatedTo="2025-12-01"
      />
      <p className="text-xs text-[color:var(--color-text-muted)]">
        キーワードや日付範囲を変更した後に「絞り込み」を押すと、モックのルーターが `router.replace` を呼び出します。
      </p>
    </div>
  )
};

export const CombinedFilters: Story = {
  args: {
    availableTags: AVAILABLE_TAGS,
    selectedTags: []
  },
  render: () => (
    <TaskNotificationProvider>
      <div className="w-[720px] max-w-full space-y-4">
        <NavigationInitializer initialUrl="/tasks?statuses=todo&tags=frontend&search=Next" />
        <TaskTagFilterControls availableTags={AVAILABLE_TAGS} selectedTags={['frontend']} />
        <TaskStatusFilterControls selectedStatuses={['todo']} />
        <TaskAdvancedFilterControls
          initialQuery="Next"
          initialDueFrom={null}
          initialDueTo={null}
          initialCreatedFrom={null}
          initialCreatedTo={null}
          initialUpdatedFrom={null}
          initialUpdatedTo={null}
        />
        <p className="text-xs text-[color:var(--color-text-muted)]">
          3種類のフィルターコンポーネントをまとめてレンダリングした例です。URL クエリの状態は Storybook アクションに出力されます。
        </p>
      </div>
    </TaskNotificationProvider>
  )
};
