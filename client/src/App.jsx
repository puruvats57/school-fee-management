import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import OTPVerification from './pages/OTPVerification';
import FeeDetails from './pages/FeeDetails';
import Payment from './pages/Payment';
import Receipt from './pages/Receipt';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminFees from './pages/admin/AdminFees';
import AdminTransactions from './pages/admin/AdminTransactions';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Student Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/otp" element={<OTPVerification />} />
        <Route path="/fees" element={<FeeDetails />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/receipt" element={<Receipt />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/fees" element={<AdminFees />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
