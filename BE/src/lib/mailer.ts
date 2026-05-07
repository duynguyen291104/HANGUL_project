import nodemailer from 'nodemailer';

/**
 * Creates a reusable Nodemailer transporter using Gmail SMTP.
 * Requires env vars: SMTP_USER, SMTP_PASS
 * Optional: SMTP_FROM (defaults to SMTP_USER)
 */
function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('SMTP_USER và SMTP_PASS chưa được cấu hình trong .env');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for port 465, false for 587 (STARTTLS)
    auth: { user, pass },
  });
}

const FROM_ADDRESS =
  () => process.env.SMTP_FROM || `HANGUL <${process.env.SMTP_USER}>`;

/**
 * Send a password-reset email.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string,
  expiresInMinutes = 60,
): Promise<void> {
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Đặt lại mật khẩu – HANGUL</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(43,22,15,0.08);">

          <!-- Header -->
          <tr>
            <td align="center"
                style="background:linear-gradient(135deg,#72564c,#8d6e63);
                       padding:36px 40px 28px;">
              <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:900;
                         letter-spacing:-1px;text-transform:uppercase;">
                HANGUL
              </h1>
              <p style="margin:6px 0 0;color:#f0e8e3;font-size:14px;">
                Nền tảng học tiếng Hàn của bạn
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <h2 style="margin:0 0 12px;color:#72564c;font-size:22px;font-weight:700;">
                Đặt lại mật khẩu
              </h2>
              <p style="margin:0 0 20px;color:#504441;font-size:15px;line-height:1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này.
                Nhấn vào nút bên dưới để tiến hành.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center"
                      style="background:linear-gradient(135deg,#72564c,#8d6e63);
                             border-radius:50px;padding:0;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 36px;
                              color:#ffffff;font-size:16px;font-weight:700;
                              text-decoration:none;border-radius:50px;
                              letter-spacing:0.3px;">
                      Đặt lại mật khẩu
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#827470;font-size:13px;line-height:1.6;">
                Hoặc copy đường link này vào trình duyệt:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#72564c;font-size:12px;">${resetUrl}</a>
              </p>

              <!-- Warning -->
              <div style="background:#fff8f0;border-left:4px solid #e6ae8c;
                          border-radius:6px;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0;color:#815300;font-size:13px;line-height:1.5;">
                  ⚠️ Liên kết chỉ có hiệu lực trong <strong>${expiresInMinutes} phút</strong>
                  và chỉ sử dụng được một lần.
                  Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.
                </p>
              </div>

              <p style="margin:0;color:#827470;font-size:13px;line-height:1.6;">
                Vì lý do bảo mật, chúng tôi không bao giờ hỏi mật khẩu của bạn qua email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f0ee;padding:20px 40px;border-top:1px solid #e8dcd4;">
              <p style="margin:0;color:#aaa09e;font-size:12px;text-align:center;line-height:1.6;">
                © ${new Date().getFullYear()} HANGUL. Nền tảng học tiếng Hàn dành cho người Việt.<br/>
                Bạn nhận được email này vì ai đó đã yêu cầu đặt lại mật khẩu với địa chỉ ${toEmail}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  await transporter.sendMail({
    from: FROM_ADDRESS(),
    to: toEmail,
    subject: 'Đặt lại mật khẩu HANGUL',
    html,
    text: `Đặt lại mật khẩu HANGUL\n\nNhấn vào liên kết sau để đặt lại mật khẩu (hiệu lực ${expiresInMinutes} phút):\n${resetUrl}\n\nNếu bạn không yêu cầu điều này, hãy bỏ qua email này.`,
  });
}
