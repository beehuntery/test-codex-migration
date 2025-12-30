'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { TaskStatusSchema } from '@shared/api';
import { useRouter } from 'next/navigation';
import { useTaskNotifications } from './task-notification-provider';
import { TaskTagEditor } from './task-tag-editor';

type TaskStatus = (typeof TaskStatusSchema.options)[number];

interface TaskQuickAddProps {
  availableTags: string[];
}

export function TaskQuickAdd({ availableTags }: TaskQuickAddProps) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [isPending, startTransition] = useTransition();
  const { notify } = useTaskNotifications();
  const titleRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // N キーでタイトルへフォーカス
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.key === 'n' || event.key === 'N') && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (isTyping) return;
        event.preventDefault();
        titleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rawTitle = titleRef.current?.value ?? title;
    const trimmedTitle = rawTitle.trim();
    if (!trimmedTitle) {
      notify({ type: 'error', title: 'タイトルを入力してください', description: 'クイック追加にはタイトルが必要です。' });
      return;
    }

    startTransition(async () => {
      const payload = {
        title: trimmedTitle,
        description: '',
        status,
        dueDate: dueDate ? dueDate : null,
        tags
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.error === 'string' ? data.error : 'タスクの作成に失敗しました。';
        notify({ type: 'error', title: 'タスク追加に失敗しました', description: message });
        return;
      }

      setTitle('');
      if (titleRef.current) {
        titleRef.current.value = '';
      }
      setTags([]);
      setDueDate('');
      setStatus('todo');
      titleRef.current?.focus();
      router.refresh();
      notify({ type: 'success', title: 'タスクを追加しました', description: trimmedTitle });
    });
  };

  return (
    <section aria-label="クイック追加" className="rounded-xl border border-[color:var(--color-divider)] bg-white shadow-sm">
      <form
        className="task-table-row gap-3"
        style={{ gridTemplateColumns: '32px minmax(360px, 3fr) 120px 130px 320px' }}
        onSubmit={handleSubmit}
        data-testid="quick-add-form"
      >
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="btn-primary px-4 py-2 text-sm"
            aria-label="タスクを追加"
            disabled={isPending}
          >
            +
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-[5fr_1.2fr_1.6fr]">
          <input
            ref={titleRef}
            id="task-quick-add-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル…"
            data-testid="qa-title"
            className="w-full min-w-[320px] rounded-lg border border-[color:var(--color-divider)] bg-white px-4 py-3 text-base font-semibold text-[#3e3a36] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-primary)] focus:outline-none"
            aria-label="タイトル"
            disabled={isPending}
            required
          />
        <div className="flex items-center">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            data-testid="qa-due"
            className="w-full rounded-lg border border-[color:var(--color-divider)] bg-white px-2 py-2 text-sm font-semibold text-[#3e3a36] placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-primary)] focus:outline-none"
            aria-label="期限"
            placeholder="期限…"
            disabled={isPending}
          />
        </div>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-28 rounded-lg border border-[color:var(--color-divider)] bg-white px-2 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none"
              aria-label="ステータス"
              disabled={isPending}
            >
              {TaskStatusSchema.options.map((option) => (
                <option key={option} value={option}>
                  {option === 'todo' ? 'TODO' : option === 'in_progress' ? 'DOING' : 'DONE'}
                </option>
              ))}
            </select>
            <div className="flex-1 min-w-[200px]">
              <TaskTagEditor
                taskId={undefined}
                initialTags={tags}
                availableTags={availableTags}
                variant="compact"
                mode="local"
                onChange={setTags}
                inputTestId="qa-tags"
              />
            </div>
          </div>
        </div>
      </form>

      <div className="px-4 pb-3 text-right text-xs text-[color:var(--color-text-muted)]">
        <span>{isPending ? '追加中…' : 'Enter で追加 / N でフォーカス'}</span>
      </div>
    </section>
  );
}
