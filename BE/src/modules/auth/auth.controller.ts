/**
 * Auth Module - Controller
 * Handles authentication logic: register, login, logout
 */

import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { sendPasswordResetEmail } from '../../lib/mailer';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 255;

// REG-015/016, LOG-017/018: strip dangerous HTML/script content
function sanitizeInput(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/['"`;]/g, '').trim();
}

// LOG-010: in-memory failed login tracking (userId → {count, lockedUntil})
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginLock(email: string): boolean {
  const entry = loginAttempts.get(email);
  if (!entry) return false;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) return true;
  // Lock expired — reset
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    loginAttempts.delete(email);
  }
  return false;
}

function recordFailedAttempt(email: string) {
  const entry = loginAttempts.get(email) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }
  loginAttempts.set(email, entry);
}

function clearLoginAttempts(email: string) {
  loginAttempts.delete(email);
}

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

      // REG-010: trim trước mọi validation
      const email = (req.body.email || '').trim().toLowerCase();
      const name = (req.body.name || '').trim();
      const password = req.body.password || '';

      // REG-003: name bắt buộc
      if (!name) {
        return res.status(400).json({ error: 'Họ và tên là bắt buộc' });
      }
      // REG-012: max length
      if (name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: `Họ và tên không được vượt quá ${MAX_NAME_LENGTH} ký tự` });
      }

      // REG-004: email bắt buộc
      if (!email) {
        return res.status(400).json({ error: 'Email là bắt buộc' });
      }
      // REG-005,020: định dạng email
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Email không hợp lệ' });
      }

      // REG-006: password bắt buộc
      if (!password) {
        return res.status(400).json({ error: 'Mật khẩu là bắt buộc' });
      }
      // REG-009: min 8 chars
      if (password.length < 8) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' });
      }
      // REG-007: complexity
      if (!/(?=.*[A-Za-z])(?=.*[\d@$!%*#?&])/.test(password)) {
        return res.status(400).json({ error: 'Mật khẩu phải gồm chữ cái và ít nhất 1 số hoặc ký tự đặc biệt' });
      }

      // REG-016: sanitize XSS
      const safeName = sanitizeInput(name);

      // REG-002: email đã tồn tại
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        console.warn('⚠️ Email already exists:', email);
        return res.status(409).json({ error: 'Email đã tồn tại' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user — REG-013: Unicode name supported by PostgreSQL
      const user = await prisma.user.create({
        data: {
          email,
          name: safeName,
          password: hashedPassword,
          role: 'USER',
          level: 'NEWBIE',
        },
      });

      console.log('✅ User created:', user.id);

      // Create user stats
      await prisma.userStats.create({
        data: { userId: user.id, xp: 0, trophy: 0 },
      });

      // Generate token
      const token = generateToken(user.id, user.email, user.role);

      return res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        user: { id: user.id, email: user.email, name: user.name },
        token,
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({ error: 'Đăng ký thất bại. Vui lòng thử lại.' });
    }
  }

  /**
   * Check if email is already registered (public endpoint for real-time FE validation)
   * GET /auth/check-email?email=...
   */
  static async checkEmail(req: Request, res: Response) {
    const rawEmail = ((req.query.email as string) || '').trim().toLowerCase();
    if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }
    const existing = await prisma.user.findUnique({
      where: { email: rawEmail },
      select: { id: true },
    });
    return res.json({ taken: !!existing });
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response) {
    try {
      console.log('🔑 LOGIN REQUEST:', req.body.email);

      // LOG-011: trim email
      const email = (req.body.email || '').trim().toLowerCase();
      const password = req.body.password || '';

      // LOG-004/005/006: validate
      if (!email) {
        return res.status(400).json({ error: 'Email là bắt buộc' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Mật khẩu là bắt buộc' });
      }
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Email không hợp lệ' });
      }

      // LOG-010: kiểm tra tài khoản có đang bị khóa tạm thời không
      if (checkLoginLock(email)) {
        console.warn('⛔ Account locked (too many attempts):', email);
        return res.status(429).json({ error: 'Tài khoản bị khóa tạm thời do nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
      }

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        recordFailedAttempt(email);
        console.warn('⚠️ User not found:', email);
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
      }

      // LOG-009: tài khoản bị ban bởi admin
      if (user.isBanned) {
        console.warn('⛔ Banned user tried to login:', email);
        return res.status(403).json({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.' });
      }

      // Verify password — LOG-002: sai mật khẩu
      // Guard: Google-only accounts have no usable password
      if (!user.password) {
        return res.status(401).json({ error: 'Tài khoản này đăng nhập bằng Google. Vui lòng dùng nút Đăng nhập với Google.' });
      }
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        recordFailedAttempt(email);
        const entry = loginAttempts.get(email);
        const remaining = entry ? MAX_ATTEMPTS - entry.count : 0;
        console.warn('⚠️ Password mismatch for:', email, '| remaining attempts:', remaining);
        if (entry && entry.lockedUntil) {
          return res.status(429).json({ error: 'Tài khoản bị khóa tạm thời do nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
        }
        return res.status(401).json({
          error: 'Email hoặc mật khẩu không đúng',
          remainingAttempts: Math.max(0, remaining),
        });
      }

      // Đăng nhập thành công — xóa failed attempts
      clearLoginAttempts(email);

      const token = generateToken(user.id, user.email, user.role);
      console.log('✅ User logged in:', user.id);

      return res.json({
        success: true,
        message: 'Đăng nhập thành công',
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
      return res.status(500).json({ error: 'Hệ thống tạm thời gặp sự cố. Vui lòng thử lại.' });
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
          provider: user.provider,
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
      if (!user.password) {
        return res.status(400).json({ error: 'Tài khoản này đăng nhập bằng Google và không có mật khẩu.' });
      }
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
      if (!user.password) return res.status(400).json({ error: 'Tài khoản này đăng nhập bằng Google và không có mật khẩu.' });

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) return res.status(401).json({ error: 'Current password is incorrect' });

      return res.json({ success: true });
    } catch (error) {
      console.error('❌ Verify password error:', error);
      return res.status(500).json({ error: 'Failed to verify password' });
    }
  }

  /**
   * POST /auth/forgot-password
   * Creates a reset token and returns it (in prod this would be emailed).
   * For dev: returns the token directly in the response.
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();

      if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Email không hợp lệ' });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      // Always return 200 to prevent email enumeration
      if (!user) {
        return res.json({ success: true, message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.' });
      }

      // Invalidate any existing tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      // Generate a secure random token
      const crypto = await import('crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          token: rawToken,
          userId: user.id,
          expiresAt,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
      console.log(`🔑 Reset token generated for user ${user.id}`);

      // Send email via Gmail SMTP
      const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

      if (smtpConfigured) {
        await sendPasswordResetEmail(user.email, resetUrl);
        console.log(`📧 Password reset email sent to ${user.email}`);
        return res.json({
          success: true,
          message: 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.',
        });
      } else {
        // Fallback for dev: expose link directly
        console.warn('⚠️  SMTP chưa cấu hình — trả về resetUrl (dev mode)');
        return res.json({
          success: true,
          message: 'Liên kết đặt lại mật khẩu đã được tạo (dev mode).',
          resetToken: rawToken,
          resetUrl,
        });
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      return res.status(500).json({ error: 'Hệ thống gặp sự cố. Vui lòng thử lại.' });
    }
  }

  /**
   * POST /auth/reset-password
   * Validates token and sets new password.
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token không hợp lệ' });
      }
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' });
      }
      if (!/(?=.*[A-Za-z])(?=.*[\d@$!%*#?&])/.test(newPassword)) {
        return res.status(400).json({ error: 'Mật khẩu phải gồm chữ cái và ít nhất 1 số hoặc ký tự đặc biệt' });
      }

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!resetToken) {
        return res.status(400).json({ error: 'Liên kết đặt lại mật khẩu không hợp lệ' });
      }
      if (resetToken.used) {
        return res.status(400).json({ error: 'Liên kết này đã được sử dụng' });
      }
      if (resetToken.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Liên kết đặt lại mật khẩu đã hết hạn' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and mark token as used — atomically
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true },
        }),
      ]);

      // Clear login attempts in case user was locked out
      clearLoginAttempts(resetToken.user.email);

      console.log(`✅ Password reset for user ${resetToken.userId}`);
      return res.json({ success: true, message: 'Mật khẩu đã được đặt lại thành công.' });
    } catch (error) {
      console.error('❌ Reset password error:', error);
      return res.status(500).json({ error: 'Hệ thống gặp sự cố. Vui lòng thử lại.' });
    }
  }

  /**
   * GET /auth/verify-reset-token?token=...
   * Check if a reset token is still valid (for FE to know before showing form).
   */
  static async verifyResetToken(req: Request, res: Response) {
    try {
      const token = (req.query.token as string || '').trim();
      if (!token) return res.status(400).json({ valid: false, error: 'Token thiếu' });

      const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        return res.json({ valid: false });
      }
      return res.json({ valid: true });
    } catch (error) {
      return res.status(500).json({ valid: false, error: 'Lỗi hệ thống' });
    }
  }

  /**
   * POST /auth/google-login
   * Verify Google access_token via Google userinfo endpoint, create/find user, return JWT.
   * FE sends: { accessToken: string }
   */
  static async googleLogin(req: Request, res: Response) {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({ error: 'Google access token bị thiếu' });
      }

      // Validate the access_token by calling Google’s userinfo endpoint
      const googleRes = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!googleRes.ok) {
        return res.status(401).json({ error: 'Token Google không hợp lệ' });
      }

      const googleUser = await googleRes.json() as {
        sub: string;
        email: string;
        email_verified: boolean;
        name: string;
        picture?: string;
      };

      if (!googleUser.email_verified) {
        return res.status(401).json({ error: 'Email Google chưa được xác minh' });
      }

      const { sub: googleId, email, name, picture } = googleUser;

      // Find existing user by Google providerId OR email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { providerId: googleId },
            { email: email.toLowerCase() },
          ],
        },
      });

      if (user) {
        // If found by email but not yet linked → link the Google account
        if (!user.providerId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: 'google',
              providerId: googleId,
              avatar: user.avatar || picture || null,
            },
          });
        }
      } else {
        // Auto-register new Google user — generate a random non-guessable password
        const crypto = await import('crypto');
        const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            password: randomPassword,
            provider: 'google',
            providerId: googleId,
            avatar: picture || null,
            role: 'USER',
            level: 'CỰC_CƠ_BẢN',
          },
        });
      }

      if (user.isBanned) {
        return res.status(403).json({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.' });
      }

      const token = generateToken(user.id, user.email, user.role);
      console.log(`✅ Google login: user ${user.id} (${user.email})`);

      return res.json({
        token,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        level: user.level,
        levelLocked: user.levelLocked,
        xp: user.totalXP,
        trophy: user.totalTrophy,
        avatar: user.avatar,
        provider: user.provider,
      });
    } catch (error) {
      console.error('❌ Google login error:', error);
      return res.status(500).json({ error: 'Đăng nhập Google thất bại. Vui lòng thử lại.' });
    }
  }
}
