/**
 * Human-Friendly Error Formatter & Sanitizer
 * Translates low-level database, network, auth, and API errors into actionable, clear guidance.
 * Ensures developer internals (foreign keys, table schemas, SQL constraints, stack traces) are NEVER shown to end users.
 */

export function formatErrorMessage(err, context = 'general') {
  if (!err) return 'An unexpected error occurred. Please try again.';

  const raw = (typeof err === 'string' ? err : err.message || err.error_description || String(err)).trim();
  const lower = raw.toLowerCase();

  // --- 1. Authentication & Security Errors ---
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists') || lower.includes('duplicate key')) {
    if (context === 'driver') {
      return 'A team member is already registered with this email address. Please use a different email.';
    }
    return 'An account with this email address already exists. Please sign in or use "Forgot Password".';
  }
  if (lower.includes('email not confirmed') || lower.includes('not verified')) {
    return 'Please confirm your email address before signing in. Check your inbox or click "Resend Verification Email".';
  }
  if (lower.includes('captcha') || lower.includes('turnstile')) {
    return 'Security verification check was incomplete. Please verify the bot protection checkbox and retry.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
    return 'Too many attempts in a short period. For your security, please wait a moment before trying again.';
  }
  if (lower.includes('error sending confirmation email') || lower.includes('error sending email') || lower.includes('smtp')) {
    return 'We were unable to deliver the email right now. Please check your email spelling or try again in a few minutes.';
  }
  if (lower.includes('token has expired') || lower.includes('invalid recovery token') || lower.includes('otp_expired')) {
    return 'This password reset link has expired or has already been used. Please request a fresh reset link.';
  }

  // --- 2. Database Constraint & Relation Sanitization (Hide Foreign Keys / Schemas) ---
  if (lower.includes('foreign key') || lower.includes('violates') || lower.includes('referenced from table') || lower.includes('constraint')) {
    if (lower.includes('assigned_driver_id') || lower.includes('assigned_truck_id')) {
      return 'This resource is linked to an ongoing dispatch booking. Please reassign the job or change its status first.';
    }
    if (lower.includes('driver_profiles')) {
      return 'This vehicle is currently assigned to a driver. Please unassign the driver before deleting.';
    }
    if (lower.includes('truck_connectors')) {
      return 'This unit has mounted charging assemblies attached. Unmount assemblies before deleting.';
    }
    if (context === 'tariff' || context === 'package') {
      return 'This pricing tier is linked to active charging records and cannot be permanently removed. It has been safely archived instead.';
    }
    if (context === 'driver') {
      return 'Unable to modify or delete this technician due to active vehicle or session linkages.';
    }
    if (context === 'fleet') {
      return 'Unable to decommission this mobile unit while active assemblies or drivers are attached.';
    }
    return 'This item has dependent records and cannot be deleted directly.';
  }

  if (lower.includes('not-null') || lower.includes('null value in column')) {
    return 'Please fill in all required fields marked with an asterisk before proceeding.';
  }

  if (lower.includes('row-level security') || lower.includes('permission denied') || lower.includes('insufficient_privilege')) {
    return 'You do not have permission to perform this action. Please check your account privileges.';
  }

  // --- 3. Network & Connection Failures ---
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('offline') || lower.includes('connection refused')) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }
  if (lower.includes('timeout') || lower.includes('gateway')) {
    return 'The server took too long to respond. Please refresh the page and try again.';
  }

  // --- 4. Context-Specific Fallbacks ---
  if (context === 'unit_commission') {
    return 'Unable to register this mobile charging unit. Please ensure the vehicle identification is valid and retry.';
  }
  if (context === 'driver_create') {
    return 'Unable to complete technician onboarding. Please verify the entered details and try again.';
  }
  if (context === 'profile') {
    return 'Unable to update your profile details right now. Please verify your information and retry.';
  }
  if (context === 'password_reset') {
    return 'Unable to save your new password. Please ensure all criteria are met or request a new reset link.';
  }

  // Generic clean fallback (stripping technical jargon)
  return raw.replace(/([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g, 'item')
            .replace(/violates.*$/i, 'cannot be completed due to active dependencies.')
            .replace(/error:\s*/i, '');
}
