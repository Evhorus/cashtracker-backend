import { User } from '@clerk/backend';
import {
  createParamDecorator,
  InternalServerErrorException,
  type ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();

    const user = request?.user;

    if (!user) {
      throw new InternalServerErrorException('User not found (request)');
    }

    if (!data) {
      return user;
    }

    return user[data];
  },
);
