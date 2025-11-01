import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent } from '@storybook/testing-library';
import { TaskDeleteButton } from './task-delete-button';
import { TaskNotificationProvider } from './task-notification-provider';

const meta = {
  title: 'Tasks/TaskDeleteButton',
  component: TaskDeleteButton,
  parameters: {
    layout: 'centered'
  },
  decorators: [
    (Story) => (
      <TaskNotificationProvider>
        <Story />
      </TaskNotificationProvider>
    )
  ],
  args: {
    taskId: 'storybook-task-id',
    taskTitle: 'Storybook タスク'
  }
} satisfies Meta<typeof TaskDeleteButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithConfirmation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButton = await canvas.findByRole('button', { name: '削除' });
    await userEvent.click(deleteButton);
    await canvas.findByRole('button', { name: '削除する' });
  }
};
