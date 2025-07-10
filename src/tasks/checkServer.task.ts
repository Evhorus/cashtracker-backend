import nodeCron from 'node-cron';

export function checkServer() {
  nodeCron.schedule('*/40 * * * * *', async () => {
    try {
      await fetch(process.env.API_URL);
      console.log('Server is alive');
    } catch (error) {
      console.error('Error al hacer ping a /:', error);
    }
  });
}
