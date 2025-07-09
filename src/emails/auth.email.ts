import { transport } from '../config/nodemailer.config';

type EmailData = {
  name: string;
  email: string;
  token: string;
};

export class AuthEmail {
  static sendConfirmationEmail = async (emailData: EmailData) => {
    const email = await transport.sendMail({
      from: 'CashTracker <admin@cashtracker.com>',
      to: emailData.email,
      subject: 'CashTracker - Confirma tu cuenta',
      html: `
            <p>Hola: ${emailData.name}, has creado tu cuenta en CashTracker, ya esta casi lista</p>
            <p>Visita el siguiente enlace:</p>
            <a href="${process.env.FRONTEND_URL}/auth/confirm-account">Confirmar cuenta</a>
            <p>e ingresa el código: <b>${emailData.token}</b></p>`,
    });

    // console.log(`Email sent ${email.messageId}`);
  };

  static sendPasswordResetToken = async (emailData: EmailData) => {
    const email = await transport.sendMail({
      from: 'CashTracker <admin@cashtracker.com>',
      to: emailData.email,
      subject: 'CashTracker - Restablece tu password',
      html: `
            <p>Hola: ${emailData.name}, has solicitado restablecer tu password</p>
            <p>Visita el siguiente enlace:</p>
            <a href="${process.env.FRONTEND_URL}/auth/new-password">Restablecer password</a>
            <p>e ingresa el código: <b>${emailData.token}</b></p>`,
    });

    // console.log(`Email sent ${email.messageId}`);
  };
}
