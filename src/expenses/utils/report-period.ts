/** An inclusive range of calendar dates, both `YYYY-MM-DD`. */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/** `YYYY-MM`, already validated by the DTO. */
type Month = string;

function parseMonth(month: Month): { year: number; monthIndex: number } {
  const [year, monthNumber] = month.split('-').map(Number);
  return { year, monthIndex: monthNumber - 1 };
}

/** Day 0 of the next month is the last day of this one. UTC so the
 * server's timezone can never move a day. */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function toCalendarDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/** The day a card's statement closes in a given month: its cut day, or
 * the month's last day when the month is shorter. */
function cutDateIn(year: number, monthIndex: number, cutDay: number) {
  return Math.min(cutDay, daysInMonth(year, monthIndex));
}

export function calendarMonthRange(month: Month): DateRange {
  const { year, monthIndex } = parseMonth(month);
  return {
    startDate: toCalendarDate(year, monthIndex, 1),
    endDate: toCalendarDate(year, monthIndex, daysInMonth(year, monthIndex)),
  };
}

/**
 * The statement period that closes in `month`: from the day after the
 * previous month's cut to this month's cut. Cut 15 in October is
 * 16 Sep - 15 Oct, which is how the bank's statement reads.
 */
export function statementCycleRange(cutDay: number, month: Month): DateRange {
  const { year, monthIndex } = parseMonth(month);
  const previousCut = cutDateIn(year, monthIndex - 1, cutDay);
  return {
    // Date.UTC normalises month -1 to December of the previous year and
    // day N+1 past the end to the 1st of the next month.
    startDate: toCalendarDate(year, monthIndex - 1, previousCut + 1),
    endDate: toCalendarDate(
      year,
      monthIndex,
      cutDateIn(year, monthIndex, cutDay),
    ),
  };
}
