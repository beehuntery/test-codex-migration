import { describe, expect, it } from 'vitest';
import {
  extractDatePortion,
  matchesDateRange,
  normalizeDateRange,
  parseFilterStatuses
} from '../../apps/web/app/tasks/_lib/filter-utils';

describe('task filter utilities', () => {
  it('normalizes swapped date ranges', () => {
    const range = normalizeDateRange('2025-12-01', '2025-10-31');
    expect(range).toEqual({ from: '2025-10-31', to: '2025-12-01' });
  });

  it('extracts the date portion from ISO strings with time', () => {
    expect(extractDatePortion('2025-11-01T09:15:30.000Z')).toBe('2025-11-01');
  });

  it('matches created/updated date ranges against ISO timestamps', () => {
    const iso = '2025-11-15T12:00:00.000Z';
    expect(matchesDateRange(iso, '2025-11-01', '2025-11-30')).toBe(true);
    expect(matchesDateRange(iso, '2025-11-16', null)).toBe(false);
  });

  it('ignores invalid statuses when parsing', () => {
    expect(parseFilterStatuses('todo,unknown,done')).toEqual(['todo', 'done']);
  });
});
