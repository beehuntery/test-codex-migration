'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Task, TaskStatus } from '@shared/api';
import { deleteTaskAction, updateTaskFieldsAction } from '../actions';
import { useTaskNotifications } from './task-notification-provider';
import { TaskTagEditor } from './task-tag-editor';

const AUTOSAVE_DELAY = 500;

interface TaskDetailPaneProps {
  task: Task;
  onClose: () => void;
  onDeleted?: (id: string) => void;
  availableTags: string[];
}

export function TaskDetailPane({ task, onClose, onDeleted, availableTags }: TaskDetailPaneProps) {
  const { notify } = useTaskNotifications();
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [description, setDescription] = useState(task.description ?? '');
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setTitle(task.title);
    setStatus(task.status);
    setDueDate(task.dueDate ?? '');
    setDescription(task.description ?? '');
  }, [task.id, task.title, task.status, task.dueDate, task.tags, task.description]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && event.target === document.body) {
        event.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setSaving(true);
    const handle = window.setTimeout(async () => {
      const formData = new FormData();
      formData.set('taskId', task.id);
      formData.set('title', title);
      formData.set('status', status);
      formData.set('dueDate', dueDate);
      formData.set('description', description);
      const result = await updateTaskFieldsAction(formData);
      if (result?.error) {
        notify({ type: 'error', title: '自動保存に失敗しました', description: result.error });
      }
      setSaving(false);
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(handle);
  }, [title, status, dueDate, description, task.id, notify]);

  const handleDelete = async () => {
    const result = await deleteTaskAction(task.id);
    if (result?.error) {
      notify({ type: 'error', title: '削除に失敗しました', description: result.error });
      return;
    }
    notify({ type: 'success', title: 'タスクを削除しました', description: task.title });
    onDeleted?.(task.id);
  };

  const createdAt = useMemo(() => new Date(task.createdAt).toLocaleString('ja-JP'), [task.createdAt]);
  const updatedAt = useMemo(() => (task.updatedAt ? new Date(task.updatedAt).toLocaleString('ja-JP') : '—'), [task.updatedAt]);

  if (!visible) {
    return (
      <aside className="rounded-xl border border-[color:var(--color-divider)] bg-white px-4 py-3 text-sm text-[color:var(--color-text-muted)]">
        <div className="flex items-center justify-between">
          <span>詳細ペインは非表示です（Enterで表示）</span>
          <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setVisible(true)}>
            開く
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative rounded-xl border border-[color:var(--color-divider)] bg-white px-5 py-4 shadow-sm" aria-label="タスク詳細">
      <div className="pane-resize-handle" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--color-text-muted)]">DETAIL</p>
          <input
            className="w-full border-none bg-transparent text-lg font-semibold text-[color:var(--color-text)] outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="タイトル"
          />
          <p className="text-xs text-[color:var(--color-text-muted)]">Enter で非表示 / 自動保存 {saving ? '…保存中' : ''}</p>
        </div>
        <button className="btn-secondary px-3 py-1 text-xs" onClick={handleDelete} aria-label="タスクを削除">
          削除
        </button>
      </div>

      <div className="mt-3 grid gap-3 text-sm text-[color:var(--color-text-muted)]">
        <label className="flex flex-col gap-1">
          <span className="text-[color:var(--color-text)] font-semibold">ステータス</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="rounded-lg border border-[color:var(--color-divider)] bg-white px-2 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none"
          >
            <option value="todo">TODO</option>
            <option value="in_progress">DOING</option>
            <option value="done">DONE</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[color:var(--color-text)] font-semibold">期限</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-[color:var(--color-divider)] bg-white px-2 py-2 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[color:var(--color-text)] font-semibold">タグ</span>
          <TaskTagEditor
            taskId={task.id}
            initialTags={task.tags}
            availableTags={availableTags}
            variant="default"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[color:var(--color-text)] font-semibold">説明</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px] resize-vertical rounded-lg border border-[color:var(--color-divider)] bg-white px-3 py-2 text-sm leading-relaxed text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none"
            placeholder="詳細を入力"
          />
        </label>

        <div className="grid grid-cols-2 gap-2 text-xs text-[color:var(--color-text-muted)]">
          <div>
            <span className="font-semibold text-[color:var(--color-text)]">作成</span>
            <div>{createdAt}</div>
          </div>
          <div>
            <span className="font-semibold text-[color:var(--color-text)]">更新</span>
            <div>{updatedAt}</div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </aside>
  );
}
