import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendPasswordResetEmail = async (toEmail: string, resetLink: string) => {
  const mailOptions = {
    from: `"Recyclemybin Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #0d9488; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">Recyclemybin</h1>
        </div>
        <div style="padding: 32px; background-color: white;">
          <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Reset Your Password</h2>
          <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">We received a request to reset the password for your account associated with this email address.</p>
          <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">Click the button below to securely reset your password. This link is valid for 15 minutes.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Recyclemybin. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[EmailService] Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};
