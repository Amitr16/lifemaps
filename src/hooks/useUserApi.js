import { useAuth } from '../contexts/AuthContext';
import { useAdminUser } from '../contexts/AdminUserContext';
import ApiService from '../services/api';

/**
 * Hook that provides the correct API methods and userId based on context
 * - If in admin context (viewing a user), uses admin API methods
 * - Otherwise, uses regular user API methods
 */
export function useUserApi() {
  const { user } = useAuth();
  const adminUser = useAdminUser();
  
  const isAdminMode = !!adminUser?.userId;
  const userId = isAdminMode ? adminUser.userId : (user?.id || null);

  // Return admin API methods if in admin mode, otherwise regular methods
  if (isAdminMode) {
    return {
      userId,
      isAdminMode: true,
      // Financial Profile
      getFinancialProfile: () => ApiService.getFinancialProfileForUser(userId),
      updateFinancialProfile: (profileId, data) => ApiService.updateFinancialProfileForUser(profileId, data, userId),
      
      // Goals
      getFinancialGoals: () => ApiService.getFinancialGoalsForUser(userId),
      createFinancialGoal: (data) => ApiService.createFinancialGoalForUser(data, userId),
      updateFinancialGoal: (goalId, data) => ApiService.updateFinancialGoalForUser(goalId, data, userId),
      deleteFinancialGoal: (goalId) => ApiService.deleteFinancialGoalForUser(goalId, userId),
      
      // Expenses
      getFinancialExpenses: () => ApiService.getFinancialExpensesForUser(userId),
      createFinancialExpense: (data) => ApiService.createFinancialExpenseForUser(data, userId),
      updateFinancialExpense: (expenseId, data) => ApiService.updateFinancialExpenseForUser(expenseId, data, userId),
      deleteFinancialExpense: (expenseId) => ApiService.deleteFinancialExpenseForUser(expenseId, userId),
      
      // Loans
      getFinancialLoans: () => ApiService.getFinancialLoansForUser(userId),
      createFinancialLoan: (data) => ApiService.createFinancialLoanForUser(data, userId),
      updateFinancialLoan: (loanId, data) => ApiService.updateFinancialLoanForUser(loanId, data, userId),
      deleteFinancialLoan: (loanId) => ApiService.deleteFinancialLoanForUser(loanId, userId),
      
      // Assets
      getFinancialAssets: () => ApiService.getFinancialAssetsForUser(userId),
      createFinancialAsset: (data) => ApiService.createFinancialAssetForUser(data, userId),
      updateFinancialAsset: (assetId, data) => ApiService.updateFinancialAssetForUser(assetId, data, userId),
      deleteFinancialAsset: (assetId) => ApiService.deleteFinancialAssetForUser(assetId, userId),
      
      // Work Assets
      getWorkAssets: () => ApiService.getWorkAssetsForUser(userId),
      createWorkAsset: (data) => ApiService.createWorkAssetForUser(data, userId),
      updateWorkAsset: (assetId, data) => ApiService.updateWorkAssetForUser(assetId, data, userId),
      deleteWorkAsset: (assetId) => ApiService.deleteWorkAssetForUser(assetId, userId),
      
      // Insurance
      getFinancialInsurance: () => ApiService.getFinancialInsuranceForUser(userId),
      createFinancialInsurance: (data) => ApiService.createFinancialInsuranceForUser(data, userId),
      updateFinancialInsurance: (insuranceId, data) => ApiService.updateFinancialInsuranceForUser(insuranceId, data, userId),
      deleteFinancialInsurance: (insuranceId) => ApiService.deleteFinancialInsuranceForUser(insuranceId, userId),
    };
  }

  // Regular user mode
  return {
    userId,
    isAdminMode: false,
    // Financial Profile
    getFinancialProfile: () => ApiService.getFinancialProfile(userId),
    updateFinancialProfile: (profileId, data) => ApiService.updateFinancialProfile(profileId, data),
    
    // Goals
    getFinancialGoals: () => ApiService.getFinancialGoals(userId),
    createFinancialGoal: (data) => ApiService.createFinancialGoal(data),
    updateFinancialGoal: (goalId, data) => ApiService.updateFinancialGoal(goalId, data),
    deleteFinancialGoal: (goalId) => ApiService.deleteFinancialGoal(goalId),
    
    // Expenses
    getFinancialExpenses: () => ApiService.getFinancialExpenses(userId),
    createFinancialExpense: (data) => ApiService.createFinancialExpense(data),
    updateFinancialExpense: (expenseId, data) => ApiService.updateFinancialExpense(expenseId, data),
    deleteFinancialExpense: (expenseId) => ApiService.deleteFinancialExpense(expenseId),
    
    // Loans
    getFinancialLoans: () => ApiService.getFinancialLoans(userId),
    createFinancialLoan: (data) => ApiService.createFinancialLoan(data),
    updateFinancialLoan: (loanId, data) => ApiService.updateFinancialLoan(loanId, data),
    deleteFinancialLoan: (loanId) => ApiService.deleteFinancialLoan(loanId),
    
    // Assets
    getFinancialAssets: () => ApiService.getFinancialAssets(userId),
    createFinancialAsset: (data) => ApiService.createFinancialAsset(data),
    updateFinancialAsset: (assetId, data) => ApiService.updateFinancialAsset(assetId, data),
    deleteFinancialAsset: (assetId) => ApiService.deleteFinancialAsset(assetId),
    
    // Work Assets
    getWorkAssets: () => ApiService.getWorkAssets(userId),
    createWorkAsset: (data) => ApiService.createWorkAsset(data),
    updateWorkAsset: (assetId, data) => ApiService.updateWorkAsset(assetId, data),
    deleteWorkAsset: (assetId) => ApiService.deleteWorkAsset(assetId),
    
    // Insurance
    getFinancialInsurance: () => ApiService.getFinancialInsurance(userId),
    createFinancialInsurance: (data) => ApiService.createFinancialInsurance(data),
    updateFinancialInsurance: (insuranceId, data) => ApiService.updateFinancialInsurance(insuranceId, data),
    deleteFinancialInsurance: (insuranceId) => ApiService.deleteFinancialInsurance(insuranceId),
  };
}

