import { exit } from 'node:process';
import { db } from '../config/db.config';

const clearData = async () => {
  try {
    await db.sync({ force: true });
    console.log('Data deleted successfully');
    exit(0);
  } catch (error) {
    // console.log(error)
    exit(1);
  }
};

if (process.argv[2] === '--clear') {
  clearData();
}
