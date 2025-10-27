import { TaskStatusSchema } from '@shared/api';
import { updateTaskStatusAction } from '../actions';
import { STATUS_LABELS } from './status-badge';

const STATUS_OPTIONS = TaskStatusSchema.options;

export function TaskStatusForm({
  taskId,
  currentStatus
}: {
  taskId: string;
  currentStatus: (typeof STATUS_OPTIONS)[number];
}) {
  return (
    <form
      action={updateTaskStatusAction}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(107,102,95,0.15)] bg-white/90 px-3 py-2"
    >
      <input type="hidden" name="taskId" value={taskId} />
      <label className="text-xs font-semibold text-[color:var(--color-text-muted)]" htmlFor={`status-${taskId}`}>
        ステータス更新
      </label>
      <select
        id={`status-${taskId}`}
        name="status"
        defaultValue={currentStatus}
        className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-1 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-secondary text-xs">更新</button>
    </form>
  );
}
