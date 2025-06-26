import { Router } from 'express';
import { body, param } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { handleInputErrors } from '../middleware/validation.middleware';
import { limiter } from '../config/limiter';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(limiter);

router.post(
  '/create-account',
  body('name').notEmpty().withMessage('El nombre no puede ir vació'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('El password es muy corto, mínimo 8 caracteres'),
  body('email').isEmail().withMessage('E-mail no válido'),
  handleInputErrors,
  AuthController.createAccount,
);

router.post(
  '/confirm-account',
  body('token')
    .notEmpty()
    .isLength({ min: 6, max: 6 })
    .withMessage('Token no válido'),
  handleInputErrors,
  AuthController.confirmAccount,
);

router.post(
  '/login',
  body('email').isEmail().withMessage('E-mail no válido'),
  body('password').notEmpty().withMessage('El password es obligatorio'),
  handleInputErrors,
  AuthController.login,
);

router.post(
  '/forgot-password',
  body('email').isEmail().withMessage('E-mail no válido'),
  handleInputErrors,
  AuthController.forgotPassword,
);

router.post(
  '/validate-token',
  body('token')
    .notEmpty()
    .isLength({ min: 6, max: 6 })
    .withMessage('Token no válido'),
  handleInputErrors,
  AuthController.validateToken,
);

router.post(
  '/reset-password/:token',
  param('token')
    .notEmpty()
    .isLength({ min: 6, max: 6 })
    .withMessage('Token no válido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('El password es muy corto, mínimo 8 caracteres'),
  handleInputErrors,
  AuthController.resetPasswordWithToken,
);

router.post(
  '/update-password',
  authenticate,
  body('currentPassword')
    .notEmpty()
    .withMessage('El password actual no puede ir vació'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('El password nuevo es muy corto, mínimo 8 caracteres'),
  handleInputErrors,
  AuthController.updateCurrentPassword,
);

router.post(
  '/check-password',
  authenticate,
  body('password')
    .notEmpty()
    .withMessage('El password actual no puede ir vació'),
  handleInputErrors,
  AuthController.checkPassword,
);

router.get('/user', authenticate, AuthController.user);

export default router;
