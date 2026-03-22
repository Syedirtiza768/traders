import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { BarChart3, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Traders</h1>
              <p className="text-blue-200 text-sm">Business Management System</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Manage your trading<br />business with confidence
          </h2>
          <p className="text-blue-200 text-lg max-w-md">
            Complete wholesale trading and distribution management — from sales to inventory,
            finance to reports — all in one powerful platform.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: 'Sales & Orders', value: 'Track every transaction' },
              { label: 'Inventory', value: 'Real-time stock levels' },
              { label: 'Finance', value: 'Complete accounting' },
              { label: 'Reports', value: 'Business intelligence' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-blue-200 text-xs mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-xs">
          © 2026 Traders. Powered by ERPNext.
        </p>
      </div>

      {/* Right side — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-700 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Traders</h1>
              <p className="text-gray-500 text-xs">Business Management System</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 mt-1">Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); clearError(); }}
                  placeholder="admin@globaltrading.pk"
                  className="input-field"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    placeholder="Enter your password"
                    className="input-field pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {loading ? (
                  <>
                    <div className="spinner" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-medium text-blue-700 mb-1">Demo Credentials</p>
              <p className="text-xs text-blue-600">
                Email: <code className="bg-blue-100 px-1 rounded">demo@globaltrading.pk</code>
              </p>
              <p className="text-xs text-blue-600">
                Password: <code className="bg-blue-100 px-1 rounded">Demo@12345</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
