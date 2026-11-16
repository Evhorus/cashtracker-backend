import { calendarMonthRange, statementCycleRange } from './report-period';

describe('calendarMonthRange', () => {
  it('spans the first to the last day of the month', () => {
    expect(calendarMonthRange('2026-10')).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
  });

  it('knows February in a leap year', () => {
    expect(calendarMonthRange('2028-02')).toEqual({
      startDate: '2028-02-01',
      endDate: '2028-02-29',
    });
  });
});

describe('statementCycleRange', () => {
  it('runs from the day after the previous cut to the cut in that month', () => {
    expect(statementCycleRange(15, '2026-10')).toEqual({
      startDate: '2026-09-16',
      endDate: '2026-10-15',
    });
  });

  it('crosses the year boundary for January', () => {
    expect(statementCycleRange(25, '2027-01')).toEqual({
      startDate: '2026-12-26',
      endDate: '2027-01-25',
    });
  });

  it('closes on the last day when the month is shorter than the cut day', () => {
    expect(statementCycleRange(31, '2026-02')).toEqual({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
  });

  it('starts the day after a short previous month closed early', () => {
    // February closed on the 28th (cut 30), so March starts on the 1st.
    expect(statementCycleRange(30, '2026-03')).toEqual({
      startDate: '2026-03-01',
      endDate: '2026-03-30',
    });
  });

  it('with a cut on the last day it is the calendar month', () => {
    expect(statementCycleRange(31, '2026-10')).toEqual(
      calendarMonthRange('2026-10'),
    );
  });
});
