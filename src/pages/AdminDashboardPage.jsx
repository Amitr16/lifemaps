import React from 'react';
import { useAdminUser } from '../contexts/AdminUserContext';
import { ChartProvider } from '../contexts/ChartContext';
import OriginalLifeSheet from '@/components/OriginalLifeSheet';
import ErrorBoundary from '@/components/ErrorBoundary';

// This component renders the user's dashboard but uses admin API
export default function AdminDashboardPage() {
  const { userId } = useAdminUser();
  
  if (!userId) {
    return <div>No user selected</div>;
  }

  // Wrap OriginalLifeSheet in ChartProvider since it uses useChart hook
  return (
    <ErrorBoundary>
      <ChartProvider>
        <OriginalLifeSheet />
      </ChartProvider>
    </ErrorBoundary>
  );
}

