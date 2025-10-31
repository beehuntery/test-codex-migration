'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTaskAction } from '../actions';

interface TaskCreateFormProps {
  onCreated?: () => void;
}

type OptimisticTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  tags: string[];
};

type OptimisticTaskAction =
  | { type: 'enqueue'; task: OptimisticTask }
  | { type: 'settle'; id: string }
  | { type: 'reset' };

export function TaskCreateForm({ onCreated }: TaskCreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [optimisticTasks, dispatchOptimisticTask] = useOptimistic<OptimisticTask[], OptimisticTaskAction>(
    [],
    (state, action) => {
      switch (action.type) {
        case 'enqueue':
          return [action.task, ...state];
        case 'settle':
          return state.filter((task) => task.id !== action.id);
        case 'reset':
          return [];
        default:
          return state;
      }
    }
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('タイトルは必須です。');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('title', trimmedTitle);
      formData.set('description', description);
      formData.set('dueDate', dueDate);
      formData.set('tags', tags);

      const optimisticId = crypto.randomUUID();
      const optimisticTags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      dispatchOptimisticTask({
        type: 'enqueue',
        task: {
          id: optimisticId,
          title: trimmedTitle,
          description,
          dueDate: dueDate || null,
          tags: optimisticTags
        }
      });

      const result = await createTaskAction(formData);
      if (result?.error) {
        setError(result.error);
        dispatchOptimisticTask({ type: 'settle', id: optimisticId });
      } else {
        setError(null);
        setTitle('');
        setDescription('');
        setDueDate('');
        setTags('');
        dispatchOptimisticTask({ type: 'settle', id: optimisticId });
        router.refresh();
        onCreated?.();
      }
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[rgba(107,102,95,0.16)] bg-white/95 p-6 shadow-sm">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-[color:var(--color-text)]">新しいタスクを作成</h2>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          タイトルと任意の詳細を入力して保存すると、タスクリストへ追加されます。
        </p>
      </header>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[color:var(--color-text)]">タイトル</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isPending}
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
            placeholder="タスク名を入力"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[color:var(--color-text)]">説明</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isPending}
            className="min-h-[80px] resize-vertical rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm leading-relaxed text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
            placeholder="タスクの詳細を入力（任意）"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[color:var(--color-text)]">期限</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={isPending}
              className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[color:var(--color-text)]">タグ</span>
            <input
              type="text"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              disabled={isPending}
              className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
              placeholder="カンマ区切りで入力"
            />
          </label>
        </div>
        {error ? <p className="text-xs text-[color:var(--color-error)]">{error}</p> : null}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? '保存中…' : 'タスクを追加'}
          </button>
          <span className="text-xs text-[color:var(--color-text-muted)]">
            未反映タスク: {optimisticTasks.length} 件
          </span>
        </div>
      </form>
      {optimisticTasks.length > 0 ? (
        <div className="rounded-xl border border-[rgba(107,102,95,0.14)] bg-[color:var(--color-surface-muted)]/70 p-4 text-xs text-[color:var(--color-text-muted)]">
          <p className="mb-2 font-semibold text-[color:var(--color-text)]">送信中のタスク</p>
          <ul className="flex flex-col gap-2">
            {optimisticTasks.map((task) => (
              <li key={task.id} className="flex flex-col gap-1">
                <span className="font-medium text-[color:var(--color-text)]">{task.title}</span>
                {task.description ? <span>{task.description}</span> : null}
                <div className="flex flex-wrap gap-3">
                  {task.dueDate ? <span>期限: {task.dueDate}</span> : null}
                  {task.tags.length ? <span>タグ: {task.tags.join(', ')}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
