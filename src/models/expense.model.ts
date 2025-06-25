import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import Budget from './budget.model';

@Table({
  tableName: 'expenses',
})
class Expense extends Model {
  @Column({
    type: DataType.STRING(100),
  })
  declare name: string;

  @Column({
    type: DataType.DECIMAL,
  })
  declare amount: number;

  @ForeignKey(() => Budget)
  declare budgetId: number;

  @BelongsTo(() => Budget)
  declare budget: Budget;
}

export default Expense;
