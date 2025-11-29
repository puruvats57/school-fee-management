import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AdminCommon.css';

function AdminFees() {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [formData, setFormData] = useState({
    studentId: '',
    academicYear: '',
    components: [{ name: '', amount: '' }]
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    fetchFees();
    fetchStudents();
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

  const fetchFees = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/admin/fees', {
        withCredentials: true
      });
      if (response.data.success) {
        setFees(response.data.fees);
      }
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setLoading(false);
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

  const handleOpenModal = (fee = null) => {
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;

    if (fee) {
      setEditingFee(fee);
      setFormData({
        studentId: fee.studentId._id,
        academicYear: fee.academicYear,
        components: fee.components
      });
    } else {
      setEditingFee(null);
      setFormData({
        studentId: '',
        academicYear: academicYear,
        components: [{ name: '', amount: '' }]
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleAddComponent = () => {
    setFormData({
      ...formData,
      components: [...formData.components, { name: '', amount: '' }]
    });
  };

  const handleRemoveComponent = (index) => {
    const newComponents = formData.components.filter((_, i) => i !== index);
    setFormData({ ...formData, components: newComponents });
  };

  const handleComponentChange = (index, field, value) => {
    const newComponents = [...formData.components];
    newComponents[index][field] = value;
    setFormData({ ...formData, components: newComponents });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const components = formData.components
      .filter(comp => comp.name && comp.amount)
      .map(comp => ({
        name: comp.name,
        amount: parseFloat(comp.amount)
      }));

    if (components.length === 0) {
      setError('At least one fee component is required');
      return;
    }

    try {
      if (editingFee) {
        await axios.put(`http://localhost:8000/api/admin/fees/${editingFee._id}`, {
          components: components,
          academicYear: formData.academicYear
        }, {
          withCredentials: true
        });
      } else {
        await axios.post('http://localhost:8000/api/admin/fees', {
          studentId: formData.studentId,
          academicYear: formData.academicYear,
          components: components
        }, {
          withCredentials: true
        });
      }
      setShowModal(false);
      fetchFees();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee record?')) return;

    try {
      await axios.delete(`http://localhost:8000/api/admin/fees/${id}`, {
        withCredentials: true
      });
      fetchFees();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting fee record');
    }
  };

  const handleLogout = async () => {
    await axios.post('http://localhost:8000/api/admin/auth/logout', {}, {
      withCredentials: true
    });
    navigate('/admin/login');
  };

  if (loading) return <div className="admin-container"><div className="loading">Loading...</div></div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Fee Structure Management</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-nav">
        <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/admin/students" className="nav-link">Students</Link>
        <Link to="/admin/fees" className="nav-link active">Fee Structure</Link>
        <Link to="/admin/transactions" className="nav-link">Payment History</Link>
      </div>

      <div className="admin-content">
        <div className="content-header">
          <h2>All Fee Records</h2>
          <button onClick={() => handleOpenModal()} className="add-btn">+ Add Fee Record</button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Academic Year</th>
                <th>Total Amount</th>
                <th>Paid Amount</th>
                <th>Due Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(fee => (
                <tr key={fee._id}>
                  <td>{fee.studentId?.name || 'N/A'}</td>
                  <td>{fee.studentId?.rollNumber || 'N/A'}</td>
                  <td>{fee.academicYear}</td>
                  <td>₹{fee.totalAmount.toFixed(2)}</td>
                  <td>₹{fee.paidAmount.toFixed(2)}</td>
                  <td>₹{fee.dueAmount.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${fee.status}`}>
                      {fee.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleOpenModal(fee)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDelete(fee._id)} className="delete-btn">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingFee ? 'Edit Fee Record' : 'Add New Fee Record'}</h3>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Student {editingFee && '(cannot be changed)'}</label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                  required
                  disabled={!!editingFee}
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.rollNumber} - {student.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                  placeholder="e.g., 2024-2025"
                  required
                />
              </div>
              <div className="form-group">
                <label>Fee Components</label>
                {formData.components.map((comp, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Component name"
                      value={comp.name}
                      onChange={(e) => handleComponentChange(index, 'name', e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={comp.amount}
                      onChange={(e) => handleComponentChange(index, 'amount', e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ flex: 1 }}
                    />
                    {formData.components.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(index)}
                        className="delete-btn"
                        style={{ padding: '10px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={handleAddComponent} className="add-btn" style={{ marginTop: '10px' }}>
                  + Add Component
                </button>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">Cancel</button>
                <button type="submit" className="submit-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFees;

