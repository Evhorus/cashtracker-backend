import { applyDecorators, UseGuards } from '@nestjs/common';
import { PaymentMethodExistsGuard } from '../guard/payment-method-exists.guard';

export function PaymentMethodExists() {
  return applyDecorators(UseGuards(PaymentMethodExistsGuard));
}
