import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Envelope } from '../../envelopes/entities/envelope.entity';
import { PaymentMethod } from '../../payment-methods/entities/payment-method.entity';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Envelope, (envelope) => envelope.expenses, {
    onDelete: 'CASCADE',
  })
  envelope: Envelope | null;

  @Column()
  envelopeId: string;

  /** What it was paid with - optional; `SET NULL` when the payment
   * method is deleted, so the expense itself is never lost. */
  @ManyToOne(() => PaymentMethod, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentMethodId' })
  paymentMethod?: PaymentMethod | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  paymentMethodId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
