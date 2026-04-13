import { Link, useLocation } from 'react-router-dom';
import { User, Briefcase, FileText, LogOut, Presentation } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const location = useLocation();
  const { logout } = useAuth();

  const links = [
    {
      href: '/student',
      icon: User,
      label: 'Profile',
      isActive: (path: string) => path === '/student' || path === '/student/',
    },
    {
      href: '/student/offers',
      icon: Briefcase,
      label: 'Placement Offers',
      isActive: (path: string) => path.startsWith('/student/offers'),
    },
    {
      href: '/student/resume',
      icon: FileText,
      label: 'Resume AI',
      isActive: (path: string) => path.startsWith('/student/resume'),
    },
    {
      href: '/student/mock-interview',
      icon: Presentation,
      label: 'Mock Interview',
      isActive: (path: string) => path.startsWith('/student/mock-interview'),
    },
  ];

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {links.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'inline-flex items-center px-4 text-sm font-medium border-b-2 hover:border-gray-300 hover:text-gray-700',
                  item.isActive(location.pathname)
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500'
                )}
              >
                <item.icon className="h-5 w-5 mr-2" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={logout}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}