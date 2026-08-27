import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable: NULL means a global category, shared read-only by every
  // user (the 9 predefined ones - seeded once as data, not per-user - see
  // migration 1787942400000-make-category-userid-nullable). Only ever set
  // by CategoriesService.create, never by an update - a category's
  // ownership doesn't change after creation.
  @Column({ nullable: true, type: 'varchar' })
  @Index() // Add index for performance
  userId: string | null;

  @Column()
  label: string;

  @Column()
  color: string;

  @Column()
  icon: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
