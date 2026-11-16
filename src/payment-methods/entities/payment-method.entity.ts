import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PaymentMethodType } from '../constants/payment-method-types';

/**
 * What an expense was paid with (a card, cash, a transfer). Owned by one
 * user, like their categories, and optional on every expense: someone
 * who never creates one sees the app exactly as before.
 */
@Entity()
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  type: PaymentMethodType;

  /** oklch() string from the shared PRESET_COLORS whitelist. */
  @Column()
  color: string;

  /** Day of the month the card's statement closes (credit cards only),
   * so a statement period can be filtered as one range. */
  @Column({ type: 'smallint', nullable: true })
  cutDay: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
