import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const { superAdminLogin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isSuperAdmin) {
      navigate('/super-admin');
    }
  }, [isSuperAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await superAdminLogin(credentials);
      toast.success('Login successful');
      navigate('/super-admin');
    } catch (error) {
      toast.error('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          className="lifemap-toggle"
          data-theme={resolvedTheme || theme || 'light'}
          aria-label="Toggle theme"
          aria-pressed={(resolvedTheme || theme) === 'dark'}
          onClick={() => setTheme((resolvedTheme || theme) === 'dark' ? 'light' : 'dark')}
        >
          <Moon className="h-3 w-3" />
          <Sun className="h-3 w-3" />
          <span className="lifemap-toggle-knob" />
        </button>
      </div>
      <Card className="w-full max-w-md dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center dark:text-white">Super Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="dark:text-white">Username</Label>
              <Input
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="superadmin"
                required
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-white">Password</Label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="Enter password"
                required
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <Button type="submit" className="w-full dark:text-white" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

