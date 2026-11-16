import { PaymentMethod } from '../entities/payment-method.entity';

declare global {
  namespace Express {
    interface Request {
      paymentMethod?: PaymentMethod;
    }
  }
}
