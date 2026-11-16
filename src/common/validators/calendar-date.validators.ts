import { applyDecorators } from '@nestjs/common';
import {
  IsISO8601,
  Matches,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import { ERROR_MESSAGES } from '../constants/error-messages';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A calendar date as `YYYY-MM-DD` - nothing more.
 *
 * `@IsDateString()` alone also accepts full timestamps
 * (`2026-11-16T23:00:00-05:00`), which Postgres then casts to a `date`
 * in its own timezone and can move to the next or previous day. The
 * strict ISO check is what rejects impossible days like 2026-02-30.
 */
export function IsCalendarDate(validationOptions?: ValidationOptions) {
  return applyDecorators(
    Matches(CALENDAR_DATE, {
      message: ERROR_MESSAGES.INVALID_DATE_FORMAT,
      ...validationOptions,
    }),
    IsISO8601(
      { strict: true },
      { message: ERROR_MESSAGES.INVALID_DATE_FORMAT, ...validationOptions },
    ),
  );
}

/**
 * The end of a range may not fall before its start (`property`). A
 * reversed range used to be accepted and silently matched nothing.
 * Either side missing is left to the other validators. `YYYY-MM-DD`
 * strings compare correctly as plain strings.
 */
export function IsNotBefore(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isNotBefore',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: {
        message: ERROR_MESSAGES.INVALID_DATE_RANGE,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [startProperty] = args.constraints as [string];
          const start = (args.object as Record<string, unknown>)[startProperty];
          if (typeof value !== 'string' || typeof start !== 'string') {
            return true;
          }
          return value >= start;
        },
      },
    });
  };
}
