import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export default function Layout() {
  const location = useLocation();
  const { firstName, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();

  const isActive = (path: string) => location.pathname === path;

  const navItem = (to: string, icon: string, label: string) => (
      <Link
          to={to}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive(to)
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </Link>
  );

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg transition-colors">
          <div className="flex flex-col h-full">

            {/* Logo + theme toggle */}
            <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">FinanceAI</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Smart Finance</p>
              </div>
              {/* Dark mode toggle */}
              <button
                  onClick={toggle}
                  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 space-y-1">
              {navItem('/', '📊', 'Dashboard')}
              {navItem('/transactions', '💳', 'Transactions')}
              {navItem('/analytics', '📈', 'Analytics')}
              {navItem('/budgets', '💰', 'Budgets')}
              {navItem('/predictions', '🔮', 'Predictions')}
              {navItem('/insights', '🤖', 'AI Insights')}
            </nav>

            {/* User section */}
            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
              <Link
                  to="/profile"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition w-full ${
                      isActive('/profile')
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                  {firstName?.[0]?.toUpperCase() ?? '?'}
                </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{firstName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">View profile</p>
                </div>
              </Link>
              <button
                  onClick={logout}
                  className="w-full mt-1 text-sm text-red-500 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left"
              >
                Logout
              </button>
            </div>

          </div>
        </div>

        <div className="ml-64 p-8">
          <Outlet />
        </div>
      </div>
  );
}