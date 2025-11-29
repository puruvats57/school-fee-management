# Email Setup Guide - Resend Configuration

## Issue: Domain Verification Error

If you're getting this error:
```
Error sending email: {
  statusCode: 403,
  message: 'The gmail.com domain is not verified...',
  name: 'validation_error'
}
```

This happens because Resend's free tier has restrictions on sending to unverified domains.

## Solution 1: Use Default Resend Sender (Recommended for Development)

The code has been updated to automatically use `onboarding@resend.dev` in development mode, which works with **any email address** including Gmail.

### Configuration

**For Development** (`.env` file):
```env
# Don't set RESEND_FROM_EMAIL, or set NODE_ENV=development
NODE_ENV=development
RESEND_API_KEY=re_your_api_key_here
# RESEND_FROM_EMAIL is optional - will use onboarding@resend.dev
```

**For Production** (`.env` file):
```env
NODE_ENV=production
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=School Fee Portal <noreply@yourdomain.com>
```

### How It Works

- **Development Mode**: Automatically uses `onboarding@resend.dev` (works with any email)
- **Production Mode**: Uses `RESEND_FROM_EMAIL` if set (requires verified domain)

## Solution 2: Verify Your Domain in Resend (For Production)

If you want to use a custom sender email in production:

1. **Sign in to Resend Dashboard**: https://resend.com/domains
2. **Add Your Domain**: Click "Add Domain"
3. **Verify DNS Records**: Add the provided DNS records to your domain
4. **Wait for Verification**: Usually takes a few minutes
5. **Update `.env`**:
   ```env
   RESEND_FROM_EMAIL=School Fee Portal <noreply@yourdomain.com>
   NODE_ENV=production
   ```

## Solution 3: Remove RESEND_FROM_EMAIL (Quick Fix)

If you have `RESEND_FROM_EMAIL` set in your `.env` file and it's not verified:

1. **Open `.env` file** in the `server` directory
2. **Comment out or remove** the `RESEND_FROM_EMAIL` line:
   ```env
   # RESEND_FROM_EMAIL=School Fee Portal <noreply@yourdomain.com>
   ```
3. **Or set NODE_ENV to development**:
   ```env
   NODE_ENV=development
   ```
4. **Restart your server**

## Current Behavior

The updated code automatically:
- Uses `onboarding@resend.dev` in development (works with Gmail, Yahoo, etc.)
- Uses your verified domain email in production
- Handles errors gracefully (logs error but doesn't break the flow)

## Testing

After making changes:

1. **Restart your server**:
   ```bash
   cd server
   npm run dev
   ```

2. **Test OTP email**:
   - Enter a student roll number
   - Check the email (including Gmail addresses)
   - OTP should be received

3. **Test receipt email**:
   - Complete a payment
   - Check email for receipt with PDF attachment

## Resend Free Tier Limits

- **100 emails/day** with `onboarding@resend.dev`
- **3,000 emails/month** with verified domain
- **Unlimited** on paid plans

## Troubleshooting

### Still Getting Errors?

1. **Check your `.env` file**:
   ```bash
   # Make sure RESEND_API_KEY is set
   RESEND_API_KEY=re_your_key_here
   ```

2. **Verify API Key**:
   - Go to https://resend.com/api-keys
   - Make sure the key is active
   - Regenerate if needed

3. **Check Server Logs**:
   - Look for detailed error messages
   - Verify email addresses are valid

4. **Test with Console**:
   ```javascript
   // In server/utils/email.js, add console.log
   console.log('Sending email from:', fromEmail);
   console.log('Sending email to:', email);
   ```

## Quick Fix Summary

**To fix the Gmail error immediately:**

1. Open `server/.env`
2. Make sure you have:
   ```env
   NODE_ENV=development
   RESEND_API_KEY=re_your_key_here
   ```
3. **Remove or comment out** `RESEND_FROM_EMAIL` if it's set to an unverified domain
4. Restart server

The code will now automatically use `onboarding@resend.dev` which works with **all email providers** including Gmail!

