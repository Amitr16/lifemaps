import React from 'react';
import { useAdminUser } from '../contexts/AdminUserContext';
import AssetsPage from './AssetsPage';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AdminAssetsPage() {
  const { userId } = useAdminUser();
  
  if (!userId) {
    return <div>No user selected</div>;
  }

  // Render the same AssetsPage - it will need to be modified to use admin API when in admin context
  return (
    <ErrorBoundary>
      <AssetsPage />
    </ErrorBoundary>
  );
}

