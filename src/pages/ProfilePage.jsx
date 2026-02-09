import React, { useEffect, useState } from 'react';
import { Pencil, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    income: '',
    workTenure: '',
    financialProfileId: null
  });
  
  const [editing, setEditing] = useState({
    firstName: false,
    lastName: false,
    email: false,
    age: false,
    income: false,
    workTenure: false
  });
  
  const [tempValues, setTempValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').split(' ');
      setProfile(prev => ({
        ...prev,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || ''
      }));
    }

    const loadFinancialProfile = async () => {
      try {
        const res = await ApiService.getFinancialProfile(user?.id);
        const data = res.profile || res;
        if (data) {
          setProfile(prev => ({
            ...prev,
            age: data.age || '',
            income: data.current_annual_gross_income || '',
            workTenure: data.work_tenure_years || '',
            financialProfileId: data.id || null
          }));
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };

    if (user?.id) {
      loadFinancialProfile();
    }
  }, [user]);

  const handleEdit = (field) => {
    setEditing(prev => ({ ...prev, [field]: true }));
    setTempValues(prev => ({ ...prev, [field]: profile[field] }));
  };

  const handleCancel = (field) => {
    setEditing(prev => ({ ...prev, [field]: false }));
    setTempValues(prev => {
      const newValues = { ...prev };
      delete newValues[field];
      return newValues;
    });
  };

  const handleSave = async (field) => {
    setLoading(true);
    try {
      if (field === 'email') {
        // Update user profile (email)
        const updatedUser = await ApiService.updateProfile({ email: tempValues[field] });
        if (updatedUser.user) {
          setUser(updatedUser.user);
          setProfile(prev => ({ ...prev, email: updatedUser.user.email }));
          toast.success('Email updated successfully');
        }
      } else if (field === 'firstName' || field === 'lastName') {
        // Update user profile (name)
        const fullName = field === 'firstName' 
          ? `${tempValues[field]} ${profile.lastName}`.trim()
          : `${profile.firstName} ${tempValues[field]}`.trim();
        const updatedUser = await ApiService.updateProfile({ name: fullName });
        if (updatedUser.user) {
          setUser(updatedUser.user);
          const nameParts = (updatedUser.user.name || '').split(' ');
          setProfile(prev => ({
            ...prev,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || ''
          }));
          toast.success('Name updated successfully');
        }
      } else if (['age', 'income', 'workTenure'].includes(field)) {
        // Update financial profile
        if (!profile.financialProfileId) {
          // Create financial profile if it doesn't exist
          const newProfile = await ApiService.createFinancialProfile({
            age: field === 'age' ? parseInt(tempValues[field]) : parseInt(profile.age) || 30,
            current_annual_gross_income: field === 'income' ? parseFloat(tempValues[field]) : parseFloat(profile.income) || 0,
            work_tenure_years: field === 'workTenure' ? parseInt(tempValues[field]) : parseInt(profile.workTenure) || 0
          });
          if (newProfile.profile) {
            setProfile(prev => ({
              ...prev,
              [field]: tempValues[field],
              financialProfileId: newProfile.profile.id
            }));
            toast.success(`${field === 'age' ? 'Age' : field === 'income' ? 'Income' : 'Work Tenure'} updated successfully`);
          }
        } else {
          // Update existing financial profile
          const updateData = {};
          if (field === 'age') updateData.age = parseInt(tempValues[field]);
          else if (field === 'income') updateData.current_annual_gross_income = parseFloat(tempValues[field]);
          else if (field === 'workTenure') updateData.work_tenure_years = parseInt(tempValues[field]);
          
          const updatedProfile = await ApiService.updateFinancialProfile(profile.financialProfileId, updateData);
          if (updatedProfile.profile) {
            setProfile(prev => ({ ...prev, [field]: tempValues[field] }));
            toast.success(`${field === 'age' ? 'Age' : field === 'income' ? 'Income' : 'Work Tenure'} updated successfully`);
          }
        }
      }
      
      setEditing(prev => ({ ...prev, [field]: false }));
      setTempValues(prev => {
        const newValues = { ...prev };
        delete newValues[field];
        return newValues;
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      await ApiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setChangePasswordOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const renderField = (field, label, type = 'text', span = 1) => {
    const isEditing = editing[field];
    const value = isEditing ? (tempValues[field] ?? profile[field]) : profile[field];
    
    return (
      <div className={`lifemap-soft-card p-4 ${span > 1 ? `md:col-span-${span}` : ''}`}>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{label}*</div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Input
                type={type}
                value={value}
                onChange={(e) => setTempValues(prev => ({ ...prev, [field]: e.target.value }))}
                className="flex-1 dark:text-white dark:bg-slate-700 dark:border-slate-600"
                disabled={loading}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSave(field)}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <Save className="h-4 w-4 text-green-600 dark:text-green-400" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCancel(field)}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              </Button>
            </>
          ) : (
            <>
              <Input
                type={field === 'password' ? 'password' : type}
                value={field === 'password' ? '••••••••••••' : value}
                readOnly
                className="flex-1 dark:text-white dark:bg-slate-700 dark:border-slate-600"
              />
              {field === 'password' ? (
                <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white">Change Password</DialogTitle>
                      <DialogDescription className="dark:text-slate-300">
                        Enter your current password and choose a new one
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Current Password*
                        </label>
                        <Input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="dark:text-white dark:bg-slate-700 dark:border-slate-600"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          New Password*
                        </label>
                        <Input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="dark:text-white dark:bg-slate-700 dark:border-slate-600"
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                          Confirm New Password*
                        </label>
                        <Input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="dark:text-white dark:bg-slate-700 dark:border-slate-600"
                          placeholder="Confirm new password"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setChangePasswordOpen(false);
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            });
                          }}
                          className="dark:text-white dark:border-slate-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleChangePassword}
                          disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                          className="dark:text-white"
                        >
                          {changingPassword ? 'Changing...' : 'Change Password'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(field)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="lifemap-page-header">
        <div>
          <h1 className="lifemap-page-title">Your Profile</h1>
          <p className="lifemap-page-subtitle flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Pencil className="h-3.5 w-3.5" />
            </span>
            Add or Modify your details below
          </p>
        </div>
      </div>

      <div className="lifemap-panel p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderField('firstName', 'Your First Name')}
          {renderField('lastName', 'Your Second Name')}
          {renderField('email', 'Your registered email')}
          {renderField('password', 'Your Password', 'password')}
          {renderField('age', 'Age')}
          {renderField('income', 'Current annual gross income (₹)', 'number', 2)}
          {renderField('workTenure', 'Current work tenure (years)')}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 text-right mt-4">*Mandatory Fields</div>
      </div>
    </div>
  );
}
