import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import useSessionTimeout from '../../hooks/useSessionTimeout';
import SessionTimeoutModal from '../../components/SessionTimeoutModal';
import { SESSION_CONFIG } from '../../config/sessionConfig';
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

  // Session timeout
  const { showWarning, timeRemaining, handleStayLoggedIn, handleLogout: handleTimeoutLogout } = useSessionTimeout({
    timeoutMinutes: SESSION_CONFIG.timeoutMinutes,
    warningMinutes: SESSION_CONFIG.warningMinutes,
    logoutEndpoint: '/api/admin/auth/logout',
    redirectPath: '/admin/login',
    enabled: true
  });

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
      console.log('[AdminTransactions] API Response:', response.data);
      if (response.data.success) {
        setTransactions(response.data.transactions || []);
        setSummary(response.data.summary || null);
        console.log('[AdminTransactions] Transactions loaded:', response.data.transactions?.length || 0);
      } else {
        console.error('[AdminTransactions] API returned success=false:', response.data);
      }
    } catch (err) {
      console.error('[AdminTransactions] Error fetching transactions:', err);
      console.error('[AdminTransactions] Error response:', err.response?.data);
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

  // Convert transactions to CSV format
  const convertToCSV = (data) => {
    if (!data || data.length === 0) {
      return '';
    }

    // CSV Headers
    const headers = [
      'Order ID',
      'Student Name',
      'Roll Number',
      'Amount (₹)',
      'Status',
      'Payment Method',
      'Payment ID',
      'Date',
      'Time'
    ];

    // Convert data to CSV rows
    const rows = data.map(transaction => {
      const date = new Date(transaction.createdAt);
      return [
        transaction.orderId || '',
        transaction.studentId?.name || 'N/A',
        transaction.studentId?.rollNumber || 'N/A',
        transaction.amount?.toFixed(2) || '0.00',
        transaction.status?.toUpperCase() || '',
        transaction.paymentMethod || '-',
        transaction.paymentId || '-',
        date.toLocaleDateString('en-IN'),
        date.toLocaleTimeString('en-IN')
      ];
    });

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Combine headers and rows
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    return csvContent;
  };

  // Export transactions to CSV
  const handleExportCSV = async () => {
    try {
      // Fetch all transactions with current filters (no pagination limit for export)
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', '10000'); // Large limit for export

      const response = await axios.get(`http://localhost:8000/api/admin/transactions?${params}`, {
        withCredentials: true
      });

      if (response.data.success && response.data.transactions) {
        const transactions = response.data.transactions;
        
        if (transactions.length === 0) {
          alert('No transactions to export.');
          return;
        }

        // Convert to CSV
        const csvContent = convertToCSV(transactions);

        // Create filename with current date and filters
        const dateStr = new Date().toISOString().split('T')[0];
        let filename = `payment_history_${dateStr}`;
        if (filters.status) filename += `_${filters.status}`;
        if (filters.startDate) filename += `_from_${filters.startDate}`;
        if (filters.endDate) filename += `_to_${filters.endDate}`;
        filename += '.csv';

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to fetch transactions for export.');
      }
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Error exporting CSV. Please try again.');
    }
  };

  if (loading) return <div className="admin-container"><div className="loading">Loading...</div></div>;

  return (
    <>
      <SessionTimeoutModal
        show={showWarning}
        timeRemaining={timeRemaining}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleTimeoutLogout}
      />
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, marginBottom: '10px' }}>Payment History</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {transactions.length > 0 && (
            <button
              onClick={handleExportCSV}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              <span>📥</span>
              Export to CSV
            </button>
          )}
        </div>

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
          {transactions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <p>No transactions found.</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default AdminTransactions;

