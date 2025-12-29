import React from 'react';
import { useAdminUser } from '../contexts/AdminUserContext';
import LoansPage from './LoansPage';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AdminLoansPage() {
  const { userId } = useAdminUser();
  
  if (!userId) {
    return <div>No user selected</div>;
  }

  return (
    <ErrorBoundary>
      <LoansPage />
    </ErrorBoundary>
  );
}

