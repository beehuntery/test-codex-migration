import { Task, TaskStatusSchema } from '@shared/api';
import { STATUS_LABELS } from '../_components/status-badge';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type StringLike = string | string[] | undefined;

function toSingleValue(input: StringLike): string | null {
  if (input == null) {
    return null;
  }
  if (Array.isArray(input)) {
    return input.length > 0 ? input[0] ?? null : null;
  }
  return input;
}

export function parseFilterTags(input: StringLike): string[] {
  const raw = toSingleValue(input);
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index);
}

export function parseFilterStatuses(input: StringLike): (typeof TaskStatusSchema.options)[number][] {
  const raw = toSingleValue(input);
  if (!raw) {
    return [];
  }
  const validStatuses = new Set(TaskStatusSchema.options);
  const normalized = raw
    .split(',')
    .map((status) => status.trim())
    .filter((status, index, array) => status.length > 0 && array.indexOf(status) === index);

  return normalized.filter((status): status is (typeof TaskStatusSchema.options)[number] =>
    validStatuses.has(status as (typeof TaskStatusSchema.options)[number])
  );
}

export function parseSearchQuery(input: StringLike): string {
  const value = toSingleValue(input);
  return value ? value.trim() : '';
}

export function parseDateInput(input: StringLike): string | null {
  const value = toSingleValue(input);
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || !ISO_DATE_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function normalizeDateRange(
  from: string | null,
  to: string | null
): {
  from: string | null;
  to: string | null;
} {
  if (from && to && from > to) {
    return { from: to, to: from };
  }
  return { from: from ?? null, to: to ?? null };
}

export function extractDatePortion(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  try {
    return parsed.toISOString().slice(0, 10);
  } catch (err) {
    return null;
  }
}

export function matchesSearch(task: Task, query: string): boolean {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();
  const dueDate = task.dueDate ?? '';
  const createdDate = extractDatePortion(task.createdAt) ?? '';
  const updatedDate = extractDatePortion(task.updatedAt) ?? '';
  const haystack = [
    task.title ?? '',
    task.description ?? '',
    task.status ?? '',
    STATUS_LABELS[task.status] ?? '',
    dueDate,
    createdDate,
    updatedDate,
    ...(task.tags ?? [])
  ]
    .join(' ')
    .toLowerCase();

  if (haystack.includes(normalized)) {
    return true;
  }

  if (dueDate && dueDate.replace(/-/g, '/').includes(normalized)) {
    return true;
  }

  if (createdDate && createdDate.replace(/-/g, '/').includes(normalized)) {
    return true;
  }

  if (updatedDate && updatedDate.replace(/-/g, '/').includes(normalized)) {
    return true;
  }

  return false;
}

export function matchesDateRange(
  value: string | null | undefined,
  from: string | null,
  to: string | null
): boolean {
  if (!from && !to) {
    return true;
  }

  const target = extractDatePortion(value);
  if (!target) {
    return false;
  }

  let start = from ?? '';
  let end = to ?? '';

  if (start && end && start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  if (start && target < start) {
    return false;
  }

  if (end && target > end) {
    return false;
  }

  return true;
}
