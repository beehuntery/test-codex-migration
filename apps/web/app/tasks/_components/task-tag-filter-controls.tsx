'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface TaskTagFilterControlsProps {
  availableTags: string[];
  selectedTags: string[];
}

export function TaskTagFilterControls({ availableTags, selectedTags }: TaskTagFilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTags, setActiveTags] = useState<Set<string>>(new Set(selectedTags));

  useEffect(() => {
    setActiveTags(new Set(selectedTags));
  }, [selectedTags.join(',')]);

  const sortedTags = useMemo(() => [...availableTags].sort((a, b) => a.localeCompare(b, 'ja')), [availableTags]);

  const updateQuery = (nextTags: Set<string>) => {
    const params = new URLSearchParams(searchParams);
    if (nextTags.size > 0) {
      params.set('tags', Array.from(nextTags).join(','));
    } else {
      params.delete('tags');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
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
    <div className="flex flex-col gap-3 rounded-xl border border-[rgba(107,102,95,0.16)] bg-white/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--color-text)]">タグで絞り込み</p>
        <button
          type="button"
          onClick={clearSelection}
          className="btn-secondary text-xs"
          disabled={activeTags.size === 0}
        >
          すべて解除
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sortedTags.map((tag) => {
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
        })}
      </div>
      <p className="text-xs text-[color:var(--color-text-muted)]">
        選択中: {activeTags.size} 件
      </p>
    </div>
  );
}
