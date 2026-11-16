import { validate } from 'class-validator';
import { IsCalendarDate, IsNotBefore } from './calendar-date.validators';

class Range {
  @IsCalendarDate()
  startDate?: string;

  @IsCalendarDate()
  @IsNotBefore('startDate')
  endDate?: string;
}

const errorsFor = async (startDate: unknown, endDate: unknown) => {
  const range = Object.assign(new Range(), { startDate, endDate });
  return (await validate(range)).map((error) => error.property);
};

describe('IsCalendarDate', () => {
  it('accepts a plain YYYY-MM-DD date', async () => {
    expect(await errorsFor('2026-11-16', '2026-11-16')).toEqual([]);
  });

  it.each([
    ['a full timestamp', '2026-11-16T23:00:00-05:00'],
    ['a date-time without zone', '2026-11-16T10:00'],
    ['an impossible day', '2026-02-30'],
    ['a two-digit year', '26-11-16'],
    ['text', 'mañana'],
  ])('rejects %s', async (_label, value) => {
    expect(await errorsFor(value, '2026-12-31')).toContain('startDate');
  });
});

describe('IsNotBefore', () => {
  it('rejects a range that ends before it starts', async () => {
    expect(await errorsFor('2026-11-16', '2026-11-15')).toEqual(['endDate']);
  });

  it('accepts a one-day range', async () => {
    expect(await errorsFor('2026-11-16', '2026-11-16')).toEqual([]);
  });

  it('leaves an open-ended range alone', async () => {
    const onlyEnd = Object.assign(new Range(), { endDate: '2026-11-16' });
    // Only IsCalendarDate on the missing start would complain; skip it
    // the way the DTOs do, with @IsOptional, by checking endDate alone.
    const errors = await validate(onlyEnd, { skipUndefinedProperties: true });
    expect(errors).toEqual([]);
  });
});
