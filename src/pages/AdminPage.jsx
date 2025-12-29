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
import { Trash2, Plus, LogOut, Calculator, PiggyBank, Briefcase, Target, CreditCard, ShoppingCart, Shield } from 'lucide-react';

const navigationItems = [
  { value: 'dashboard', label: 'Life Sheet', icon: Calculator },
  { value: 'assets', label: 'Assets', icon: PiggyBank },
  { value: 'work-assets', label: 'Work Assets', icon: Briefcase },
  { value: 'goals', label: 'Goals', icon: Target },
  { value: 'loans', label: 'Loans', icon: CreditCard },
  { value: 'expenses', label: 'Expenses', icon: ShoppingCart },
  { value: 'insurance', label: 'Insurance', icon: Shield },
];
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
// Import will be done in the component functions below

export default function AdminPage() {
  const { admin, adminLogout, isAdmin } = useAuth();
  const navigate = useNavigate();
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
      setUsers(response.users || []);
    } catch (error) {
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
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm">Welcome, {admin?.name || admin?.username}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
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
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Password *</Label>
                          <Input
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            required
                            minLength={6}
                          />
                        </div>
                        <div>
                          <Label>Name *</Label>
                          <Input
                            value={userForm.name}
                            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Create User</Button>
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
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          No users assigned to you yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow
                          key={user.id}
                          className={selectedUser?.id === user.id ? 'bg-blue-50' : 'cursor-pointer hover:bg-gray-50'}
                          onClick={() => {
                            setSelectedUser(user);
                            setActiveTab('user-view');
                          }}
                        >
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
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
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
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
    <div>
      {/* User Navigation Header - Similar to Shell */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 mb-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{userName}'s Life Sheet</h2>
                <p className="text-xs text-gray-500">Viewing as Admin: {admin?.name || admin?.username}</p>
              </div>
            </div>
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.value;
                return (
                  <Button
                    key={item.value}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveSection(item.value)}
                    className={`flex items-center gap-2 ${
                      isActive 
                        ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
            {/* Mobile menu */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        {/* Mobile Navigation */}
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-2">
            <div className="grid grid-cols-4 gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.value;
                return (
                  <Button
                    key={item.value}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveSection(item.value)}
                    className={`w-full flex flex-col items-center gap-1 h-auto py-2 ${
                      isActive 
                        ? "bg-emerald-500 text-white" 
                        : "text-gray-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
    </div>
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

