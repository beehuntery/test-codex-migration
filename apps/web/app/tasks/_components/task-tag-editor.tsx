'use client';

import React, { FormEvent, useState, useTransition, useOptimistic } from 'react';
import { updateTaskTagsAction } from '../actions';

interface TaskTagEditorProps {
  taskId: string;
  initialTags: string[];
}

export function TaskTagEditor({ taskId, initialTags }: TaskTagEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [stableTags, setStableTags] = useState(initialTags);
  const [optimisticTags, updateOptimisticTags] = useOptimistic(stableTags, (_, next: string[]) => next);

  const resetInput = () => setInputValue('');

  const syncOptimistic = (nextTags: string[]) => {
    startTransition(() => {
      updateOptimisticTags(nextTags);
    });
  };

  const commitTags = (nextTags: string[]) => {
    syncOptimistic(nextTags);
    void (async () => {
      try {
        await updateTaskTagsAction(taskId, nextTags);
        setStableTags(nextTags);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タグの更新に失敗しました。');
        syncOptimistic(stableTags);
      }
    })();
  };

  const handleAddTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = inputValue.trim();
    if (!value) {
      return;
    }
    const exists = new Set(stableTags);
    optimisticTags.forEach((tag) => exists.add(tag));
    if (exists.has(value)) {
      setError('同じタグが既に存在します。');
      return;
    }
    setError(null);
    commitTags([...optimisticTags, value]);
    resetInput();
  };

  const handleRemoveTag = (tag: string) => {
    setError(null);
    commitTags(optimisticTags.filter((item) => item !== tag));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {optimisticTags.length ? (
          optimisticTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)]/30 px-3 py-1 text-xs font-medium text-[color:var(--color-text)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="rounded-md bg-transparent text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-error)]"
                disabled={isPending}
                aria-label={`${tag} を削除`}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-[color:var(--color-disabled)]">タグは未設定です</span>
        )}
      </div>

      <form onSubmit={handleAddTag} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="タグを追加"
          className="min-w-[180px] flex-1 rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          disabled={isPending}
        />
        <button type="submit" className="btn-secondary text-xs" disabled={isPending}>
          {isPending ? '保存中…' : '追加'}
        </button>
      </form>

      {error ? <p className="text-xs text-[color:var(--color-error)]">{error}</p> : null}
    </div>
  );
}
