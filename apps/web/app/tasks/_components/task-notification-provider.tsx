'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

type TaskNotificationType = 'success' | 'error' | 'info';

export interface TaskNotificationInput {
  type: TaskNotificationType;
  title: string;
  description?: string | null;
  duration?: number;
  id?: string;
}

interface TaskNotification extends Required<Omit<TaskNotificationInput, 'duration' | 'id'>> {
  id: string;
  duration: number;
}

interface TaskNotificationContextValue {
  notify: (notification: TaskNotificationInput) => string;
  dismiss: (id: string) => void;
}

const TaskNotificationContext = createContext<TaskNotificationContextValue | null>(null);

const NOOP_CONTEXT: TaskNotificationContextValue = {
  notify: () => '',
  dismiss: () => {}
};

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

const TYPE_STYLES: Record<TaskNotificationType, string> = {
  success:
    'border-[color:var(--color-success)] bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]',
  error: 'border-[color:var(--color-error)] bg-[color:var(--color-error)]/10 text-[color:var(--color-error)]',
  info: 'border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/10 text-[color:var(--color-text)]'
};

const TYPE_ICONS: Record<TaskNotificationType, string> = {
  success: '✓',
  error: '!',
  info: 'ℹ'
};

export function TaskNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const notificationsRef = useRef<TaskNotification[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
    const timerId = timersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (input: TaskNotificationInput) => {
      const id = input.id ?? generateId();
      const duration = input.duration ?? 5000;
      setNotifications((current) => {
        const next: TaskNotification = {
          id,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          duration
        };
        return [...current.filter((notification) => notification.id !== id), next];
      });
      if (duration > 0) {
        const existingTimer = timersRef.current.get(id);
        if (existingTimer) {
          window.clearTimeout(existingTimer);
        }
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const last = notificationsRef.current.at(-1);
        if (last) {
          dismiss(last.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <TaskNotificationContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 md:justify-end md:px-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <ul className="flex w-full max-w-sm flex-col gap-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${TYPE_STYLES[notification.type]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col" aria-live="polite">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-sm leading-none">
                      {TYPE_ICONS[notification.type]}
                    </span>
                    <p className="text-sm font-semibold text-[color:var(--color-text)]">
                      {notification.title}
                    </p>
                  </div>
                  {notification.description ? (
                    <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                      {notification.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(notification.id)}
                  className="text-xs font-medium text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-error)]"
                  aria-label="通知を閉じる (Escでも閉じられます)"
                >
                  閉じる
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </TaskNotificationContext.Provider>
  );
}

export function useTaskNotifications(): TaskNotificationContextValue {
  return useContext(TaskNotificationContext) ?? NOOP_CONTEXT;
}
