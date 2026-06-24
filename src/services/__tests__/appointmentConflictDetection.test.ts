import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Appointment, ConflictCheckResponse } from '../appointmentService';

/**
 * Test suite for appointment conflict detection logic.
 * Tests the core time-range overlap and gap calculations.
 */

// ─── Helper functions (mirrors backend logic) ──────────────────────────────────

function timeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): boolean {
  return start1 < end2 && end1 > start2;
}

function minGapBetweenRanges(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): number {
  if (end1 <= start2) return Math.max(0, start2.getTime() - end1.getTime());
  if (end2 <= start1) return Math.max(0, start1.getTime() - end2.getTime());
  return 0; // Ranges overlap
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

describe('Appointment Conflict Detection', () => {
  describe('timeRangesOverlap', () => {
    it('detects exact overlap - same start and end times', () => {
      const start = new Date('2026-06-10T09:00');
      const end = new Date('2026-06-10T09:30');
      expect(timeRangesOverlap(start, end, start, end)).toBe(true);
    });

    it('detects partial overlap - second starts before first ends', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T09:15');
      const end2 = new Date('2026-06-10T09:45');

      expect(timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('detects when one range is completely inside another', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T10:00');
      const start2 = new Date('2026-06-10T09:15');
      const end2 = new Date('2026-06-10T09:45');

      expect(timeRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('returns false when ranges are adjacent (end1 === start2)', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T09:30');
      const end2 = new Date('2026-06-10T10:00');

      expect(timeRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('returns false when ranges are completely separate', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T10:00');
      const end2 = new Date('2026-06-10T10:30');

      expect(timeRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });
  });

  describe('minGapBetweenRanges', () => {
    it('returns 0 when ranges overlap', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T09:15');
      const end2 = new Date('2026-06-10T09:45');

      expect(minGapBetweenRanges(start1, end1, start2, end2)).toBe(0);
    });

    it('calculates gap when ranges are adjacent', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T09:30');
      const end2 = new Date('2026-06-10T10:00');

      expect(minGapBetweenRanges(start1, end1, start2, end2)).toBe(0);
    });

    it('calculates gap when first range ends before second starts', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T09:50');
      const end2 = new Date('2026-06-10T10:00');

      const gap = minGapBetweenRanges(start1, end1, start2, end2);
      expect(gap).toBe(20 * 60_000); // 20 minutes in milliseconds
    });

    it('calculates gap when second range ends before first starts', () => {
      const start1 = new Date('2026-06-10T10:00');
      const end1 = new Date('2026-06-10T10:30');
      const start2 = new Date('2026-06-10T09:00');
      const end2 = new Date('2026-06-10T09:40');

      const gap = minGapBetweenRanges(start1, end1, start2, end2);
      expect(gap).toBe(20 * 60_000); // 20 minutes in milliseconds
    });

    it('handles 30-minute gap threshold correctly', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T10:00');
      const end2 = new Date('2026-06-10T10:30');

      const gap = minGapBetweenRanges(start1, end1, start2, end2);
      expect(gap).toBe(30 * 60_000); // Exactly 30 minutes
    });

    it('handles gap less than 30 minutes', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T09:50');
      const end2 = new Date('2026-06-10T10:30');

      const gap = minGapBetweenRanges(start1, end1, start2, end2);
      expect(gap).toBeLessThan(30 * 60_000);
      expect(gap).toBe(20 * 60_000);
    });
  });

  describe('Conflict detection scenarios', () => {
    it('should flag exact pet conflict when times completely overlap', () => {
      // Request: 9:00-9:30
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T09:30');

      // Existing: 9:00-9:30
      const existingStart = new Date('2026-06-10T09:00');
      const existingEnd = new Date('2026-06-10T09:30');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      expect(overlap).toBe(true);
    });

    it('should flag exact pet conflict when existing appointment is during request', () => {
      // Request: 9:00-9:30
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T09:30');

      // Existing: 9:10-9:20
      const existingStart = new Date('2026-06-10T09:10');
      const existingEnd = new Date('2026-06-10T09:20');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      expect(overlap).toBe(true);
    });

    it('should NOT flag conflict for back-to-back appointments (0 gap)', () => {
      // Request: 9:00-9:30
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T09:30');

      // Existing: 9:30-10:00
      const existingStart = new Date('2026-06-10T09:30');
      const existingEnd = new Date('2026-06-10T10:00');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      const gap = minGapBetweenRanges(requestStart, requestEnd, existingStart, existingEnd);

      expect(overlap).toBe(false);
      expect(gap).toBe(0);
    });

    it('should warn for near-overlap with 15-minute gap', () => {
      // Request: 9:00-9:30
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T09:30');

      // Existing: 9:45-10:15
      const existingStart = new Date('2026-06-10T09:45');
      const existingEnd = new Date('2026-06-10T10:15');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      const gap = minGapBetweenRanges(requestStart, requestEnd, existingStart, existingEnd);

      expect(overlap).toBe(false);
      expect(gap).toBeLessThan(30 * 60_000);
      expect(gap).toBe(15 * 60_000);
    });

    it('should allow booking with 30-minute or larger gap', () => {
      // Request: 9:00-9:30
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T09:30');

      // Existing: 10:00-10:30
      const existingStart = new Date('2026-06-10T10:00');
      const existingEnd = new Date('2026-06-10T10:30');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      const gap = minGapBetweenRanges(requestStart, requestEnd, existingStart, existingEnd);

      expect(overlap).toBe(false);
      expect(gap).toBeGreaterThanOrEqual(30 * 60_000);
    });

    it('should handle variable appointment durations correctly', () => {
      // Request: 9:00, 60-minute duration (9:00-10:00)
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T10:00');

      // Existing: 10:30-11:00 (30-min after request ends)
      const existingStart = new Date('2026-06-10T10:30');
      const existingEnd = new Date('2026-06-10T11:00');

      const gap = minGapBetweenRanges(requestStart, requestEnd, existingStart, existingEnd);
      expect(gap).toBe(30 * 60_000);
    });

    it('should handle same-day appointments across hours', () => {
      // Request: 15:00-15:30
      const requestStart = new Date('2026-06-10T15:00');
      const requestEnd = new Date('2026-06-10T15:30');

      // Existing: 14:00-14:30
      const existingStart = new Date('2026-06-10T14:00');
      const existingEnd = new Date('2026-06-10T14:30');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      expect(overlap).toBe(false);
    });

    it('should handle appointments across different days', () => {
      // Request: 2026-06-10 09:00-09:30
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T09:30');

      // Existing: 2026-06-11 09:00-09:30 (different day)
      const existingStart = new Date('2026-06-11T09:00');
      const existingEnd = new Date('2026-06-11T09:30');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      expect(overlap).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle midnight crossing boundaries', () => {
      // Request: 23:00-23:30
      const requestStart = new Date('2026-06-10T23:00');
      const requestEnd = new Date('2026-06-10T23:30');

      // Existing: 23:15-00:15 (next day)
      const existingStart = new Date('2026-06-10T23:15');
      const existingEnd = new Date('2026-06-11T00:15');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      expect(overlap).toBe(true);
    });

    it('should handle empty gap as 0ms', () => {
      const start1 = new Date('2026-06-10T09:00');
      const end1 = new Date('2026-06-10T09:30');
      const start2 = new Date('2026-06-10T09:30');
      const end2 = new Date('2026-06-10T10:00');

      const gap = minGapBetweenRanges(start1, end1, start2, end2);
      expect(gap).toBe(0);
    });

    it('should handle very large gaps', () => {
      // Request: 9:00-9:30
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T09:30');

      // Existing: next day at same time
      const existingStart = new Date('2026-06-11T09:00');
      const existingEnd = new Date('2026-06-11T09:30');

      const gap = minGapBetweenRanges(requestStart, requestEnd, existingStart, existingEnd);
      expect(gap).toBe(24 * 60 * 60_000); // 24 hours
    });

    it('should handle appointments with 1-minute duration', () => {
      // Request: 9:00-9:01 (1-minute appointment)
      const requestStart = new Date('2026-06-10T09:00');
      const requestEnd = new Date('2026-06-10T09:01');

      // Existing: 9:02-9:32
      const existingStart = new Date('2026-06-10T09:02');
      const existingEnd = new Date('2026-06-10T09:32');

      const overlap = timeRangesOverlap(requestStart, requestEnd, existingStart, existingEnd);
      const gap = minGapBetweenRanges(requestStart, requestEnd, existingStart, existingEnd);

      expect(overlap).toBe(false);
      expect(gap).toBe(60_000); // 1 minute
    });
  });
});
