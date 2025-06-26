import type { Request, Response } from 'express';
import User from '../models/user.model';
import { checkPassword, hashPassword } from '../utils/auth';
import { generateToken } from '../utils/token';
import { AuthEmail } from '../emails/auth.email';
import { generateJWT } from '../utils/jwt';

export class AuthController {
  static createAccount = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      //Prevent duplicates
      const userExists = await User.findOne({ where: { email } });

      if (userExists) {
        const error = new Error(`A user with email ${email} already exists`);
        res.status(409).json({ error: error.message });
        return;
      }

      const user = new User(req.body);

      user.password = await hashPassword(password);
      user.token = generateToken();
      await user.save();

      await AuthEmail.sendConfirmationEmail({
        name: user.name,
        email: user.email,
        token: user.token,
      });
      res.json('Account created successfully');
    } catch (error) {
      // console.log(error)
      res.status(500).json({ error: 'There was an error' });
    }
  };

  static confirmAccount = async (req: Request, res: Response) => {
    const { token } = req.body;

    const user = await User.findOne({ where: { token } });

    if (!user) {
      const error = new Error('user not found');
      res.status(401).json({ error: error.message });
      return;
    }

    user.confirmed = true;
    user.token = null;

    await user.save();

    res.json('Account confirmed SuccessFully');
  };

  static login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      const error = new Error(`A user with email ${email} not found`);
      res.status(404).json({ error: error.message });
      return;
    }

    if (!user.confirmed) {
      const error = new Error(`The Account has not been confirmed`);
      res.status(403).json({ error: error.message });
      return;
    }

    const isPasswordCorrect = await checkPassword(password, user.password);

    if (!isPasswordCorrect) {
      const error = new Error(`password or email wrong`);
      res.status(401).json({ error: error.message });
      return;
    }

    const token = generateJWT(user.id);

    res.json(token);
  };

  static forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      const error = new Error(`A user with email ${email} not found`);
      res.status(404).json({ error: error.message });
      return;
    }

    user.token = generateToken();
    await user.save();

    await AuthEmail.sendPasswordResetToken({
      name: user.name,
      email: user.email,
      token: user.token,
    });

    res.json('Check your email for instructions');
  };

  static validateToken = async (req: Request, res: Response) => {
    const { token } = req.body;

    const tokenExists = await User.findOne({ where: { token } });

    if (!tokenExists) {
      const error = new Error('Invalid token');
      res.status(404).json({ error: error.message });
      return;
    }

    res.json('Valid Token');

    console.log(token);
  };

  static resetPasswordWithToken = async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({ where: { token } });

    if (!user) {
      const error = new Error('Invalid token');
      res.status(404).json({ error: error.message });
      return;
    }

    user.password = await hashPassword(password);
    user.token = null;

    await user.save();

    res.json('Password updated successfully');
  };

  static updateCurrentPassword = async (req: Request, res: Response) => {
    const { currentPassword, password } = req.body;

    const { id } = req.user;

    const user = await User.findByPk(id);

    const isPasswordCorrect = await checkPassword(
      currentPassword,
      user.password,
    );

    if (!isPasswordCorrect) {
      const error = new Error('The current password is incorrect');
      res.status(401).json({ error: error.message });
      return;
    }

    user.password = await hashPassword(password);
    await user.save();
    res.json('Password updated successfully');
  };

  static checkPassword = async (req: Request, res: Response) => {
    const { id } = req.user;
    const { password } = req.body;
    const user = await User.findByPk(id);

    const isPasswordCorrect = await checkPassword(password, user.password);

    if (!isPasswordCorrect) {
      const error = new Error('The current password is incorrect');
      res.status(401).json({ error: error.message });
      return;
    }

    res.json('Correct password');
  };

  static user = async (req: Request, res: Response) => {
    res.json(req.user);
  };
}
