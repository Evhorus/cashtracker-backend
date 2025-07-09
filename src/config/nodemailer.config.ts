import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

type TransportOptions = {
  auth: Auth;
  service?: string;
  host?: string;
  port?: number;
};
type Auth = {
  user: string;
  pass: string;
};

const configDev = (): TransportOptions => {
  return {
    host: process.env.EMAIL_HOST,
    port: +process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };
};

const configProd = (): TransportOptions => {
  return {
    service: process.env.MAILER_SERVICE,
    auth: {
      user: process.env.MAILER_EMAIL,
      pass: process.env.MAILER_SECRET_KEY,
    },
  };
};

const config = process.env.NODE_ENV === 'production' ? configProd : configDev;

export const transport = nodemailer.createTransport(config());
