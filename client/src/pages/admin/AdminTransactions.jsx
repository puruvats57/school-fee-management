import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AdminCommon.css';

function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    studentId: '',
    startDate: '',
    endDate: '',
    page: 1
  });
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    fetchStudents();
    fetchTransactions();
  }, [filters]);

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

  const fetchStudents = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/admin/students', {
        withCredentials: true
      });
      if (response.data.success) {
        setStudents(response.data.students);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('page', filters.page);
      params.append('limit', '50');

      const response = await axios.get(`http://localhost:8000/api/admin/transactions?${params}`, {
        withCredentials: true
      });
      if (response.data.success) {
        setTransactions(response.data.transactions);
        setSummary(response.data.summary);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value, page: 1 });
  };

  const handleLogout = async () => {
    await axios.post('http://localhost:8000/api/admin/auth/logout', {}, {
      withCredentials: true
    });
    navigate('/admin/login');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'failed';
      case 'pending': return 'pending';
      default: return '';
    }
  };

  if (loading) return <div className="admin-container"><div className="loading">Loading...</div></div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Payment History</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-nav">
        <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/admin/students" className="nav-link">Students</Link>
        <Link to="/admin/fees" className="nav-link">Fee Structure</Link>
        <Link to="/admin/transactions" className="nav-link active">Payment History</Link>
      </div>

      <div className="admin-content">
        {summary && (
          <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p className="stat-value revenue">₹{summary.totalAmount?.toLocaleString('en-IN') || '0'}</p>
            </div>
            <div className="stat-card">
              <h3>Successful</h3>
              <p className="stat-value success">{summary.statusCounts?.success || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Pending</h3>
              <p className="stat-value pending">{summary.statusCounts?.pending || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Failed</h3>
              <p className="stat-value failed">{summary.statusCounts?.failed || 0}</p>
            </div>
          </div>
        )}

        <div className="filters-section" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Filters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Student</label>
              <select
                value={filters.studentId}
                onChange={(e) => handleFilterChange('studentId', e.target.value)}
              >
                <option value="">All Students</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.rollNumber} - {student.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment Method</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction._id}>
                  <td>{transaction.orderId}</td>
                  <td>{transaction.studentId?.name || 'N/A'}</td>
                  <td>{transaction.studentId?.rollNumber || 'N/A'}</td>
                  <td>₹{transaction.amount.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(transaction.status)}`}>
                      {transaction.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{transaction.paymentMethod || '-'}</td>
                  <td>{new Date(transaction.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminTransactions;

