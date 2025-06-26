import {
  Table,
  Column,
  DataType,
  HasMany,
  Model,
  AllowNull,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import Expense from './expense.model';
import User from './user.model';

@Table({
  tableName: 'budgets',
})
class Budget extends Model {
  @AllowNull(false)
  @Column({
    type: DataType.STRING(100),
  })
  declare name: string;

  @AllowNull(false)
  @Column({
    type: DataType.DECIMAL,
  })
  declare amount: number;

  @HasMany(() => Expense, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  declare expenses: Expense[];

  @ForeignKey(() => User)
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;
}

export default Budget;
