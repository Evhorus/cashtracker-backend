import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Expense } from '../../expenses/entities/expense.entity';
import { Category } from '../../categories/entities/category.entity';

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

  /**
   * A real relation, not the free text this used to be. As text, renaming
   * a category silently detached every envelope using it: the envelope
   * kept the old string, stopped resolving to any category, and the
   * renamed category's own count dropped to zero. See migration
   * 1787950000000-envelope_category_fk.
   *
   * `SET NULL` on delete: an envelope outlives its category, it just
   * stops being classified.
   */
  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: Category | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  categoryId?: string | null;

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
