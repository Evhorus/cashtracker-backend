import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expense } from './expense.entity';

@Entity()
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal' })
  amount: number;

  @Column({ type: 'decimal' })
  spent: number;

  @Column()
  @Index() // Add index for performance
  userId: string;

  @Column({ type: 'text', nullable: true })
  category?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Expense, (expense) => expense.budget, {
    cascade: true,
  })
  expenses: Expense[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
