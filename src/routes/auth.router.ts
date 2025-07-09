import { Router } from 'express';
import { body, param } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { handleInputErrors } from '../middleware/validation.middleware';
import { limiter } from '../config/limiter.config';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(limiter);

router.post(
  '/create-account',
  body('name').notEmpty().withMessage('Name cannot be empty'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password is too short, minimum 8 characters'),
  body('email').isEmail().withMessage('Invalid email'),
  handleInputErrors,
  AuthController.createAccount,
);

router.post(
  '/confirm-account',
  body('token').isLength({ min: 6, max: 6 }).withMessage('Invalid token'),
  handleInputErrors,
  AuthController.confirmAccount,
);

router.post(
  '/login',
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleInputErrors,
  AuthController.login,
);

router.post(
  '/forgot-password',
  body('email').isEmail().withMessage('Invalid email'),
  handleInputErrors,
  AuthController.forgotPassword,
);

router.post(
  '/validate-token',
  body('token')
    .notEmpty()
    .isLength({ min: 6, max: 6 })
    .withMessage('Invalid token'),
  handleInputErrors,
  AuthController.validateToken,
);

router.post(
  '/reset-password/:token',
  param('token')
    .notEmpty()
    .isLength({ min: 6, max: 6 })
    .withMessage('Invalid token'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password is too short, minimum 8 characters'),
  handleInputErrors,
  AuthController.resetPasswordWithToken,
);

router.post(
  '/update-password',
  authenticate,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password cannot be empty'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('New password is too short, minimum 8 characters'),
  handleInputErrors,
  AuthController.updateCurrentPassword,
);

router.post(
  '/check-password',
  authenticate,
  body('password').notEmpty().withMessage('Current password cannot be empty'),
  handleInputErrors,
  AuthController.checkPassword,
);

router.get('/user', authenticate, AuthController.user);
router.put(
  '/user',
  authenticate,
  body('name').notEmpty().withMessage('Name cannot be empty'),
  body('email').isEmail().withMessage('Invalid email'),
  handleInputErrors,
  AuthController.updateUser,
);

export default router;
