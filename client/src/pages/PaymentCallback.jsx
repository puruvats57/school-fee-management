import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './PaymentCallback.css';

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    // Get orderId from multiple sources
    const orderIdFromUrl = searchParams.get('order_id') 
      || searchParams.get('orderId')
      || searchParams.get('orderId')
      || new URLSearchParams(window.location.search).get('order_id')
      || new URLSearchParams(window.location.search).get('orderId');
    
    const orderIdFromStorage = sessionStorage.getItem('lastOrderId');
    const finalOrderId = orderIdFromUrl || orderIdFromStorage;
    
    console.log('[PaymentCallback] OrderId from URL:', orderIdFromUrl);
    console.log('[PaymentCallback] OrderId from storage:', orderIdFromStorage);
    console.log('[PaymentCallback] All URL params:', Object.fromEntries(searchParams.entries()));
    console.log('[PaymentCallback] Window location search:', window.location.search);
    
    if (finalOrderId) {
      setOrderId(finalOrderId);
      verifyPayment(finalOrderId);
    } else {
      setStatus('error');
      setError('Order ID not found. Please check your payment status in fee details or try verifying manually.');
    }
  }, []);

  const verifyPayment = async (orderIdToVerify = orderId) => {
    if (!orderIdToVerify) {
      setError('Order ID is required for verification.');
      setStatus('error');
      return;
    }

    try {
      setStatus('verifying');
      console.log('[PaymentCallback] Verifying payment with orderId:', orderIdToVerify);
      
      // Verify payment with backend
      const verifyResponse = await axios.post(
        'http://localhost:8000/api/payment/verify',
        { orderId: orderIdToVerify },
        { withCredentials: true }
      );
      
      console.log('[PaymentCallback] Verification response:', verifyResponse.data);

      if (verifyResponse.data.success && verifyResponse.data.status === 'success') {
        setStatus('success');
        // Clear stored order ID
        sessionStorage.removeItem('lastOrderId');
        // Redirect to receipt page to show payment receipt (FR-16)
        setTimeout(() => {
          navigate('/receipt', { state: { orderId: orderIdToVerify } });
        }, 2000);
      } else if (verifyResponse.data.status === 'pending') {
        // Payment is still pending, retry after a delay
        if (retryCount < maxRetries) {
          console.log(`[PaymentCallback] Payment pending, retrying... (${retryCount + 1}/${maxRetries})`);
          setRetryCount(retryCount + 1);
          setTimeout(() => {
            verifyPayment(orderIdToVerify);
          }, 3000); // Wait 3 seconds before retry
        } else {
          setStatus('pending');
          setError('Payment is still being processed. Please check your payment status in fee details.');
        }
      } else {
        setStatus('failed');
        setError(verifyResponse.data.message || 'Payment verification failed');
      }
    } catch (err) {
      console.error('[PaymentCallback] Verification error:', err);
      console.error('[PaymentCallback] Error details:', err.response?.data);
      
      // If it's a network error or the payment is still processing, allow retry
      if (retryCount < maxRetries && (!err.response || err.response.status >= 500)) {
        console.log(`[PaymentCallback] Retrying after error... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(retryCount + 1);
        setTimeout(() => {
          verifyPayment(orderIdToVerify);
        }, 3000);
      } else {
        setStatus('error');
        setError(err.response?.data?.message || 'Payment verification failed. Please try verifying manually or contact support.');
      }
    }
  };

  const handleManualVerify = () => {
    const orderIdToVerify = orderId || sessionStorage.getItem('lastOrderId');
    if (orderIdToVerify) {
      setRetryCount(0);
      verifyPayment(orderIdToVerify);
    } else {
      setError('Order ID not found. Please go to fee details and check your payment status.');
    }
  };

  return (
    <div className="payment-callback-container">
      <div className="payment-callback-card">
        {status === 'verifying' && (
          <>
            <div className="spinner"></div>
            <h2>Verifying Payment...</h2>
            <p>Please wait while we verify your payment.</p>
            {retryCount > 0 && (
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                Retrying... ({retryCount}/{maxRetries})
              </p>
            )}
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>Payment Successful!</h2>
            <p>Your payment has been processed and updated in the database.</p>
            <p>Redirecting to receipt page...</p>
          </>
        )}
        
        {status === 'pending' && (
          <>
            <div className="spinner"></div>
            <h2>Payment Processing...</h2>
            <p>{error}</p>
            <button onClick={handleManualVerify} className="retry-btn" style={{ marginTop: '20px' }}>
              Verify Payment Again
            </button>
            <button onClick={() => navigate('/fees')} className="back-btn" style={{ marginTop: '10px' }}>
              Go to Fee Details
            </button>
          </>
        )}
        
        {status === 'failed' && (
          <>
            <div className="error-icon">✗</div>
            <h2>Payment Failed</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/fees')} className="back-btn" style={{ marginTop: '20px' }}>
              Go to Fee Details
            </button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="error-icon">⚠</div>
            <h2>Verification Error</h2>
            <p>{error}</p>
            {orderId && (
              <button onClick={handleManualVerify} className="retry-btn" style={{ marginTop: '20px' }}>
                Try Verifying Again
              </button>
            )}
            <button onClick={() => navigate('/fees')} className="back-btn" style={{ marginTop: '10px' }}>
              Go to Fee Details
            </button>
            <p style={{ fontSize: '0.85em', color: '#666', marginTop: '20px' }}>
              If payment was successful on Cashfree, it will be updated automatically via webhook.
              <br />
              You can also check your payment status in the fee details page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default PaymentCallback;

