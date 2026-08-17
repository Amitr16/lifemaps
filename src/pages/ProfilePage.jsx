import React, { useEffect, useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/api';
import { toast } from 'sonner';

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

  const renderField = (field, label, type = 'text', wide = false) => {
    const isEditing = editing[field];
    const value = isEditing ? (tempValues[field] ?? profile[field]) : profile[field];

    return (
      <label className={`lm-field ${wide ? 'wide' : ''}`}>
        <span>{label} *</span>
        <div className="lm-field-ctrl">
          {isEditing ? (
            <>
              <input
                className="lm-inp"
                type={type}
                value={value}
                onChange={(e) => setTempValues(prev => ({ ...prev, [field]: e.target.value }))}
                disabled={loading}
              />
              <button type="button" className="lm-iconbtn ok" onClick={() => handleSave(field)} disabled={loading} aria-label="Save">
                <Save className="h-4 w-4" />
              </button>
              <button type="button" className="lm-iconbtn danger" onClick={() => handleCancel(field)} disabled={loading} aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <input
                className="lm-inp"
                type={field === 'password' ? 'password' : type}
                value={field === 'password' ? '••••••••••••' : value}
                readOnly
              />
              <button
                type="button"
                className="lm-iconbtn"
                onClick={() => field === 'password' ? setChangePasswordOpen(true) : handleEdit(field)}
                aria-label={`Edit ${label}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </label>
    );
  };

  return (
    <div className="lm-body">
      <div id="sec-register">
        <PageHeader
          title="Your profile"
          description="The details LifeMap uses to greet you and to keep your plan saved against this account."
        />

        <div className="lm-card">
          <div className="lm-reghead">
            <h3>Account details</h3>
          </div>
          <div className="lm-fields">
            {renderField('firstName', 'First name')}
            {renderField('lastName', 'Last name')}
            {renderField('email', 'Email')}
            {renderField('password', 'Password', 'password')}
            {renderField('age', 'Age', 'number')}
            {renderField('workTenure', 'Work tenure', 'number')}
            {renderField('income', 'Current annual gross income (₹)', 'number', true)}
          </div>
          <div className="lm-note">* Mandatory fields</div>
        </div>
      </div>

      {changePasswordOpen ? (
        <div className="lm-modal-overlay" onClick={() => setChangePasswordOpen(false)}>
          <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Change password</h2>
            <p className="sub">Enter your current password and choose a new one.</p>
            <div className="stack">
              <div>
                <label htmlFor="cur-pass">Current password</label>
                <input id="cur-pass" className="lm-inp" type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="new-pass">New password</label>
                <input id="new-pass" className="lm-inp" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="conf-pass">Confirm new password</label>
                <input id="conf-pass" className="lm-inp" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} />
              </div>
            </div>
            <div className="lm-modal-acts">
              <button type="button" className="lm-ghost" onClick={() => { setChangePasswordOpen(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>Cancel</button>
              <button type="button" className="lm-btn" onClick={handleChangePassword} disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}>
                {changingPassword ? 'Saving…' : 'Save password'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
