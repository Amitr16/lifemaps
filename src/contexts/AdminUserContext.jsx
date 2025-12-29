import React, { createContext, useContext } from 'react';

const AdminUserContext = createContext(null);

export const useAdminUser = () => {
  const context = useContext(AdminUserContext);
  return context; // Returns { userId } or null
};

export const AdminUserProvider = ({ userId, children }) => {
  return (
    <AdminUserContext.Provider value={{ userId }}>
      {children}
    </AdminUserContext.Provider>
  );
};

