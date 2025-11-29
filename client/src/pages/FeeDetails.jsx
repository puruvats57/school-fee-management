import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './FeeDetails.css';

function FeeDetails() {
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkSessionAndFetchFees();
  }, []);

  const checkSessionAndFetchFees = async () => {
    try {
      // Check session
      const sessionCheck = await axios.get('http://localhost:8000/api/auth/check-session', {
        withCredentials: true
      });

      if (!sessionCheck.data.authenticated) {
        navigate('/');
        return;
      }

      // Fetch fee details
      const response = await axios.get('http://localhost:8000/api/fees/details', {
        withCredentials: true
      });

      if (response.data.success) {
        setFeeData(response.data);
      } else {
        setError(response.data.message || 'Failed to fetch fee details');
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

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/api/auth/logout', {}, {
        withCredentials: true
      });
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/');
    }
  };

  const handlePayNow = () => {
    navigate('/payment');
  };

  const handleDownloadReceipt = () => {
    if (feeData?.lastTransaction?.orderId) {
      window.open(`http://localhost:8000/api/receipt/download/${feeData.lastTransaction.orderId}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="fee-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error && !feeData) {
    return (
      <div className="fee-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/')} className="back-btn">Go Back</button>
      </div>
    );
  }

  if (!feeData?.hasFee) {
    return (
      <div className="fee-container">
        <div className="fee-card">
          <div className="header-section">
            <h1>Fee Details</h1>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
          <div className="student-info">
            <h2>{feeData?.student?.name}</h2>
            <p>Roll Number: {feeData?.student?.rollNumber}</p>
            <p>Class: {feeData?.student?.class} - Section: {feeData?.student?.section}</p>
          </div>
          <div className="no-fee-message">
            <p>{feeData?.message || 'No fee record found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { fee, student, lastTransaction } = feeData;

  return (
    <div className="fee-container">
      <div className="fee-card">
        <div className="header-section">
          <h1>Fee Details</h1>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>

        <div className="student-info">
          <h2>{student.name}</h2>
          <p>Roll Number: {student.rollNumber}</p>
          <p>Class: {student.class} - Section: {student.section}</p>
        </div>

        <div className="fee-breakdown">
          <h3>Fee Breakdown</h3>
          <div className="fee-components">
            {fee.components.map((component, index) => (
              <div key={index} className="fee-component">
                <span className="component-name">{component.name}</span>
                <span className="component-amount">₹{component.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="fee-totals">
            <div className="total-row">
              <span>Total Amount:</span>
              <span className="total-amount">₹{fee.totalAmount.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Paid Amount:</span>
              <span className="paid-amount">₹{fee.paidAmount.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Due Amount:</span>
              <span className={`due-amount ${fee.status === 'paid' ? 'paid' : ''}`}>
                ₹{fee.dueAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {fee.status === 'paid' ? (
          <div className="payment-status paid-status">
            <p className="status-message">✅ All fees have been paid!</p>
            {lastTransaction && (
              <button onClick={handleDownloadReceipt} className="download-receipt-btn">
                Download Last Receipt
              </button>
            )}
          </div>
        ) : (
          <div className="payment-status pending-status">
            <p className="status-message">Amount Due: ₹{fee.dueAmount.toFixed(2)}</p>
            <button onClick={handlePayNow} className="pay-now-btn">
              Proceed to Pay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeeDetails;

