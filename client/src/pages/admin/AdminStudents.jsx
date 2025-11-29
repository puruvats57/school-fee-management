import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AdminCommon.css';

function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    rollNumber: '',
    name: '',
    email: '',
    class: '',
    section: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
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
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        rollNumber: student.rollNumber,
        name: student.name,
        email: student.email,
        class: student.class,
        section: student.section,
        phone: student.phone || ''
      });
    } else {
      setEditingStudent(null);
      setFormData({
        rollNumber: '',
        name: '',
        email: '',
        class: '',
        section: '',
        phone: ''
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingStudent) {
        await axios.put(`http://localhost:8000/api/admin/students/${editingStudent._id}`, formData, {
          withCredentials: true
        });
      } else {
        await axios.post('http://localhost:8000/api/admin/students', formData, {
          withCredentials: true
        });
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      await axios.delete(`http://localhost:8000/api/admin/students/${id}`, {
        withCredentials: true
      });
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting student');
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
        <h1>Student Management</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-nav">
        <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/admin/students" className="nav-link active">Students</Link>
        <Link to="/admin/fees" className="nav-link">Fee Structure</Link>
        <Link to="/admin/transactions" className="nav-link">Payment History</Link>
      </div>

      <div className="admin-content">
        <div className="content-header">
          <h2>All Students</h2>
          <button onClick={() => handleOpenModal()} className="add-btn">+ Add Student</button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Name</th>
                <th>Email</th>
                <th>Class</th>
                <th>Section</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student._id}>
                  <td>{student.rollNumber}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.class}</td>
                  <td>{student.section}</td>
                  <td>{student.phone || '-'}</td>
                  <td>
                    <button onClick={() => handleOpenModal(student)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDelete(student._id)} className="delete-btn">Delete</button>
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
            <h3>{editingStudent ? 'Edit Student' : 'Add New Student'}</h3>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Roll Number {editingStudent && '(cannot be changed)'}</label>
                <input
                  type="text"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                  required
                  disabled={!!editingStudent}
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Class</label>
                  <input
                    type="text"
                    value={formData.class}
                    onChange={(e) => setFormData({...formData, class: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({...formData, section: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
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

export default AdminStudents;

