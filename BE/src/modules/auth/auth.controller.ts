/**
 * Auth Module - Controller
 * Handles authentication logic: register, login, logout
 */

import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';

const generateToken = (userId: string | number, email: string, role: string) => {
  const secret = (process.env.JWT_SECRET || 'secret') as jwt.Secret;
  return jwt.sign(
    { id: userId, email, role },
    secret,
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

export class AuthController {
  /**
   * Register new user
   */
  static async register(req: Request, res: Response) {
    try {
      console.log('📝 REGISTER REQUEST BODY:', req.body);

      const { email, name, password } = req.body;

      // Validate input
      if (!email || !name || !password) {
        console.warn('⚠️ Missing required fields:', { email: !!email, name: !!name, password: !!password });
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
      if (!hasUppercase || !hasNumber || !hasSpecialChar) {
        return res.status(400).json({
          error: 'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt',
        });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        console.warn('⚠️ Email already exists:', email);
        return res.status(409).json({ error: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('✓ Password hashed successfully');

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'USER',
          level: 'NEWBIE',
        },
      });

      console.log('✅ User created:', user.id);

      // Create user stats
      await prisma.userStats.create({
        data: {
          userId: user.id,
          xp: 0,
          trophy: 0,
        },
      });

      // Generate token
      const token = generateToken(user.id, user.email, user.role);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: { id: user.id, email: user.email, name: user.name },
        token,
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response) {
    try {
      console.log('🔑 LOGIN REQUEST:', req.body.email);

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.warn('⚠️ User not found:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        console.warn('⚠️ Password mismatch for:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is banned
      if (user.isBanned) {
        console.warn('⛔ Banned user tried to login:', email);
        return res.status(403).json({ error: 'Account suspended. Please contact support.' });
      }

      // Generate token
      const token = generateToken(user.id, user.email, user.role);

      console.log('✅ User logged in:', user.id);

      return res.json({
        success: true,
        message: 'Login successful',
        userId: user.id,
        email: user.email,
        name: user.name,
        level: user.level,
        levelLocked: user.levelLocked || false,
        role: user.role,
        xp: user.totalXP || 0,
        trophy: user.totalTrophy || 0,
        token,
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Get current user (from JWT)
   */
  static async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          level: user.level,
          xp: user.totalXP,
          trophy: user.totalTrophy,
        },
      });
    } catch (error) {
      console.error('❌ Get user error:', error);
      return res.status(500).json({ error: 'Failed to get user' });
    }
  }

  /**
   * Update user level
   */
  static async updateLevel(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { level } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!level) {
        return res.status(400).json({ error: 'Level is required' });
      }

      const validLevels = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: 'Invalid level' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { level },
        select: {
          id: true,
          level: true,
          levelLocked: true,
        },
      });

      console.log(`✅ Level updated for user ${userId}: ${level}`);
      return res.json({ success: true, message: 'Level updated successfully', level: user.level, levelLocked: user.levelLocked });
    } catch (error) {
      console.error('❌ Update level error:', error);
      return res.status(500).json({ error: 'Failed to update level' });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Validate input
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check password match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New passwords do not match' });
      }

      // Check password length
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      console.log(`✅ Password changed for user ${userId}`);
      return res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('❌ Change password error:', error);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  }

  static async verifyPassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { currentPassword } = req.body;

      if (!userId) return res.status(401).json({ error: 'User not authenticated' });
      if (!currentPassword) return res.status(400).json({ error: 'currentPassword is required' });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) return res.status(401).json({ error: 'Current password is incorrect' });

      return res.json({ success: true });
    } catch (error) {
      console.error('❌ Verify password error:', error);
      return res.status(500).json({ error: 'Failed to verify password' });
    }
  }
}
