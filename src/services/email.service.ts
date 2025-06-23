import nodemailer from 'nodemailer';
import { IUser } from '../models/user.model';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface FriendRequestEmailData {
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  acceptUrl?: string;
  rejectUrl?: string;
}

export interface InvitationEmailData {
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      // Check if email configuration is available
      const emailHost = process.env.EMAIL_HOST;
      const emailPort = process.env.EMAIL_PORT;
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;

      if (!emailHost || !emailPort || !emailUser || !emailPass) {
        console.warn('⚠️  Email configuration not found. Email notifications will be disabled.');
        console.warn('   To enable email notifications, set these environment variables:');
        console.warn('   - EMAIL_HOST (e.g., smtp.gmail.com)');
        console.warn('   - EMAIL_PORT (e.g., 587)');
        console.warn('   - EMAIL_USER (your email address)');
        console.warn('   - EMAIL_PASS (your email password or app password)');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort),
        secure: parseInt(emailPort) === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      this.isConfigured = true;
      console.log('✅ Email service configured successfully');
    } catch (error) {
      console.error('❌ Failed to configure email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send friend request notification email
   */
  async sendFriendRequestNotification(data: FriendRequestEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`📧 Email not configured - would send friend request notification to ${data.recipientEmail}`);
      return false;
    }

    try {
      const mailOptions = {
        from: `"Workplace Connect" <${process.env.EMAIL_USER}>`,
        to: data.recipientEmail,
        subject: `New Friend Request from ${data.senderName}`,
        html: this.generateFriendRequestEmailTemplate(data),
        text: this.generateFriendRequestEmailText(data)
      };

      if (!this.transporter) {
        console.error('❌ Transporter is not initialized');
        return false;
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Friend request email sent to ${data.recipientEmail}:`, info.messageId);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send friend request email to ${data.recipientEmail}:`, error);
      return false;
    }
  }

  /**
   * Send invitation email to non-registered users
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`📧 Email not configured - would send invitation email to ${data.recipientEmail}`);
      return false;
    }

    try {
      const mailOptions = {
        from: `"Workplace Connect" <${process.env.EMAIL_USER}>`,
        to: data.recipientEmail,
        subject: `You're Invited to Join Workplace Connect!`,
        html: this.generateInvitationEmailTemplate(data),
        text: this.generateInvitationEmailText(data)
      };

      if (!this.transporter) {
        console.error('❌ Transporter is not initialized');
        return false;
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Invitation email sent to ${data.recipientEmail}:`, info.messageId);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send invitation email to ${data.recipientEmail}:`, error);
      return false;
    }
  }

  /**
   * Generate HTML email template for friend request
   */
  private generateFriendRequestEmailTemplate(data: FriendRequestEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Friend Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; }
          .accept-btn { background-color: #28a745; color: white; }
          .reject-btn { background-color: #dc3545; color: white; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .profile-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>👋 New Friend Request!</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${data.recipientName}</strong>,</p>
          
          <p>You have received a new friend request on <strong>Workplace Connect</strong>!</p>
          
          <div class="profile-info">
            <h3>📋 Request Details:</h3>
            <p><strong>From:</strong> ${data.senderName}</p>
            <p><strong>Email:</strong> ${data.senderEmail}</p>
          </div>
          
          <p>You can respond to this friend request by logging into your Workplace Connect account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/friend-requests" class="button accept-btn">
              View Friend Requests
            </a>
          </div>
          
          <p>If you don't recognize this person or don't want to connect, you can simply ignore or reject this request.</p>
        </div>
        <div class="footer">
          <p>This email was sent by Workplace Connect. If you didn't expect this email, you can safely ignore it.</p>
          <p>© ${new Date().getFullYear()} Workplace Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for friend request
   */
  private generateFriendRequestEmailText(data: FriendRequestEmailData): string {
    return `
New Friend Request - Workplace Connect

Hi ${data.recipientName},

You have received a new friend request on Workplace Connect!

Request Details:
- From: ${data.senderName}
- Email: ${data.senderEmail}

You can respond to this friend request by logging into your Workplace Connect account at:
${process.env.FRONTEND_URL || 'http://localhost:3000'}/friend-requests

If you don't recognize this person or don't want to connect, you can simply ignore or reject this request.

---
This email was sent by Workplace Connect. If you didn't expect this email, you can safely ignore it.
© ${new Date().getFullYear()} Workplace Connect. All rights reserved.
    `;
  }

  /**
   * Generate HTML email template for invitation
   */
  private generateInvitationEmailTemplate(data: InvitationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited to Join Workplace Connect!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; }
          .join-btn { background-color: #28a745; color: white; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>👋 You're Invited to Join Workplace Connect!</h1>
        </div>
        <div class="content">
          <p>Hi,</p>
          
          <p>You've been invited to join Workplace Connect, a platform to connect with colleagues and friends!</p>
          
          <p>To get started, simply click the link below to sign up:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button join-btn">
              Join Workplace Connect
            </a>
          </div>
          
          <p>If you have any questions or need help, feel free to reply to this email or contact our support team.</p>
        </div>
        <div class="footer">
          <p>This email was sent by Workplace Connect. If you didn't expect this email, you can safely ignore it.</p>
          <p>© ${new Date().getFullYear()} Workplace Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text email for invitation
   */
  private generateInvitationEmailText(data: InvitationEmailData): string {
    return `
You're Invited to Join Workplace Connect!

Hi,

You've been invited to join Workplace Connect, a platform to connect with colleagues and friends!

To get started, simply click the link below to sign up:
${process.env.FRONTEND_URL || 'http://localhost:3000'}

If you have any questions or need help, feel free to reply to this email or contact our support team.

---
This email was sent by Workplace Connect. If you didn't expect this email, you can safely ignore it.
© ${new Date().getFullYear()} Workplace Connect. All rights reserved.
    `;
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      if (!this.transporter) {
        console.error('❌ Transporter is not initialized');
        return false;
      }
      await this.transporter.verify();
      console.log('✅ Email configuration test passed');
      return true;
    } catch (error) {
      console.error('❌ Email configuration test failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
