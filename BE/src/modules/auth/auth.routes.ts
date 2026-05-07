/**
 * Auth Module - Routes
 * Routes for authentication
 */

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// POST /auth/register - Register new user
router.post('/register', AuthController.register);

// GET /auth/check-email?email=... - Check if email is already taken (public)
router.get('/check-email', AuthController.checkEmail);

// POST /auth/login - Login user
router.post('/login', AuthController.login);

// GET /auth/me - Get current user (requires auth)
router.get('/me', authenticate, AuthController.getCurrentUser);

// PUT /auth/update-level - Update user level (requires auth)
router.put('/update-level', authenticate, AuthController.updateLevel);

// POST /auth/verify-password - Verify current password (requires auth)
router.post('/verify-password', authenticate, AuthController.verifyPassword);

// POST /auth/change-password - Change password (requires auth)
router.post('/change-password', authenticate, AuthController.changePassword);

// POST /auth/forgot-password - Request password reset token (public)
router.post('/forgot-password', AuthController.forgotPassword);

// GET /auth/verify-reset-token?token=... - Check token validity (public)
router.get('/verify-reset-token', AuthController.verifyResetToken);

// POST /auth/reset-password - Set new password using token (public)
router.post('/reset-password', AuthController.resetPassword);

// POST /auth/google-login - Verify Google id_token, return JWT (public)
router.post('/google-login', AuthController.googleLogin);

export default router;
