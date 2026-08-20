import React, { useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { X, User, Mail, Lock, UserPlus } from 'lucide-react';

const AuthModal = ({ isOpen, onClose, defaultTab = 'login', onAuthenticated }) => {
  const { login, register, error, loading, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: ''
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await login(loginForm);
      await onAuthenticated?.({ mode: 'login', user: response.user });
      onClose();
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    try {
      const { confirmPassword, first_name, last_name, username, ...userData } = registerForm;
      // Combine first_name and last_name into name field
      const userDataWithName = {
        ...userData,
        name: `${first_name} ${last_name}`.trim()
      };
      console.log('🔍 Frontend registerForm state:', JSON.stringify(registerForm, null, 2));
      console.log('🔍 Sending registration data:', JSON.stringify(userDataWithName, null, 2));
      const response = await register(userDataWithName);
      await onAuthenticated?.({ mode: 'register', user: response.user });
      onClose();
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleLoginChange = (field, value) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
    clearError();
  };

  const handleRegisterChange = (field, value) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
    clearError();
  };

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  return (
    <div className="lm-modal-overlay" onClick={onClose}>
      <div className="lm-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <div>
            <div className="lm-gate-brand" style={{ marginBottom: 8 }}>
              <span className="lm-mark" />
              <span>
                <span className="lm-brand-name">LifeMap</span>
                <span className="lm-brand-by">by BOX Wealth</span>
              </span>
            </div>
            <h2>{activeTab === 'register' ? 'Save my plan' : 'Sign in'}</h2>
          </div>
          <button type="button" className="lm-iconbtn" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="lm-seg">
          <button type="button" className={activeTab === 'login' ? 'on' : ''} onClick={() => setActiveTab('login')}>Sign in</button>
          <button type="button" className={activeTab === 'register' ? 'on' : ''} onClick={() => setActiveTab('register')}>Create account</button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Login to Your Account</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter email address"
                      value={loginForm.email}
                      onChange={(e) => handleLoginChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter password"
                      value={loginForm.password}
                      onChange={(e) => handleLoginChange('password', e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="lm-btn" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <span>Create New Account</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">First Name</Label>
                      <Input
                        id="register-firstname"
                        type="text"
                        placeholder="First name"
                        value={registerForm.first_name}
                        onChange={(e) => handleRegisterChange('first_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">Last Name</Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        placeholder="Last name"
                        value={registerForm.last_name}
                        onChange={(e) => handleRegisterChange('last_name', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="Choose username"
                      value={registerForm.username}
                      onChange={(e) => handleRegisterChange('username', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter email address"
                      value={registerForm.email}
                      onChange={(e) => handleRegisterChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create password (min 6 characters)"
                      value={registerForm.password}
                      onChange={(e) => handleRegisterChange('password', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirm Password</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="Confirm password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => handleRegisterChange('confirmPassword', e.target.value)}
                      required
                    />
                  </div>
                    <Button type="submit" className="lm-btn" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                      {loading ? 'Creating account…' : 'Create account'}
                    </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <p className="sub" style={{ marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
          <Link to="/admin/login">Admin Login</Link>
          <span style={{ color: 'var(--lm-slate)', margin: '0 8px' }}>·</span>
          <Link to="/super-admin/login">Super Admin Login</Link>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;

