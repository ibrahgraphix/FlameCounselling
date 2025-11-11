// src/utils/timeUtils.ts
import { DateTime, Interval } from "luxon";

export type BusyRange = { start: string; end: string };

/**
 * Generate time slots for a given date (YYYY-MM-DD) in timezone, excluding busyRanges.
 * Returns array of { startISO, endISO, label }.
 */
export function generateTimeSlots(
  dateISO: string,
  workingStart: string,
  workingEnd: string,
  durationMinutes: number,
  timezone: string,
  busyRanges: BusyRange[]
) {
  const [wsH, wsM] = workingStart.split(":").map((s) => Number(s));
  const [weH, weM] = workingEnd.split(":").map((s) => Number(s));

  const startDT = DateTime.fromISO(dateISO, { zone: timezone }).set({
    hour: wsH,
    minute: wsM,
    second: 0,
    millisecond: 0,
  });
  const endDT = DateTime.fromISO(dateISO, { zone: timezone }).set({
    hour: weH,
    minute: weM,
    second: 0,
    millisecond: 0,
  });

  const busyIntervals = busyRanges
    .map((b) => {
      const s = DateTime.fromISO(b.start).setZone(timezone);
      const e = DateTime.fromISO(b.end).setZone(timezone);
      if (!s.isValid || !e.isValid) return null;
      return Interval.fromDateTimes(s, e);
    })
    .filter(Boolean) as Interval[];

  const slots: Array<{ startISO: string; endISO: string; label: string }> = [];

  let cursor = startDT;
  while (cursor.plus({ minutes: durationMinutes }) <= endDT) {
    const slotStart = cursor;
    const slotEnd = cursor.plus({ minutes: durationMinutes });

    const overlap = busyIntervals.some((bi) =>
      bi.overlaps(Interval.fromDateTimes(slotStart, slotEnd))
    );
    if (!overlap) {
      slots.push({
        startISO: slotStart.toISO(),
        endISO: slotEnd.toISO(),
        label: `${slotStart.toFormat("HH:mm")}-${slotEnd.toFormat("HH:mm")}`,
      });
    }
    cursor = cursor.plus({ minutes: durationMinutes });
  }

  return slots;
}
