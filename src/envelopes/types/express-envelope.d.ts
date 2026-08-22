import { Envelope } from '../entities/envelope.entity';

declare global {
  namespace Express {
    interface Request {
      envelope?: Envelope;
    }
  }
}
