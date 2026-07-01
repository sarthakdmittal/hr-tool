import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  DollarSign,
  CreditCard,
  FileText,
  Receipt,
  Shield,
  Settings,
  Building2,
  FilePlus,
  UserMinus,
  User,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { isHR, getEmployeeId } from '../store/authStore';

const getNavSections = () => {
  if (!isHR()) {
    const empId = getEmployeeId();
    return [
      {
        label: 'My',
        items: [
          { path: empId ? `/employees/${empId}` : '/', label: 'My Profile', icon: User, end: true },
          { path: '/attendance', label: 'Attendance', icon: CalendarCheck },
          { path: '/leaves', label: 'My Leaves', icon: CalendarDays },
          { path: '/resignations', label: 'Resignation', icon: LogOut },
        ],
      },
    ];
  }
  return [
    {
      label: 'Main',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      ],
    },
    {
      label: 'People',
      items: [
        { path: '/employees', label: 'Employees', icon: Users },
        { path: '/attendance', label: 'Attendance', icon: CalendarCheck },
        { path: '/leaves', label: 'Leave Management', icon: CalendarDays },
        { path: '/account-requests', label: 'Account Requests', icon: UserCheck },
      ],
    },
    {
      label: 'Payroll',
      items: [
        { path: '/salary-structures', label: 'Salary Structures', icon: DollarSign },
        { path: '/payroll', label: 'Payroll', icon: CreditCard },
      ],
    },
    {
      label: 'Documents',
      items: [
        { path: '/offer-letters', label: 'Offer Letters', icon: FilePlus },
        { path: '/resignations', label: 'Resignations', icon: UserMinus },
      ],
    },
    {
      label: 'Reports',
      items: [
        { path: '/reports/pf', label: 'PF Report', icon: Shield },
        { path: '/reports/tds', label: 'TDS Report', icon: FileText },
        { path: '/reports/esic', label: 'ESIC Report', icon: Receipt },
      ],
    },
    {
      label: 'Settings',
      items: [
        { path: '/settings', label: 'Company Settings', icon: Settings },
      ],
    },
  ];
};

export default function Sidebar({ collapsed = false }) {
  const navSections = getNavSections();

  return (
    <aside className={`flex flex-col h-full bg-gray-900 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-sm">HR</span>
            <span className="text-primary-400 font-bold text-sm"> Manager</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative
                    ${isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
