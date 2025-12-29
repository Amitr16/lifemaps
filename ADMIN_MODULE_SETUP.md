# Admin & Super Admin Module Setup Guide

## Overview

This document describes the admin and super admin module that has been added to the LifeMaps project.

## Features

### Super Admin
- **Default Login**: username: `superadmin`, password: `superadmin123`
- Create, update, and delete admin accounts
- Transfer users between admins
- View all users and their admin assignments
- Manage admin credentials and status

### Admin
- Login with super admin created credentials
- View list of users assigned to them
- View and edit all user data (similar to user website)
- Create and delete users
- Access all user pages: Dashboard, Assets, Work Assets, Goals, Loans, Expenses, Insurance

## Database Setup

### 1. Run Database Migration

First, create the admin tables:

```bash
cd lifemaps/backend
node scripts/init-super-admin.js
```

Or manually run the SQL:

```bash
psql -d life_sheet -f scripts/2025-01-31_create_admin_tables.sql
```

### 2. Initialize Super Admin

The super admin is automatically created with:
- Username: `superadmin`
- Password: `superadmin123`

The password is hashed using bcrypt in the initialization script.

## Backend Routes

### Super Admin Routes
- `POST /api/admin/super-admin/login` - Super admin login
- `GET /api/admin/super-admin/admins` - Get all admins
- `POST /api/admin/super-admin/admins` - Create admin
- `PUT /api/admin/super-admin/admins/:adminId` - Update admin
- `DELETE /api/admin/super-admin/admins/:adminId` - Delete admin
- `GET /api/admin/super-admin/users` - Get all users
- `PUT /api/admin/super-admin/users/:userId/transfer` - Transfer user to admin

### Admin Routes
- `POST /api/admin/admin/login` - Admin login
- `GET /api/admin/admin/users` - Get users assigned to admin
- `POST /api/admin/admin/users` - Create user
- `DELETE /api/admin/admin/users/:userId` - Delete user
- `GET /api/admin/admin/users/:userId/profile` - Get user profile

### Admin Financial Routes
All financial routes are accessible via `/api/admin/financial/*` with `userId` query parameter:
- `/api/admin/financial/profile/:userId?userId=X`
- `/api/admin/financial/goal/:userId?userId=X`
- `/api/admin/financial/expense/:userId?userId=X`
- `/api/admin/financial/loan/:userId?userId=X`
- `/api/admin/financial/asset/:userId?userId=X`
- `/api/admin/financial/work-assets/:userId?userId=X`
- `/api/admin/financial/insurance/:userId?userId=X`

## Frontend Routes

- `/super-admin/login` - Super admin login page
- `/super-admin` - Super admin dashboard
- `/admin/login` - Admin login page
- `/admin` - Admin dashboard

## Authentication

### Token Storage
- Regular users: `localStorage.getItem('authToken')`
- Admins/Super Admins: `localStorage.getItem('adminToken')`

### Token Types
- User tokens: `{ userId, ... }`
- Admin tokens: `{ adminId, role: 'admin' | 'super_admin' }`

## Security

1. **Password Hashing**: All passwords are hashed using bcrypt with 12 rounds
2. **JWT Tokens**: All authentication uses JWT tokens
3. **Access Control**: 
   - Admins can only access users assigned to them
   - Super admins can access all users
   - Regular users can only access their own data
4. **Middleware**: 
   - `authenticateSuperAdmin` - Verifies super admin token
   - `authenticateAdmin` - Verifies admin or super admin token
   - `setAdminUserContext` - Sets user context for admin accessing user data

## Usage

### Creating an Admin (Super Admin)

1. Login as super admin at `/super-admin/login`
2. Click "Create Admin"
3. Fill in username, password, name, and email
4. Click "Create Admin"

### Admin Managing Users

1. Login as admin at `/admin/login`
2. View list of assigned users
3. Click on a user to view/edit their data
4. Use tabs to navigate between different sections (Dashboard, Assets, Goals, etc.)
5. Create new users or delete existing ones

### Transferring Users (Super Admin)

1. Login as super admin
2. Go to "User Management" section
3. Click "Transfer" on a user
4. Select the admin to transfer to (or "Unassigned")
5. User is immediately transferred

## API Service Methods

The `ApiService` class includes methods for:
- Super admin authentication and admin management
- Admin authentication and user management
- Admin access to user financial data (all CRUD operations)

All admin financial data methods require `userId` parameter and use `/api/admin/financial/*` endpoints.

## Notes

- When an admin is deleted, users assigned to them are unassigned (admin_id set to NULL)
- When a user is deleted, all their financial data is deleted (CASCADE)
- Admin accounts can be deactivated without deletion
- Super admin cannot be deleted (only one exists)

## Troubleshooting

### Super Admin Login Not Working
1. Check if super admin exists: `SELECT * FROM super_admin WHERE username = 'superadmin'`
2. Run initialization script: `node scripts/init-super-admin.js`
3. Check password hash is correct

### Admin Cannot Access User Data
1. Verify user is assigned to admin: `SELECT * FROM "user" WHERE admin_id = <admin_id>`
2. Check admin token is valid
3. Verify `userId` parameter is being passed correctly

### Users Not Showing for Admin
1. Check user assignments: `SELECT * FROM "user" WHERE admin_id = <admin_id>`
2. Verify admin is active: `SELECT is_active FROM admin WHERE id = <admin_id>`
3. Check admin token in localStorage

