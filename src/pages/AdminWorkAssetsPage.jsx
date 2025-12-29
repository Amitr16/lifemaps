import React from 'react';
import { useAdminUser } from '../contexts/AdminUserContext';
import WorkAssetsPage from './WorkAssetsPage';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AdminWorkAssetsPage() {
  const { userId } = useAdminUser();
  
  if (!userId) {
    return <div>No user selected</div>;
  }

  return (
    <ErrorBoundary>
      <WorkAssetsPage />
    </ErrorBoundary>
  );
}

