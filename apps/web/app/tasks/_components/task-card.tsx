import React from 'react';
import { type Task } from '@shared/api';
import { StatusBadge } from './status-badge';

function formatDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return '更新なし';
  }
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

export function TaskCard({
  task,
  statusControls
}: {
  task: Task;
  statusControls?: React.ReactNode;
}) {
  const dueDate = formatDate(task.dueDate);
  const updatedAt = formatTimestamp(task.updatedAt);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[rgba(107,102,95,0.16)] bg-white/90 p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{task.title}</h3>
          {task.description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--color-text-muted)]">{task.description}</p>
          ) : null}
        </div>
        <StatusBadge status={task.status} />
      </header>

      <dl className="grid gap-3 text-sm text-[color:var(--color-text-muted)] md:grid-cols-3">
        <div>
          <dt className="font-semibold text-[color:var(--color-text)]">期限</dt>
          <dd>{dueDate ?? '期限なし'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[color:var(--color-text)]">作成日</dt>
          <dd>{formatTimestamp(task.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[color:var(--color-text)]">最終更新</dt>
          <dd>{updatedAt}</dd>
        </div>
      </dl>

      <footer className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {task.tags.length ? (
            task.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-[color:var(--color-accent)]/30 px-3 py-1 text-xs font-medium text-[color:var(--color-text)]"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-[color:var(--color-disabled)]">タグは未設定です</span>
          )}
        </div>
        {statusControls ?? (
          <div className="rounded-lg border border-dashed border-[rgba(107,102,95,0.25)] px-3 py-2 text-xs text-[color:var(--color-disabled)]">
            ステータス更新フォームは Storybook では無効化されています。
          </div>
        )}
      </footer>
    </article>
  );
}
