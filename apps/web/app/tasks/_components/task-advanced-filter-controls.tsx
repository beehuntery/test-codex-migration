'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface TaskAdvancedFilterControlsProps {
  initialQuery: string;
  initialDueFrom: string | null;
  initialDueTo: string | null;
  initialCreatedFrom: string | null;
  initialCreatedTo: string | null;
  initialUpdatedFrom: string | null;
  initialUpdatedTo: string | null;
}

function normalizeDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return ISO_DATE_PATTERN.test(trimmed) ? trimmed : '';
}

export function TaskAdvancedFilterControls({
  initialQuery,
  initialDueFrom,
  initialDueTo,
  initialCreatedFrom,
  initialCreatedTo,
  initialUpdatedFrom,
  initialUpdatedTo
}: TaskAdvancedFilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [dueFrom, setDueFrom] = useState(initialDueFrom ?? '');
  const [dueTo, setDueTo] = useState(initialDueTo ?? '');
  const [createdFrom, setCreatedFrom] = useState(initialCreatedFrom ?? '');
  const [createdTo, setCreatedTo] = useState(initialCreatedTo ?? '');
  const [updatedFrom, setUpdatedFrom] = useState(initialUpdatedFrom ?? '');
  const [updatedTo, setUpdatedTo] = useState(initialUpdatedTo ?? '');

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setDueFrom(initialDueFrom ?? '');
  }, [initialDueFrom]);

  useEffect(() => {
    setDueTo(initialDueTo ?? '');
  }, [initialDueTo]);

  useEffect(() => {
    setCreatedFrom(initialCreatedFrom ?? '');
  }, [initialCreatedFrom]);

  useEffect(() => {
    setCreatedTo(initialCreatedTo ?? '');
  }, [initialCreatedTo]);

  useEffect(() => {
    setUpdatedFrom(initialUpdatedFrom ?? '');
  }, [initialUpdatedFrom]);

  useEffect(() => {
    setUpdatedTo(initialUpdatedTo ?? '');
  }, [initialUpdatedTo]);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(query.trim()) ||
      Boolean(dueFrom) ||
      Boolean(dueTo) ||
      Boolean(createdFrom) ||
      Boolean(createdTo) ||
      Boolean(updatedFrom) ||
      Boolean(updatedTo)
    );
  }, [createdFrom, createdTo, dueFrom, dueTo, query, updatedFrom, updatedTo]);

  const applyFilters = ({
    nextQuery,
    nextDueFrom,
    nextDueTo,
    nextCreatedFrom,
    nextCreatedTo,
    nextUpdatedFrom,
    nextUpdatedTo,
    clearAuxiliaryFilters = false
  }: {
    nextQuery: string;
    nextDueFrom: string;
    nextDueTo: string;
    nextCreatedFrom: string;
    nextCreatedTo: string;
    nextUpdatedFrom: string;
    nextUpdatedTo: string;
    clearAuxiliaryFilters?: boolean;
  }) => {
    const params = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery) {
      params.set('search', trimmedQuery);
    } else {
      params.delete('search');
    }

    const normalizedDueFrom = normalizeDateInput(nextDueFrom);
    const normalizedDueTo = normalizeDateInput(nextDueTo);
    const normalizedCreatedFrom = normalizeDateInput(nextCreatedFrom);
    const normalizedCreatedTo = normalizeDateInput(nextCreatedTo);
    const normalizedUpdatedFrom = normalizeDateInput(nextUpdatedFrom);
    const normalizedUpdatedTo = normalizeDateInput(nextUpdatedTo);

    if (normalizedDueFrom) {
      params.set('dueFrom', normalizedDueFrom);
    } else {
      params.delete('dueFrom');
    }

    if (normalizedDueTo) {
      params.set('dueTo', normalizedDueTo);
    } else {
      params.delete('dueTo');
    }

    if (normalizedCreatedFrom) {
      params.set('createdFrom', normalizedCreatedFrom);
    } else {
      params.delete('createdFrom');
    }

    if (normalizedCreatedTo) {
      params.set('createdTo', normalizedCreatedTo);
    } else {
      params.delete('createdTo');
    }

    if (normalizedUpdatedFrom) {
      params.set('updatedFrom', normalizedUpdatedFrom);
    } else {
      params.delete('updatedFrom');
    }

    if (normalizedUpdatedTo) {
      params.set('updatedTo', normalizedUpdatedTo);
    } else {
      params.delete('updatedTo');
    }

    if (clearAuxiliaryFilters) {
      params.delete('tags');
      params.delete('statuses');
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(nextUrl as Parameters<typeof router.replace>[0], { scroll: false });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters({
      nextQuery: query,
      nextDueFrom: dueFrom,
      nextDueTo: dueTo,
      nextCreatedFrom: createdFrom,
      nextCreatedTo: createdTo,
      nextUpdatedFrom: updatedFrom,
      nextUpdatedTo: updatedTo,
      clearAuxiliaryFilters: false
    });
  };

  const handleReset = () => {
    setQuery('');
    setDueFrom('');
    setDueTo('');
    setCreatedFrom('');
    setCreatedTo('');
    setUpdatedFrom('');
    setUpdatedTo('');
    applyFilters({
      nextQuery: '',
      nextDueFrom: '',
      nextDueTo: '',
      nextCreatedFrom: '',
      nextCreatedTo: '',
      nextUpdatedFrom: '',
      nextUpdatedTo: '',
      clearAuxiliaryFilters: true
    });
  };

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-[rgba(107,102,95,0.16)] bg-white/80 p-4"
      aria-labelledby="task-advanced-filter-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="task-advanced-filter-heading" className="text-sm font-semibold text-[color:var(--color-text)]">
            詳細フィルター
          </h3>
          <p className="text-xs text-[color:var(--color-text-muted)]">
            タイトルや期限、作成日・更新日でタスクを絞り込みできます。
          </p>
        </div>
        <button type="button" onClick={handleReset} className="btn-secondary text-xs" disabled={!hasActiveFilters}>
          フィルターをリセット
        </button>
      </div>
      <form
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="詳細フィルター"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col gap-1 text-sm md:col-span-2 xl:col-span-4">
          <span className="font-semibold text-[color:var(--color-text)]">キーワード</span>
          <input
            id="task-filter-search"
            name="search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
            placeholder="タイトル・タグ・メモで検索"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[color:var(--color-text)]">期限（開始）</span>
          <input
            id="task-filter-due-from"
            name="dueFrom"
            type="date"
            value={dueFrom}
            onChange={(event) => setDueFrom(event.target.value)}
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[color:var(--color-text)]">期限（終了）</span>
          <input
            id="task-filter-due-to"
            name="dueTo"
            type="date"
            value={dueTo}
            onChange={(event) => setDueTo(event.target.value)}
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[color:var(--color-text)]">作成日（開始）</span>
          <input
            id="task-filter-created-from"
            name="createdFrom"
            type="date"
            value={createdFrom}
            onChange={(event) => setCreatedFrom(event.target.value)}
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[color:var(--color-text)]">作成日（終了）</span>
          <input
            id="task-filter-created-to"
            name="createdTo"
            type="date"
            value={createdTo}
            onChange={(event) => setCreatedTo(event.target.value)}
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[color:var(--color-text)]">更新日（開始）</span>
          <input
            id="task-filter-updated-from"
            name="updatedFrom"
            type="date"
            value={updatedFrom}
            onChange={(event) => setUpdatedFrom(event.target.value)}
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[color:var(--color-text)]">更新日（終了）</span>
          <input
            id="task-filter-updated-to"
            name="updatedTo"
            type="date"
            value={updatedTo}
            onChange={(event) => setUpdatedTo(event.target.value)}
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          />
        </label>
        <div className="md:col-span-2 xl:col-span-4">
          <button type="submit" className="btn-primary w-full md:w-auto">
            絞り込み
          </button>
        </div>
      </form>
    </section>
  );
}
