import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SuperAdminLoginPage() {
  const { superAdminLogin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Super Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="superadmin"
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

