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

export default router;
