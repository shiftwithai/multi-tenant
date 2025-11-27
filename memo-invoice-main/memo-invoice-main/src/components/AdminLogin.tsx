import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminLoginProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function AdminLogin({ onSuccess, onClose }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: dbError } = await supabase
      .from('admin_users')
      .select('password_hash')
      .maybeSingle();

    if (dbError || !data) {
      setError('Admin access not configured');
      setLoading(false);
      return;
    }

    if (password === data.password_hash) {
      sessionStorage.setItem('admin_authenticated', 'true');
      onSuccess();
    } else {
      setError('Incorrect password');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Admin Access</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700 mb-1">
              Admin Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              placeholder="Enter admin password"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
