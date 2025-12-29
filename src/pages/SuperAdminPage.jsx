import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function SuperAdminPage() {
  const { admin, adminLogout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showEditAdmin, setShowEditAdmin] = useState(null);
  const [showTransferUser, setShowTransferUser] = useState(null);

  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/super-admin/login');
      return;
    }
    loadData();
  }, [isSuperAdmin, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminsRes, usersRes] = await Promise.all([
        ApiService.getAdmins(),
        ApiService.getAllUsers(),
      ]);
      setAdmins(adminsRes.admins || []);
      setUsers(usersRes.users || []);
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await ApiService.createAdmin(adminForm);
      toast.success('Admin created successfully');
      setShowCreateAdmin(false);
      setAdminForm({ username: '', password: '', name: '', email: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to create admin: ' + error.message);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...adminForm };
      if (!updateData.password) {
        delete updateData.password; // Don't update password if empty
      }
      await ApiService.updateAdmin(showEditAdmin.id, updateData);
      toast.success('Admin updated successfully');
      setShowEditAdmin(null);
      setAdminForm({ username: '', password: '', name: '', email: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to update admin: ' + error.message);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to delete this admin? Users assigned to this admin will be unassigned.')) {
      return;
    }
    try {
      await ApiService.deleteAdmin(adminId);
      toast.success('Admin deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete admin: ' + error.message);
    }
  };

  const handleTransferUser = async (userId, adminId) => {
    try {
      await ApiService.transferUser(userId, adminId || null);
      toast.success('User transferred successfully');
      setShowTransferUser(null);
      loadData();
    } catch (error) {
      toast.error('Failed to transfer user: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    window.location.href = 'https://lifemaps-frontend.onrender.com/';
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {admin?.username}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Admin Management */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Admin Management</CardTitle>
              <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Admin</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div>
                      <Label>Username *</Label>
                      <Input
                        value={adminForm.username}
                        onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={adminForm.name}
                        onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Admin</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.username}</TableCell>
                    <TableCell>{a.name || '-'}</TableCell>
                    <TableCell>{a.email || '-'}</TableCell>
                    <TableCell>{a.user_count || 0}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowEditAdmin(a);
                            setAdminForm({ username: a.username, password: '', name: a.name || '', email: a.email || '' });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAdmin(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Assigned Admin</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.admin_username || 'Unassigned'}</TableCell>
                    <TableCell>
                      <Dialog open={showTransferUser === u.id} onOpenChange={(open) => setShowTransferUser(open ? u.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Transfer
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Transfer User to Admin</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Select Admin</Label>
                              <Select onValueChange={(value) => handleTransferUser(u.id, value === 'none' ? null : parseInt(value))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select admin" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Unassigned</SelectItem>
                                  {admins.filter(a => a.is_active).map((a) => (
                                    <SelectItem key={a.id} value={a.id.toString()}>
                                      {a.username} ({a.name || 'No name'})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Admin Dialog */}
        {showEditAdmin && (
          <Dialog open={!!showEditAdmin} onOpenChange={() => setShowEditAdmin(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Admin</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateAdmin} className="space-y-4">
                <div>
                  <Label>Username *</Label>
                  <Input
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Password (leave blank to keep current)</Label>
                  <Input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>
                    <input
                      type="checkbox"
                      checked={showEditAdmin.is_active}
                      onChange={(e) => setShowEditAdmin({ ...showEditAdmin, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    Active
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Update Admin</Button>
                  <Button type="button" variant="outline" onClick={() => setShowEditAdmin(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

