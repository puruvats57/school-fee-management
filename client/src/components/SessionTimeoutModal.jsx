import './SessionTimeoutModal.css';

function SessionTimeoutModal({ show, timeRemaining, onStayLoggedIn, onLogout }) {
  if (!show) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="session-timeout-overlay">
      <div className="session-timeout-modal">
        <div className="session-timeout-icon">⏱️</div>
        <h2 className="session-timeout-title">Session Timeout Warning</h2>
        <p className="session-timeout-message">
          Your session will expire due to inactivity in:
        </p>
        <div className="session-timeout-timer">{formattedTime}</div>
        <p className="session-timeout-submessage">
          Click "Stay Logged In" to continue your session.
        </p>
        <div className="session-timeout-buttons">
          <button
            onClick={onStayLoggedIn}
            className="session-timeout-btn session-timeout-btn-primary"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="session-timeout-btn session-timeout-btn-secondary"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionTimeoutModal;

