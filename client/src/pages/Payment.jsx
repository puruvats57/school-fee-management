import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { load } from '@cashfreepayments/cashfree-js';
import useSessionTimeout from '../hooks/useSessionTimeout';
import SessionTimeoutModal from '../components/SessionTimeoutModal';
import './Payment.css';

function Payment() {
  const [feeData, setFeeData] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cashfree, setCashfree] = useState(null);
  const navigate = useNavigate();

  // Session timeout (15 minutes inactivity, 2 minutes warning)
  const { showWarning, timeRemaining, handleStayLoggedIn, handleLogout: handleTimeoutLogout } = useSessionTimeout({
    timeoutMinutes: 15,
    warningMinutes: 2,
    logoutEndpoint: '/api/auth/logout',
    redirectPath: '/',
    enabled: true
  });

  useEffect(() => {
    initializeCashfree();
    fetchFeeDetails();
  }, []);

  const initializeCashfree = async () => {
    try {
      const cf = await load({
        mode: 'sandbox',
      });
      setCashfree(cf);
    } catch (err) {
      console.error('Error initializing Cashfree:', err);
    }
  };

  const fetchFeeDetails = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/fees/details', {
        withCredentials: true
      });

      if (response.data.success && response.data.hasFee) {
        setFeeData(response.data);
        setAmount(response.data.fee.dueAmount.toString());
      } else {
        navigate('/fees');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/');
      } else {
        setError('Failed to fetch fee details');
      }
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    
    const paymentAmount = parseFloat(amount);
    
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (paymentAmount > feeData.fee.dueAmount) {
      setError(`Amount cannot exceed due amount of ₹${feeData.fee.dueAmount}`);
      return;
    }

    if (!cashfree) {
      setError('Payment gateway not initialized. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      // Create payment order
      const orderResponse = await axios.post(
        'http://localhost:8000/api/payment/create-order',
        { amount: paymentAmount },
        { withCredentials: true }
      );

      if (!orderResponse.data.success) {
        setError(orderResponse.data.message || 'Failed to create payment order');
        setLoading(false);
        return;
      }

      const { paymentSessionId, orderId } = orderResponse.data;

      // Store orderId in sessionStorage for callback handling
      sessionStorage.setItem('lastOrderId', orderId);

      // Initialize Cashfree checkout with redirect URL
      const checkoutOptions = {
        paymentSessionId: paymentSessionId,
        redirectTarget: '_self',
        // Add redirect URL for callback handling
        redirectUrl: `${window.location.origin}/payment-callback`
      };

      cashfree.checkout(checkoutOptions).then(async (result) => {
        if (result.error) {
          setError(result.error.message || 'Payment failed');
          setLoading(false);
          sessionStorage.removeItem('lastOrderId');
          return;
        }

        // If payment is completed immediately (some payment methods)
        if (result.paymentStatus === 'SUCCESS') {
          try {
            const verifyResponse = await axios.post(
              'http://localhost:8000/api/payment/verify',
              { orderId: orderId },
              { withCredentials: true }
            );

            if (verifyResponse.data.success && verifyResponse.data.status === 'success') {
              sessionStorage.removeItem('lastOrderId');
              navigate('/receipt', { state: { orderId: orderId } });
            } else {
              setError(verifyResponse.data.message || 'Payment verification failed');
              setLoading(false);
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            setError('Payment verification failed. Please contact support.');
            setLoading(false);
          }
        }
        // For redirect-based payments, user will be redirected to callback page
      }).catch((checkoutError) => {
        console.error('Checkout error:', checkoutError);
        setError('Payment initialization failed. Please try again.');
        setLoading(false);
        sessionStorage.removeItem('lastOrderId');
      });
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (!feeData) {
    return (
      <div className="payment-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <SessionTimeoutModal
        show={showWarning}
        timeRemaining={timeRemaining}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleTimeoutLogout}
      />
      <div className="payment-container">
        <div className="payment-card">
        <div className="header-section">
          <h1>Make Payment</h1>
          <button onClick={() => navigate('/fees')} className="back-btn">Back</button>
        </div>

        <div className="payment-summary">
          <h3>Payment Summary</h3>
          <div className="summary-row">
            <span>Total Due:</span>
            <span className="due-amount">₹{feeData.fee.dueAmount.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Student:</span>
            <span>{feeData.student.name}</span>
          </div>
        </div>

        <form onSubmit={handlePayment} className="payment-form">
          <div className="form-group">
            <label htmlFor="amount">Enter Amount to Pay (₹)</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= feeData.fee.dueAmount)) {
                  setAmount(value);
                }
              }}
              min="1"
              max={feeData.fee.dueAmount}
              step="0.01"
              required
              disabled={loading}
              placeholder={`Max: ₹${feeData.fee.dueAmount.toFixed(2)}`}
            />
            <small>Maximum: ₹{feeData.fee.dueAmount.toFixed(2)}</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="pay-btn"
            disabled={loading || !amount || parseFloat(amount) <= 0}
          >
            {loading ? 'Processing...' : `Pay ₹${amount || '0.00'}`}
          </button>
        </form>

        <div className="payment-info">
          <p>You will be redirected to Cashfree payment gateway to complete the payment.</p>
        </div>
      </div>
    </div>
    </>
  );
}

export default Payment;

