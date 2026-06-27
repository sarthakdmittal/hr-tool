import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import AttendanceView from './pages/attendance/AttendanceView';
import AttendanceReport from './pages/attendance/AttendanceReport';
import LeaveManagement from './pages/leaves/LeaveManagement';
import HolidayCalendar from './pages/leaves/HolidayCalendar';
import SalaryStructures from './pages/salary/SalaryStructures';
import SalaryStructureForm from './pages/salary/SalaryStructureForm';
import PayrollDashboard from './pages/payroll/PayrollDashboard';
import PayrollDetails from './pages/payroll/PayrollDetails';
import PFReport from './pages/reports/PFReport';
import TDSReport from './pages/reports/TDSReport';
import ESICReport from './pages/reports/ESICReport';
import CompanySettings from './pages/settings/CompanySettings';

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />

        {/* Employees */}
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/employees/new" element={<EmployeeForm />} />
        <Route path="/employees/:id" element={<EmployeeProfile />} />
        <Route path="/employees/:id/edit" element={<EmployeeForm />} />

        {/* Attendance */}
        <Route path="/attendance" element={<AttendanceView />} />
        <Route path="/attendance/report" element={<AttendanceReport />} />

        {/* Leaves */}
        <Route path="/leaves" element={<LeaveManagement />} />
        <Route path="/leaves/holidays" element={<HolidayCalendar />} />

        {/* Salary Structures */}
        <Route path="/salary-structures" element={<SalaryStructures />} />
        <Route path="/salary-structures/new" element={<SalaryStructureForm />} />
        <Route path="/salary-structures/:id/edit" element={<SalaryStructureForm />} />

        {/* Payroll */}
        <Route path="/payroll" element={<PayrollDashboard />} />
        <Route path="/payroll/run/:runId" element={<PayrollDetails />} />

        {/* Reports */}
        <Route path="/reports/pf" element={<PFReport />} />
        <Route path="/reports/tds" element={<TDSReport />} />
        <Route path="/reports/esic" element={<ESICReport />} />

        {/* Settings */}
        <Route path="/settings" element={<CompanySettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
