# Email Configuration for Friend Request Notifications

## Overview
The workplace-connect-server now supports email notifications for friend requests. When users send friend requests, the recipients will receive beautiful HTML email notifications.

## Features
- ✅ **HTML Email Templates** - Beautiful, responsive email design
- ✅ **Automatic Notifications** - Emails sent automatically when friend requests are created
- ✅ **Graceful Fallback** - System works without email configuration (logs instead)
- ✅ **Multiple Email Providers** - Supports Gmail, Outlook, Yahoo, and custom SMTP
- ✅ **Security** - Uses app passwords and secure authentication

## Quick Setup

### 1. Copy Environment Variables
```bash
cp .env.example .env
```

### 2. Configure Email Settings
Edit your `.env` file with your email provider settings:

#### For Gmail (Recommended)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### For Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

#### For Yahoo
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

### 3. Set Frontend URL (Optional)
```env
FRONTEND_URL=http://localhost:3000
```

## Gmail Setup (Detailed)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Factor Authentication

### Step 2: Generate App Password
1. Go to **Security** → **App passwords**
2. Select **Mail** and **Other (Custom name)**
3. Enter "Workplace Connect" as the app name
4. Copy the generated 16-character password

### Step 3: Update .env File
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-actual-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
```

## Testing Email Configuration

### Method 1: Send a Test Friend Request
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emails": ["test-recipient@example.com"]}' \
  "http://localhost:5001/api/friend-requests"
```

### Method 2: Check Server Logs
- ✅ **Configured**: `✅ Email service configured successfully`
- ❌ **Not Configured**: `⚠️ Email configuration not found`
- 📧 **Email Sent**: `✅ Friend request email sent to recipient@example.com`
- ❌ **Email Failed**: `❌ Failed to send friend request email`

## Email Template Preview

The email includes:
- **Professional Header** with gradient background
- **Sender Information** (name and email)
- **Call-to-Action Button** linking to your frontend
- **Responsive Design** that works on all devices
- **Professional Footer** with branding

## Troubleshooting

### Common Issues

#### 1. "Authentication Failed"
- **Gmail**: Make sure you're using an App Password, not your regular password
- **Outlook**: Try enabling "Less secure app access"
- **Yahoo**: Generate and use an App Password

#### 2. "Connection Refused"
- Check your EMAIL_HOST and EMAIL_PORT settings
- Ensure your firewall isn't blocking SMTP connections

#### 3. "Email not configured" message
- Verify all EMAIL_* environment variables are set in your .env file
- Restart your server after updating .env

### Debug Mode
To see detailed email logs, check your server console output:
```bash
npm run dev
```

## Security Best Practices

1. **Never commit .env files** - They're already in .gitignore
2. **Use App Passwords** - Don't use your main email password
3. **Rotate Passwords** - Change app passwords periodically
4. **Environment Variables** - Use different credentials for production

## Production Deployment

For production, consider using:
- **SendGrid** - Professional email service
- **AWS SES** - Amazon's email service  
- **Mailgun** - Developer-friendly email API
- **Custom SMTP** - Your organization's email server

## API Integration

The email service is automatically integrated with:
- `POST /api/friend-requests` - Bulk friend requests by email
- Individual friend request creation

No additional API calls needed - emails are sent automatically when friend requests are created.

## Customization

To customize email templates, edit:
- `/src/services/email.service.ts` - Email templates and logic
- HTML template in `generateFriendRequestEmailTemplate()`
- Text template in `generateFriendRequestEmailText()`

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify your email provider's SMTP settings
3. Test with a simple email client first
4. Ensure your email credentials are correct

---

**Note**: The system works perfectly without email configuration - it will simply log what emails would be sent instead of actually sending them.
