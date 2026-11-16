import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { assertIsUUID } from 'src/common/utils/validation.utils';
import { ERROR_MESSAGES } from 'src/common/constants/error-messages';
import { PaymentMethodsService } from '../payment-methods.service';

/** Loads the payment method into `req.paymentMethod`; one owned by
 * someone else is a 404, the same as one that doesn't exist. */
@Injectable()
export class PaymentMethodExistsGuard implements CanActivate {
  constructor(private readonly service: PaymentMethodsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const { paymentMethodId } = req.params;
    assertIsUUID(paymentMethodId, 'paymentMethodId');

    const method = await this.service.findOne(paymentMethodId);
    if (method.userId !== req.user?.id) {
      throw new NotFoundException(ERROR_MESSAGES.PAYMENT_METHOD_NOT_FOUND);
    }

    req.paymentMethod = method;
    return true;
  }
}
