import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useSessionTimeout from '../hooks/useSessionTimeout';
import SessionTimeoutModal from '../components/SessionTimeoutModal';
import { SESSION_CONFIG } from '../config/sessionConfig';
import './Receipt.css';

function Receipt() {
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = location.state || {};

  // Session timeout
  const { showWarning, timeRemaining, handleStayLoggedIn, handleLogout: handleTimeoutLogout } = useSessionTimeout({
    timeoutMinutes: SESSION_CONFIG.timeoutMinutes,
    warningMinutes: SESSION_CONFIG.warningMinutes,
    logoutEndpoint: '/api/auth/logout',
    redirectPath: '/',
    enabled: true
  });

  useEffect(() => {
    if (!orderId) {
      navigate('/fees');
      return;
    }
    fetchReceipt();
  }, [orderId, navigate]);

  const fetchReceipt = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/receipt/${orderId}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setReceiptData(response.data);
      } else {
        setError(response.data.message || 'Failed to fetch receipt');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/');
      } else {
        setError(err.response?.data?.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (orderId) {
      // Use the download endpoint (FR-17)
      window.open(`http://localhost:8000/api/receipt/download/${orderId}`, '_blank');
    }
  };

  const handleBackToFees = () => {
    navigate('/fees');
  };

  if (loading) {
    return (
      <div className="receipt-container">
        <div className="loading">Loading receipt...</div>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="receipt-container">
        <div className="error-message">{error || 'Receipt not found'}</div>
        <button onClick={handleBackToFees} className="back-btn">Back to Fee Details</button>
      </div>
    );
  }

  const { receipt, student, fee } = receiptData;

  return (
    <>
      <SessionTimeoutModal
        show={showWarning}
        timeRemaining={timeRemaining}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleTimeoutLogout}
      />
      <div className="receipt-container">
        <div className="receipt-card">
        <div className="receipt-header">
          <h1>Payment Receipt</h1>
          <div className="success-badge">✓ Payment Successful</div>
        </div>

        <div className="receipt-content">
          <div className="receipt-section">
            <h3>Student Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Name:</span>
                <span className="value">{student.name}</span>
              </div>
              <div className="info-item">
                <span className="label">Roll Number:</span>
                <span className="value">{student.rollNumber}</span>
              </div>
              <div className="info-item">
                <span className="label">Class:</span>
                <span className="value">{student.class} - {student.section}</span>
              </div>
            </div>
          </div>

          <div className="receipt-section">
            <h3>Payment Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Order ID:</span>
                <span className="value">{receipt.orderId}</span>
              </div>
              <div className="info-item">
                <span className="label">Payment ID:</span>
                <span className="value">{receipt.paymentId || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Payment Method:</span>
                <span className="value">{receipt.paymentMethod || 'Online'}</span>
              </div>
              <div className="info-item">
                <span className="label">Payment Date:</span>
                <span className="value">
                  {new Date(receipt.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="receipt-section">
            <h3>Fee Breakdown</h3>
            <div className="fee-breakdown">
              {fee.components.map((component, index) => (
                <div key={index} className="fee-item">
                  <span className="fee-name">{component.name}</span>
                  <span className="fee-amount">₹{component.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="receipt-section total-section">
            <div className="total-row">
              <span className="total-label">Total Amount Paid:</span>
              <span className="total-value">₹{receipt.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="receipt-actions">
          <button onClick={handleDownload} className="download-btn">
            Download Receipt (PDF)
          </button>
          <button onClick={handleBackToFees} className="back-btn">
            Back to Fee Details
          </button>
        </div>

        <div className="receipt-footer">
          <p>Receipt has been sent to your registered email address.</p>
          <p className="footer-note">This is a computer-generated receipt and does not require a signature.</p>
        </div>
      </div>
    </div>
    </>
  );
}

export default Receipt;

