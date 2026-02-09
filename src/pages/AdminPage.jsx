import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Shell from '../components/Shell';

export default function AdminPage() {
  const { admin, adminLogout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    name: '',
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }
    loadUsers();
  }, [isAdmin, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getAdminUsers();
      console.log('📋 Loaded users:', { count: response.users?.length || 0, users: response.users });
      setUsers(response.users || []);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await ApiService.createUser(userForm);
      toast.success('User created successfully');
      setShowCreateUser(false);
      setUserForm({ email: '', password: '', name: '' });
      loadUsers();
    } catch (error) {
      toast.error('Failed to create user: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? All their data will be deleted.')) {
      return;
    }
    try {
      await ApiService.deleteUser(userId);
      toast.success('User deleted successfully');
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
        setActiveTab('users');
      }
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    window.location.href = 'https://lifemaps-frontend.onrender.com/';
  };

  if (loading) {
    return <div className="p-8 text-slate-900 dark:text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="border-b bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-slate-300 text-sm">Welcome, {admin?.name || admin?.username || 'Admin'}</p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button onClick={handleLogout} variant="outline" className="dark:border-slate-600 dark:text-white">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="user-view" disabled={!selectedUser}>
              {selectedUser ? `${selectedUser.name}'s Data` : 'Select User'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Your Users</CardTitle>
                  <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="dark:text-white">Create New User</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                          <Label className="dark:text-white">Email *</Label>
                          <Input
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            required
                            className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <Label className="dark:text-white">Password *</Label>
                          <Input
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            required
                            minLength={6}
                            className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <Label className="dark:text-white">Name *</Label>
                          <Input
                            value={userForm.name}
                            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                            required
                            className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                          />
                        </div>
                        <Button type="submit" className="w-full dark:text-white">Create User</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 dark:text-slate-400">
                          No users assigned to you yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow
                          key={user.id}
                          className={selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800'}
                          onClick={() => {
                            setSelectedUser(user);
                            setActiveTab('user-view');
                          }}
                        >
                          <TableCell className="dark:text-white">{user.email}</TableCell>
                          <TableCell className="dark:text-white">{user.name}</TableCell>
                          <TableCell className="dark:text-slate-300">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="dark:border-slate-600 dark:text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user-view" className="mt-4">
            {selectedUser ? (
              <UserDataView userId={selectedUser.id} userName={selectedUser.name} />
            ) : (
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-8 text-center text-gray-500 dark:text-slate-400">
                  Please select a user from the Users tab
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Component to view and edit user data
function UserDataView({ userId, userName }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const { admin } = useAuth();

  return (
    <Shell 
      adminMode={true}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      adminUserName={admin?.name || admin?.username}
      userName={userName}
    >
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <div className="hidden">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="work-assets">Work Assets</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <AdminUserDashboard userId={userId} />
        </TabsContent>

        <TabsContent value="assets" className="mt-0">
          <AdminUserAssets userId={userId} />
        </TabsContent>

        <TabsContent value="work-assets" className="mt-0">
          <AdminUserWorkAssets userId={userId} />
        </TabsContent>

        <TabsContent value="goals" className="mt-0">
          <AdminUserGoals userId={userId} />
        </TabsContent>

        <TabsContent value="loans" className="mt-0">
          <AdminUserLoans userId={userId} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-0">
          <AdminUserExpenses userId={userId} />
        </TabsContent>

        <TabsContent value="insurance" className="mt-0">
          <AdminUserInsurance userId={userId} />
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

// Admin wrapper components that render the actual user pages with admin context
import { AdminUserProvider } from '../contexts/AdminUserContext';
import AdminAssetsPage from './AdminAssetsPage';
import AdminWorkAssetsPage from './AdminWorkAssetsPage';
import AdminGoalsPage from './AdminGoalsPage';
import AdminLoansPage from './AdminLoansPage';
import AdminExpensesPage from './AdminExpensesPage';
import AdminInsurancePage from './AdminInsurancePage';
import AdminDashboardPage from './AdminDashboardPage';

function AdminUserDashboard({ userId }) {
  return (
    <AdminUserProvider userId={userId}>
      <AdminDashboardPage />
    </AdminUserProvider>
  );
}

function AdminUserAssets({ userId }) {
  return (
    <AdminUserProvider userId={userId}>
      <AdminAssetsPage />
    </AdminUserProvider>
  );
}

function AdminUserWorkAssets({ userId }) {
  return (
    <AdminUserProvider userId={userId}>
      <AdminWorkAssetsPage />
    </AdminUserProvider>
  );
}

function AdminUserGoals({ userId }) {
  return (
    <AdminUserProvider userId={userId}>
      <AdminGoalsPage />
    </AdminUserProvider>
  );
}

function AdminUserLoans({ userId }) {
  return (
    <AdminUserProvider userId={userId}>
      <AdminLoansPage />
    </AdminUserProvider>
  );
}

function AdminUserExpenses({ userId }) {
  return (
    <AdminUserProvider userId={userId}>
      <AdminExpensesPage />
    </AdminUserProvider>
  );
}

function AdminUserInsurance({ userId }) {
  return (
    <AdminUserProvider userId={userId}>
      <AdminInsurancePage />
    </AdminUserProvider>
  );
}

