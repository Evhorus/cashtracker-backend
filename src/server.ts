import express from 'express';
import colors from 'colors';
import morgan from 'morgan';
import { db } from './config/db.config';
import budgetRouter from './routes/budget.router';
import authRouter from './routes/auth.router';
import { checkServer } from './tasks/checkServer.task';

export async function connectDB() {
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

app.get('/api', (req, res) => {
  res.send('Welcome to CashTracker API');
});

app.use('/api/v1/budgets', budgetRouter);
app.use('/api/v1/auth', authRouter);

app.get('/', (req, res) => {
  res.send('All good');
});

checkServer();

export default app;
