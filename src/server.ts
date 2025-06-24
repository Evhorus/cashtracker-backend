import express from 'express';
import colors from 'colors';
import morgan from 'morgan';
import { db } from './config/db';
import budgetRouter from './routes/budget.router';

async function connectDB() {
  try {
    await db.authenticate();
    db.sync();
    console.log(colors.blue.bold('Connected to the database successfully'));
  } catch (error) {
    // console.log(error);
    console.log(colors.red.bold('Failed to connect to the database'));
  }
}

connectDB();
const app = express();

app.use(morgan('dev'));

app.use(express.json());

app.use('/api/v1/budgets', budgetRouter);

export default app;
