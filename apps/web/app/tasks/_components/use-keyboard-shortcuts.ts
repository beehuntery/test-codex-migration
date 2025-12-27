'use client';

import { useEffect } from 'react';

type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutOptions {
  onSearchFocus?: () => void;
  onCommandPalette?: () => void;
  onNewTask?: () => void;
  onToggleDetail?: () => void;
  onDelete?: () => void;
  onClearSelection?: () => void;
  onToggleDone?: () => void;
  onStatusDirect?: (index: number) => void;
  onFocusList?: () => void;
  onCycleStatus?: () => void;
}

export function useKeyboardShortcuts(options: ShortcutOptions) {
  const {
    onSearchFocus,
    onCommandPalette,
    onNewTask,
    onToggleDetail,
    onDelete,
    onClearSelection,
    onToggleDone,
    onStatusDirect,
    onFocusList,
    onCycleStatus
  } = options;

  useEffect(() => {
    const handler: ShortcutHandler = (event) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // 検索フォーカス '/'
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        onSearchFocus?.();
        return;
      }

      // 新規 N
      if ((event.key === 'n' || event.key === 'N') && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping) {
        event.preventDefault();
        onNewTask?.();
        return;
      }

      // リストへフォーカス L
      if ((event.key === 'l' || event.key === 'L') && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping) {
        event.preventDefault();
        onFocusList?.();
        return;
      }

      // 詳細ペイン Enter（フォーカスがbody直下想定）
      if (event.key === 'Enter' && event.target === document.body) {
        event.preventDefault();
        onToggleDetail?.();
        return;
      }

      // 削除 Del/Backspace（入力中はスキップ）
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping) {
        event.preventDefault();
        onDelete?.();
        return;
      }

      // 選択解除 Esc
      if (event.key === 'Escape') {
        event.preventDefault();
        onClearSelection?.();
        return;
      }

      // DONE トグル X
      if ((event.key === 'x' || event.key === 'X') && !isTyping) {
        event.preventDefault();
        onToggleDone?.();
        return;
      }

      // ステータスを次へ（S）
      if ((event.key === 's' || event.key === 'S') && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping) {
        event.preventDefault();
        onCycleStatus?.();
        return;
      }

      // ステータス直接指定 1..5
      if (!isTyping && /[1-5]/.test(event.key)) {
        const idx = Number(event.key) - 1;
        onStatusDirect?.(idx);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearchFocus, onCommandPalette, onNewTask, onToggleDetail, onDelete, onClearSelection, onToggleDone, onStatusDirect]);
}
