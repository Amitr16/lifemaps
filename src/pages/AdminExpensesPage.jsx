import React from 'react';
import { useAdminUser } from '../contexts/AdminUserContext';
import ExpensesPage from './ExpensesPage';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AdminExpensesPage() {
  const { userId } = useAdminUser();
  
  if (!userId) {
    return <div>No user selected</div>;
  }

  return (
    <ErrorBoundary>
      <ExpensesPage />
    </ErrorBoundary>
  );
}

