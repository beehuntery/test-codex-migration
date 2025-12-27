'use client';

import React, {
  useEffect,
  useId,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  startTransition as startOptimisticTransition
} from 'react';
import { updateTaskTagsAction } from '../actions';
import { useTaskNotifications } from './task-notification-provider';

interface TaskTagEditorProps {
  taskId?: string;
  initialTags: string[];
  availableTags: string[];
  variant?: 'default' | 'compact';
  mode?: 'server' | 'local';
  onChange?: (tags: string[]) => void;
  inputTestId?: string;
}

export function TaskTagEditor({
  taskId,
  initialTags,
  availableTags,
  variant = 'default',
  mode = 'server',
  onChange,
  inputTestId
}: TaskTagEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [stableTags, setStableTags] = useState(initialTags);
  const [optimisticTags, dispatchOptimisticTags] = useOptimistic(
    stableTags,
    (_, action: { type: 'replace'; tags: string[] }) => action.tags
  );
  const { notify } = useTaskNotifications();
  const [pickerOpen, setPickerOpen] = useState(false);
  const listId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStableTags(initialTags);
    startOptimisticTransition(() => {
      dispatchOptimisticTags({ type: 'replace', tags: initialTags });
    });
  }, [initialTags, dispatchOptimisticTags]);

  // close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isCompact = variant === 'compact';

  const filteredOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    return availableTags
      .filter((tag) => !optimisticTags.includes(tag))
      .filter((tag) => (query ? tag.toLowerCase().includes(query) : true));
  }, [availableTags, optimisticTags, inputValue]);

  const syncOptimistic = (nextTags: string[]) => {
    startOptimisticTransition(() => {
      dispatchOptimisticTags({ type: 'replace', tags: nextTags });
    });
  };

  const commitTags = async (nextTags: string[]) => {
    syncOptimistic(nextTags);
    onChange?.(nextTags);

    if (mode === 'local') {
      setStableTags(nextTags);
      setError(null);
      return;
    }

    if (!taskId) {
      setError('タスクIDが無効です。');
      return;
    }

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

  const handleRemoveTag = (tag: string) => {
    setError(null);
    void commitTags(optimisticTags.filter((item) => item !== tag));
    notify({
      type: 'success',
      title: 'タグを削除しました',
      description: tag
    });
  };

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (optimisticTags.includes(trimmed)) {
      setInputValue('');
      return;
    }
    void commitTags([...optimisticTags, trimmed]);
    setInputValue('');
  };

  const handleSelectAdd = (value: string) => {
    if (!value) return;
    addTag(value);
    // keep dropdown open for連続追加
    setPickerOpen(true);
  };

  const handleEnterKey = () => {
    if (filteredOptions.length === 0) {
      addTag(inputValue);
      setPickerOpen(false);
    }
  };

  const chipClasses = isCompact ? 'gap-1 px-2 py-1 text-[11px]' : 'gap-2 px-3 py-1 text-xs';

  return (
    <div
      className={`flex min-w-0 flex-col ${isCompact ? 'gap-1' : 'gap-2'}`}
      data-stop-selection
      ref={containerRef}
    >
      <div
        className={`flex min-w-0 items-start ${pickerOpen ? 'flex-wrap max-h-32 overflow-auto' : 'flex-nowrap overflow-x-auto'} ${isCompact ? 'gap-1' : 'gap-2'} rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-2 py-1.5`}
        role="combobox"
        aria-expanded={pickerOpen}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label="タグを選択"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setPickerOpen(true);
          inputRef.current?.focus();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPickerOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {optimisticTags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex shrink-0 items-center ${chipClasses} rounded-full bg-[color:var(--color-accent)]/30 font-medium text-[color:var(--color-text)]`}
            title={tag}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
              className="rounded-md bg-transparent text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-error)]"
              disabled={isPending}
              aria-label={`${tag} を削除`}
            >
              ×
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          data-testid={inputTestId}
          aria-label="タグ入力"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEnterKey();
            }
            if (e.key === 'Escape') {
              setPickerOpen(false);
            }
          }}
          placeholder=""
          className="ml-2 min-w-[120px] flex-1 shrink-0 border-none bg-transparent text-sm text-[color:var(--color-text)] outline-none"
          onFocus={() => setPickerOpen(true)}
          disabled={isPending}
        />
      </div>

      {pickerOpen ? (
        <div className="relative">
          <div
            className="absolute z-20 mt-1 w-full rounded-lg border border-[rgba(107,102,95,0.25)] bg-white shadow-lg max-h-48 overflow-auto"
            data-testid="tag-options"
            id={listId}
            role="listbox"
          >
            {filteredOptions.length ? (
              <ul className="py-1">
                {filteredOptions.map((tag) => (
                  <li key={tag}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)]"
                      onClick={() => handleSelectAdd(tag)}
                      disabled={isPending}
                    >
                      {tag}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-xs text-[color:var(--color-text-muted)]">
                一致するタグがありません。Enter で「{inputValue || '新規タグ'}」を追加します。
              </div>
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-[color:var(--color-error)]">{error}</p> : null}
    </div>
  );
}
