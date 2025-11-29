import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    fetchStats();
  }, []);

  const checkSession = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/admin/auth/check-session', {
        withCredentials: true
      });

      if (!response.data.authenticated) {
        navigate('/admin/login');
      }
    } catch (err) {
      navigate('/admin/login');
    }
  };

  const fetchStats = async () => {
    try {
      const [studentsRes, feesRes, transactionsRes] = await Promise.all([
        axios.get('http://localhost:8000/api/admin/students', { withCredentials: true }),
        axios.get('http://localhost:8000/api/admin/fees', { withCredentials: true }),
        axios.get('http://localhost:8000/api/admin/transactions?limit=1000', { withCredentials: true })
      ]);

      const students = studentsRes.data.students || [];
      const fees = feesRes.data.fees || [];
      const transactions = transactionsRes.data.transactions || [];

      const totalRevenue = transactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingFees = fees.filter(f => f.status === 'pending' || f.status === 'partial').length;
      const paidFees = fees.filter(f => f.status === 'paid').length;

      setStats({
        totalStudents: students.length,
        totalFees: fees.length,
        pendingFees,
        paidFees,
        totalTransactions: transactions.length,
        totalRevenue
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/api/admin/auth/logout', {}, {
        withCredentials: true
      });
      navigate('/admin/login');
    } catch (err) {
      navigate('/admin/login');
    }
  };

  if (loading) {
    return <div className="admin-dashboard-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="admin-dashboard-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-nav">
        <Link to="/admin/dashboard" className="nav-link active">Dashboard</Link>
        <Link to="/admin/students" className="nav-link">Students</Link>
        <Link to="/admin/fees" className="nav-link">Fee Structure</Link>
        <Link to="/admin/transactions" className="nav-link">Payment History</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Students</h3>
          <p className="stat-value">{stats?.totalStudents || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Fee Records</h3>
          <p className="stat-value">{stats?.totalFees || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Fees</h3>
          <p className="stat-value pending">{stats?.pendingFees || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Paid Fees</h3>
          <p className="stat-value success">{stats?.paidFees || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <p className="stat-value">{stats?.totalTransactions || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="stat-value revenue">₹{stats?.totalRevenue?.toLocaleString('en-IN') || '0'}</p>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/admin/students" className="action-card">
            <span className="action-icon">👥</span>
            <span>Manage Students</span>
          </Link>
          <Link to="/admin/fees" className="action-card">
            <span className="action-icon">💰</span>
            <span>Manage Fee Structure</span>
          </Link>
          <Link to="/admin/transactions" className="action-card">
            <span className="action-icon">📊</span>
            <span>View Payment History</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

