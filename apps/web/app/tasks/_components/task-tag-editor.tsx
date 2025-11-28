'use client';

import React, {
  FormEvent,
  startTransition as startOptimisticTransition,
  useEffect,
  useOptimistic,
  useState
} from 'react';
import { updateTaskTagsAction } from '../actions';
import { useTaskNotifications } from './task-notification-provider';

interface TaskTagEditorProps {
  taskId: string;
  initialTags: string[];
}

export function TaskTagEditor({ taskId, initialTags }: TaskTagEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [stableTags, setStableTags] = useState(initialTags);
  const [optimisticTags, dispatchOptimisticTags] = useOptimistic(
    stableTags,
    (_, action: { type: 'replace'; tags: string[] }) => action.tags
  );
  const { notify } = useTaskNotifications();

  const resetInput = () => setInputValue('');

  useEffect(() => {
    setStableTags(initialTags);
    startOptimisticTransition(() => {
      dispatchOptimisticTags({ type: 'replace', tags: initialTags });
    });
  }, [initialTags, dispatchOptimisticTags]);

  const syncOptimistic = (nextTags: string[]) => {
    startOptimisticTransition(() => {
      dispatchOptimisticTags({ type: 'replace', tags: nextTags });
    });
  };

  const commitTags = async (nextTags: string[]) => {
    syncOptimistic(nextTags);
    setIsPending(true);
    try {
      await updateTaskTagsAction(taskId, nextTags);
      setStableTags(nextTags);
      setError(null);
      notify({
        type: 'success',
        title: 'タグを更新しました',
        description: nextTags.length ? nextTags.join(', ') : 'タグなし'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タグの更新に失敗しました。');
      syncOptimistic(stableTags);
      notify({
        type: 'error',
        title: 'タグの更新に失敗しました',
        description: err instanceof Error ? err.message : undefined
      });
    } finally {
      setIsPending(false);
    }
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
      notify({
        type: 'info',
        title: 'タグが既に存在します',
        description: `${value} は重複しています。`
      });
      return;
    }
    setError(null);
    void commitTags([...optimisticTags, value]);
    resetInput();
  };

  const handleRemoveTag = (tag: string) => {
    setError(null);
    void commitTags(optimisticTags.filter((item) => item !== tag));
    notify({
      type: 'success',
      title: 'タグを削除しました',
      description: tag
    });
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
