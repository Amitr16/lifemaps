import React, { createContext, useContext, useEffect, useReducer, useMemo } from 'react';
import ApiService from '../services/api';

export const WorkAssetsContext = createContext(null);

const initialState = {
  workAssets: [],
  loading: true,
  error: null
};

function workAssetsReducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
      return { workAssets: action.payload, loading: false, error: null };
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'UPSERT': {
      const idx = state.workAssets.findIndex(a => a.id === action.payload.id);
      const next = idx === -1
        ? [...state.workAssets, action.payload]
        : state.workAssets.map(a => (a.id === action.payload.id ? action.payload : a));
      return { ...state, workAssets: next };
    }
    case 'REMOVE':
      return { ...state, workAssets: state.workAssets.filter(a => a.id !== action.payload) };
    case 'REPLACE_ALL':
      return { ...state, workAssets: [...action.payload] };
    default:
      return state;
  }
}

export const WorkAssetsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(workAssetsReducer, initialState);

  const refetch = async (userId) => {
    try {
      dispatch({ type: 'LOAD_START' });
      const response = await ApiService.getWorkAssets(userId);
      const workAssets = response.workAssets || response || [];
      dispatch({ type: 'LOAD_SUCCESS', payload: workAssets });
    } catch (error) {
      console.error('Error loading work assets:', error);
      dispatch({ type: 'LOAD_ERROR', payload: error?.message || 'Failed to load work assets' });
    }
  };

  const upsert = (workAsset) => {
    dispatch({ type: 'UPSERT', payload: workAsset });
  };

  const remove = (id) => {
    dispatch({ type: 'REMOVE', payload: id });
  };

  const replaceAll = (workAssets) => {
    dispatch({ type: 'REPLACE_ALL', payload: workAssets });
  };

  const value = useMemo(() => ({
    workAssets: state.workAssets,
    loading: state.loading,
    error: state.error,
    upsert,
    remove,
    replaceAll,
    refetch
  }), [state.workAssets, state.loading, state.error]);

  return (
    <WorkAssetsContext.Provider value={value}>
      {children}
    </WorkAssetsContext.Provider>
  );
};

export function useWorkAssets() {
  const context = useContext(WorkAssetsContext);
  if (!context) {
    throw new Error('useWorkAssets must be used within WorkAssetsProvider');
  }
  return context;
};
