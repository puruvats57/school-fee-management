import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Landing.css';

function Landing() {
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/api/auth/send-otp', {
        rollNumber: rollNumber.trim()
      });

      if (response.data.success) {
        navigate('/otp', { state: { rollNumber: rollNumber.trim(), email: response.data.email } });
      } else {
        setError(response.data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        <h1 className="landing-title">School Fee Portal</h1>
        <p className="landing-subtitle">Enter your roll number to continue</p>
        
        <form onSubmit={handleSubmit} className="landing-form">
          <div className="form-group">
            <label htmlFor="rollNumber">Roll Number</label>
            <input
              type="text"
              id="rollNumber"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="Enter your roll number"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading || !rollNumber.trim()}
          >
            {loading ? 'Sending OTP...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Landing;

