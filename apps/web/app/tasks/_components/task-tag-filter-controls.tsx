'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface TaskTagFilterControlsProps {
  availableTags: string[];
  selectedTags: string[];
}

export function TaskTagFilterControls({ availableTags, selectedTags }: TaskTagFilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();

  const [activeTags, setActiveTags] = useState<Set<string>>(new Set(selectedTags));
  const [isOpen, setIsOpen] = useState<boolean>(selectedTags.length > 0);

  useEffect(() => {
    setActiveTags(new Set(selectedTags));
    if (selectedTags.length) {
      setIsOpen(true);
    }
  }, [selectedTags.join(',')]);

  const sortedTags = useMemo(() => [...availableTags].sort((a, b) => a.localeCompare(b, 'ja')), [availableTags]);

  const updateQuery = (nextTags: Set<string>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTags.size > 0) {
      params.set('tags', Array.from(nextTags).join(','));
    } else {
      params.delete('tags');
    }
    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(nextUrl as Parameters<typeof router.replace>[0], { scroll: false });
  };

  const toggleTag = (tag: string) => {
    const next = new Set(activeTags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    setActiveTags(next);
    updateQuery(next);
  };

  const clearSelection = () => {
    const empty = new Set<string>();
    setActiveTags(empty);
    updateQuery(empty);
  };

  if (sortedTags.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[rgba(107,102,95,0.25)] bg-white/60 px-4 py-3 text-xs text-[color:var(--color-text-muted)]">
        タグがまだ登録されていません。
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-[rgba(107,102,95,0.16)] bg-white/80 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-[color:var(--color-text)]">タグで絞り込み</p>
          <span className="text-xs text-[color:var(--color-text-muted)]">
            選択中: {activeTags.size} 件
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={clearSelection}
            disabled={activeTags.size === 0}
          >
            すべて解除
          </button>
          <button
            type="button"
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-1 text-xs text-[color:var(--color-text)] transition hover:border-[color:var(--color-primary)]"
            aria-expanded={isOpen}
            aria-controls={listId}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? '閉じる' : '開く'}
          </button>
        </div>
      </header>
      <div
        id={listId}
        className={`flex flex-wrap gap-2 transition-[max-height,opacity] duration-200 ${
          isOpen ? 'opacity-100' : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        {isOpen
          ? sortedTags.map((tag) => {
              const isActive = activeTags.has(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition ${
                    isActive
                      ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/90 text-white'
                      : 'border-[rgba(107,102,95,0.25)] bg-white text-[color:var(--color-text)] hover:border-[color:var(--color-primary)]'
                  }`}
                  aria-pressed={isActive}
                >
                  {tag}
                </button>
              );
            })
          : null}
      </div>
    </section>
  );
}
