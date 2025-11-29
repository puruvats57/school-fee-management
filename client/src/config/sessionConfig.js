/**
 * Session Timeout Configuration
 * 
 * Change these values to customize session timeout behavior across all pages
 */

export const SESSION_CONFIG = {
  // Total inactivity time before auto-logout (in minutes)
  timeoutMinutes: 13,
  
  // Warning time before logout (in minutes)
  // Warning will appear at: timeoutMinutes - warningMinutes
  warningMinutes: 2,
  
  // Example configurations:
  // For 30 minutes timeout with 5 minute warning:
  // timeoutMinutes: 30, warningMinutes: 5
  
  // For 10 minutes timeout with 1 minute warning:
  // timeoutMinutes: 10, warningMinutes: 1
  
  // For 60 minutes timeout with 10 minute warning:
  // timeoutMinutes: 60, warningMinutes: 10
};

