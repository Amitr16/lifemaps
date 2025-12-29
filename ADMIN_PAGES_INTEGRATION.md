# Admin Pages Integration Guide

## Current Status

✅ **Completed:**
- Super Admin page - Dashboard only (no navigation to individual pages)
- Admin page structure with user selection
- Navigation header when viewing a user (similar to Shell)
- Admin context provider (`AdminUserContext`)
- Admin API methods in `ApiService`
- LoansPage updated to work in admin mode

🔄 **In Progress:**
- Other pages (Assets, Work Assets, Goals, Expenses, Insurance, Dashboard) need to be updated to support admin mode

## How It Works

### Admin Flow
1. Admin logs in at `/admin/login`
2. Sees list of assigned users
3. Selects a user
4. Can navigate through all user pages (Dashboard, Assets, Work Assets, Goals, Loans, Expenses, Insurance)
5. Can view and edit all user data

### Super Admin Flow
1. Super Admin logs in at `/super-admin/login`
2. Sees admin management dashboard
3. Can create/manage admins
4. Can transfer users between admins
5. **No navigation to individual pages** (as requested)

## Pages That Need Admin Mode Support

To make a page work in admin mode, you need to:

1. **Import admin context:**
```javascript
import { useAdminUser } from '../contexts/AdminUserContext';
```

2. **Check for admin mode:**
```javascript
const adminUser = useAdminUser();
const isAdminMode = !!adminUser?.userId;
const userId = isAdminMode ? adminUser.userId : (user?.id || null);
```

3. **Use admin API methods when in admin mode:**
```javascript
// Instead of:
ApiService.getFinancialLoans(user.id)

// Use:
const response = isAdminMode 
  ? await ApiService.getFinancialLoansForUser(userId)
  : await ApiService.getFinancialLoans(userId);
```

## Example: LoansPage (Already Updated)

See `lifemaps/src/pages/LoansPage.jsx` for a complete example of how to update a page to support admin mode.

## Pages to Update

- [x] LoansPage - ✅ Done
- [ ] AssetsPage
- [ ] WorkAssetsPage  
- [ ] EnhancedGoalsPage
- [ ] ExpensesPage
- [ ] InsurancePage
- [ ] OriginalLifeSheet (Dashboard)

## Quick Update Pattern

For each page, follow this pattern:

1. Add admin context import
2. Get userId from admin context if available
3. Replace all `ApiService.getFinancialX(user.id)` with conditional that uses admin API when in admin mode
4. Replace all `ApiService.createFinancialX(data)` with conditional
5. Replace all `ApiService.updateFinancialX(id, data)` with conditional
6. Replace all `ApiService.deleteFinancialX(id)` with conditional

The admin API methods are already created in `ApiService` - just need to use them conditionally.

