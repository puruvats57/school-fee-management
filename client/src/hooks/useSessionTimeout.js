import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Custom hook for session timeout after inactivity
 * @param {number} timeoutMinutes - Minutes of inactivity before timeout (default: 15)
 * @param {number} warningMinutes - Minutes before timeout to show warning (default: 2)
 * @param {string} logoutEndpoint - API endpoint for logout
 * @param {string} redirectPath - Path to redirect after logout
 * @param {boolean} enabled - Enable/disable timeout (default: true)
 */
const useSessionTimeout = ({
  timeoutMinutes = 15,
  warningMinutes = 2,
  logoutEndpoint = '/api/auth/logout',
  redirectPath = '/',
  enabled = true
} = {}) => {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Calculate timeout in milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;
  const warningThreshold = timeoutMs - warningMs;

  // Reset timers on user activity
  const resetTimers = useCallback(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setTimeRemaining(null);

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(warningMinutes * 60); // seconds

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningThreshold);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [enabled, timeoutMs, warningThreshold, warningMinutes]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await axios.post(`http://localhost:8000${logoutEndpoint}`, {}, {
        withCredentials: true
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear all timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      // Clear session storage
      sessionStorage.clear();
      
      // Redirect
      navigate(redirectPath);
    }
  }, [logoutEndpoint, redirectPath, navigate]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset if there was actual inactivity (prevents spam)
    if (timeSinceLastActivity > 1000) {
      resetTimers();
    }
  }, [resetTimers]);

  // Handle "Stay Logged In" button
  const handleStayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) return;

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttle activity detection (check every 1 second)
    let activityCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      if (timeSinceLastActivity > 1000) {
        // User was inactive, but now there might be activity
        // We'll check on the next event
      }
    }, 1000);

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timers
    resetTimers();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(activityCheckInterval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [enabled, handleActivity, resetTimers]);

  return {
    showWarning,
    timeRemaining,
    handleStayLoggedIn,
    handleLogout
  };
};

export default useSessionTimeout;

