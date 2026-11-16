import { PaymentMethod } from '../entities/payment-method.entity';
import type { PaymentMethodType } from '../constants/payment-method-types';

export class PaymentMethodResponseDto {
  id: string;
  name: string;
  type: PaymentMethodType;
  color: string;
  cutDay: number | null;

  static fromEntity(method: PaymentMethod): PaymentMethodResponseDto {
    return {
      id: method.id,
      name: method.name,
      type: method.type,
      color: method.color,
      cutDay: method.cutDay,
    };
  }

  static fromEntities(methods: PaymentMethod[]): PaymentMethodResponseDto[] {
    return methods.map((method) => this.fromEntity(method));
  }
}

/** The payment method embedded in an expense response, or null. */
export class ExpensePaymentMethodDto {
  id: string;
  name: string;
  color: string;

  static fromEntity(
    method?: PaymentMethod | null,
  ): ExpensePaymentMethodDto | null {
    if (!method) return null;
    return { id: method.id, name: method.name, color: method.color };
  }
}
