import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expense } from '../../expenses/entities/expense.entity';

@Entity()
export class Envelope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  currency: string;

  @Column({ type: 'decimal', nullable: true })
  amount: number | null;

  @Column({ type: 'decimal' })
  spent: number;

  @Column()
  @Index() // Add index for performance
  userId: string;

  @Column({ type: 'text', nullable: true })
  category?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Expense, (expense) => expense.envelope, {
    cascade: true,
  })
  expenses: Expense[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
