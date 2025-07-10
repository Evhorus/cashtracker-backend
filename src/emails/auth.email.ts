import { transport } from '../config/nodemailer.config';

type EmailData = {
  name: string;
  email: string;
  token: string;
};


export class AuthEmail {
  static sendConfirmationEmail = async (emailData: EmailData) => {
    await transport.sendMail({
      from: 'CashTracker <admin@cashtracker.com>',
      to: emailData.email,
      subject: 'CashTracker - Confirma tu cuenta',
      html: `
        <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px;">
          <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 32px;">
            <h2 style="color: #2d3748;">¡Bienvenido a CashTracker, ${emailData.name}!</h2>
            <p style="color: #4a5568;">Gracias por registrarte. Tu cuenta está casi lista.</p>
            <p style="color: #4a5568;">Haz clic en el siguiente botón para confirmar tu cuenta:</p>
            <a href="${process.env.FRONTEND_URL}/auth/confirm-account?email_verification_token=${emailData.token}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #38a169; color: #fff; border-radius: 4px; text-decoration: none; font-weight: bold;">Confirmar cuenta</a>
            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 0.9em; color: #a0aec0;">Si no creaste esta cuenta, puedes ignorar este correo.</p>
          </div>
        </div>
      `,
    });
  };

  static sendPasswordResetToken = async (emailData: EmailData) => {
    await transport.sendMail({
      from: 'CashTracker <admin@cashtracker.com>',
      to: emailData.email,
      subject: 'CashTracker - Restablece tu password',
      html: `
        <div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 32px;">
          <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 32px;">
            <h2 style="color: #2d3748;">Hola, ${emailData.name}</h2>
            <p style="color: #4a5568;">Has solicitado restablecer tu contraseña.</p>
            <p style="color: #4a5568;">Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <a href="${process.env.FRONTEND_URL}/auth/new-password" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #3182ce; color: #fff; border-radius: 4px; text-decoration: none; font-weight: bold;">Restablecer contraseña</a>
            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 0.9em; color: #a0aec0;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
        </div>
      `,
    });
  };
}
