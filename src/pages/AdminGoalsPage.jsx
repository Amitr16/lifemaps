import React from 'react';
import { useAdminUser } from '../contexts/AdminUserContext';
import EnhancedGoalsPage from './EnhancedGoalsPage';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AdminGoalsPage() {
  const { userId } = useAdminUser();
  
  if (!userId) {
    return <div>No user selected</div>;
  }

  return (
    <ErrorBoundary>
      <EnhancedGoalsPage />
    </ErrorBoundary>
  );
}

