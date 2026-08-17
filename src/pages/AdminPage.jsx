import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Shell from '../components/Shell';
import { LifemapAdminShell } from '../components/LifemapChrome';

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
    return (
      <LifemapAdminShell title="Admin" kicker="BOX Wealth">
        <div className="lm-card" style={{ padding: 48, textAlign: 'center', color: 'var(--lm-muted)' }}>Loading…</div>
      </LifemapAdminShell>
    );
  }

  if (selectedUser && activeTab === 'user-view') {
    return (
      <UserDataView
        userId={selectedUser.id}
        userName={selectedUser.name}
        onBack={() => {
          setActiveTab('users');
          setSelectedUser(null);
        }}
      />
    );
  }

  return (
    <LifemapAdminShell
      title="Your users"
      kicker={`Signed in as ${admin?.name || admin?.username || 'Admin'}`}
      actions={<button type="button" className="lm-btn" onClick={handleLogout}>Logout</button>}
    >
      <div className="lm-card">
        <div className="lm-reghead">
          <h3>User register</h3>
          <span className="count">{users.length} people</span>
          <div className="r">
            <button type="button" className="lm-ghost primary" onClick={() => setShowCreateUser(true)}>+ Create user</button>
          </div>
        </div>
        <div className="lm-tblwrap">
          <table className="lm-tbl">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td className="empty" colSpan={4}>No users assigned to you yet</td>
                </tr>
              ) : users.map((user) => (
                <tr
                  key={user.id}
                  className={selectedUser?.id === user.id ? 'on' : ''}
                  onClick={() => {
                    setSelectedUser(user);
                    setActiveTab('user-view');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{user.email}</td>
                  <td>{user.name}</td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="lm-iconbtn danger" onClick={() => handleDeleteUser(user.id)} aria-label="Delete user">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateUser ? (
        <div className="lm-modal-overlay" onClick={() => setShowCreateUser(false)}>
          <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create user</h2>
            <p className="sub">They will be able to sign in and save a plan.</p>
            <form onSubmit={handleCreateUser} className="stack">
              <div>
                <label htmlFor="new-email">Email</label>
                <input id="new-email" className="lm-inp" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="new-password">Password</label>
                <input id="new-password" className="lm-inp" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={6} />
              </div>
              <div>
                <label htmlFor="new-name">Name</label>
                <input id="new-name" className="lm-inp" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
              </div>
              <div className="lm-modal-acts">
                <button type="button" className="lm-ghost" onClick={() => setShowCreateUser(false)}>Cancel</button>
                <button type="submit" className="lm-btn">Create user</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </LifemapAdminShell>
  );
}

// Component to view and edit user data
function UserDataView({ userId, userName, onBack }) {
  const [activeSection, setActiveSection] = useState('dashboard');
  const { admin } = useAuth();

  return (
    <Shell
      adminMode={true}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      adminUserName={admin?.name || admin?.username}
      userName={userName}
      onBack={onBack}
    >
      {activeSection === 'dashboard' && <AdminUserDashboard userId={userId} />}
      {activeSection === 'assets' && <AdminUserAssets userId={userId} />}
      {activeSection === 'work-assets' && <AdminUserWorkAssets userId={userId} />}
      {activeSection === 'goals' && <AdminUserGoals userId={userId} />}
      {activeSection === 'loans' && <AdminUserLoans userId={userId} />}
      {activeSection === 'expenses' && <AdminUserExpenses userId={userId} />}
      {activeSection === 'insurance' && <AdminUserInsurance userId={userId} />}
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

