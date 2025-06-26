import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { Budget, BudgetCategory } from 'types/Budget';
import { Transaction } from 'types/Transactions';
import { BudgetCalculationService, BudgetPeriod, CategoryMappingRule } from 'services/BudgetCalculationService';
import { MonthlyCycleConfig } from 'types/UserPreferences';

export interface BudgetCalculationHookResult {
    budgetCategories: BudgetCategory[];
    totalBudgeted: number;
    totalSpent: number;
    budgetRemaining: number;
    spentPercentage: number;
    isLoading: boolean;
    error: string | null;
    refreshBudgetCalculations: () => Promise<void>;
    updateBudgetCategory: (categoryId: string, updates: Partial<BudgetCategory>) => Promise<void>;
    getCategoryTransactions: (categoryId: string) => Transaction[];
    getSuggestedAmount: (category: string) => { suggested: number; average: number; min: number; max: number };
}

export interface UseBudgetCalculationOptions {
    budget: Budget | null;
    period?: BudgetPeriod;
    customMappings?: CategoryMappingRule[];
    autoRefresh?: boolean;
    monthlyCycleConfig?: MonthlyCycleConfig;
}

export const useBudgetCalculation = (options: UseBudgetCalculationOptions): BudgetCalculationHookResult => {
    const { budget, period, customMappings, autoRefresh = true, monthlyCycleConfig } = options;
    const db = useDatabase();
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get budget categories from database
    const budgetCategories = useLiveQuery(
        () => budget ? db.budgetCategories.where('budgetId').equals(budget.id).toArray() : [],
        [budget?.id]
    );

    // Get all transactions for calculation
    const transactions = useLiveQuery(
        () => db.transactions.toArray(),
        []
    );

    // Calculate budget period if not provided, considering custom monthly cycles
    const calculationPeriod = period || (budget ? 
        BudgetCalculationService.getBudgetPeriodWithCustomCycle(budget, monthlyCycleConfig) : 
        (monthlyCycleConfig ? 
            BudgetCalculationService.getCurrentCustomMonthlyPeriod(monthlyCycleConfig) :
            BudgetCalculationService.getCurrentMonthPeriod()
        )
    );

    // Calculate totals
    const totalBudgeted = budgetCategories?.reduce((sum, cat) => sum + cat.allocatedAmount, 0) || 0;
    const totalSpent = budgetCategories?.reduce((sum, cat) => sum + cat.spentAmount, 0) || 0;
    const budgetRemaining = totalBudgeted - totalSpent;
    const spentPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    /**
     * Refresh budget calculations by updating spent amounts
     */
    const refreshBudgetCalculations = useCallback(async () => {
        if (!budget || !budgetCategories || !transactions) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Calculate spending for each category
            const spendingMap = BudgetCalculationService.calculateBudgetSpending(
                transactions,
                budgetCategories,
                calculationPeriod,
                customMappings
            );

            // Update each category with new spent amount
            const updatePromises = budgetCategories.map(async (category) => {
                const newSpentAmount = spendingMap.get(category.id) || 0;
                
                if (Math.abs(newSpentAmount - category.spentAmount) > 0.01) {
                    const updatedCategory: BudgetCategory = {
                        ...category,
                        spentAmount: newSpentAmount,
                        updated: new Date().toISOString()
                    };
                    
                    await db.budgetCategories.put(updatedCategory);
                }
            });

            await Promise.all(updatePromises);
        } catch (err) {
            console.error('Error refreshing budget calculations:', err);
            setError('Failed to refresh budget calculations');
        } finally {
            setIsLoading(false);
        }
    }, [budget, budgetCategories, transactions, calculationPeriod, customMappings, db.budgetCategories]);

    /**
     * Update a specific budget category
     */
    const updateBudgetCategory = useCallback(async (categoryId: string, updates: Partial<BudgetCategory>) => {
        if (!budgetCategories) return;

        const category = budgetCategories.find(cat => cat.id === categoryId);
        if (!category) {
            throw new Error(`Budget category with id ${categoryId} not found`);
        }

        const updatedCategory: BudgetCategory = {
            ...category,
            ...updates,
            updated: new Date().toISOString()
        };

        await db.budgetCategories.put(updatedCategory);
    }, [budgetCategories, db.budgetCategories]);

    /**
     * Get transactions for a specific budget category
     */
    const getCategoryTransactions = useCallback((categoryId: string): Transaction[] => {
        if (!budgetCategories || !transactions) return [];

        const category = budgetCategories.find(cat => cat.id === categoryId);
        if (!category) return [];

        // Use the mapping rules to find matching transactions
        const mappings = customMappings || [];
        const categoryRule = mappings.find(rule => 
            rule.budgetCategory.toLowerCase() === category.category.toLowerCase()
        );

        if (!categoryRule) {
            // Fallback to direct category matching
            return transactions.filter(transaction => {
                const transactionDate = new Date(transaction.created);
                const isInPeriod = transactionDate >= calculationPeriod.start && transactionDate <= calculationPeriod.end;
                
                return isInPeriod &&
                    transaction.category === category.category &&
                    transaction.amount < 0 &&
                    transaction.include_in_spending;
            });
        }

        // Use service methods directly without private access
        return transactions.filter(transaction => {
            const transactionDate = new Date(transaction.created);
            const isInPeriod = transactionDate >= calculationPeriod.start && transactionDate <= calculationPeriod.end;
            
            if (!isInPeriod || transaction.amount >= 0 || !transaction.include_in_spending) {
                return false;
            }

            // Simple category matching - will be enhanced with the mapping service
            return transaction.category === category.category;
        });
    }, [budgetCategories, transactions, calculationPeriod, customMappings]);

    /**
     * Get suggested budget amount for a category using custom monthly cycles
     */
    const getSuggestedAmount = useCallback((category: string) => {
        if (!transactions) {
            return { suggested: 0, average: 0, min: 0, max: 0 };
        }

        // If we have a custom monthly cycle config, use it for historical analysis
        if (monthlyCycleConfig && (monthlyCycleConfig.type !== 'specific_date' || monthlyCycleConfig.date !== 1)) {
            return BudgetCalculationService.getSuggestedBudgetAmountsWithCustomCycle(
                transactions, 
                category, 
                monthlyCycleConfig
            );
        }

        return BudgetCalculationService.getSuggestedBudgetAmounts(transactions, category);
    }, [transactions, monthlyCycleConfig]);

    // Auto-refresh calculations when data changes
    useEffect(() => {
        if (autoRefresh && budgetCategories && transactions) {
            refreshBudgetCalculations();
        }
    }, [autoRefresh, budgetCategories, transactions, refreshBudgetCalculations]);

    // Set loading state
    useEffect(() => {
        if (budgetCategories !== undefined && transactions !== undefined) {
            setIsLoading(false);
        }
    }, [budgetCategories, transactions]);

    return {
        budgetCategories: budgetCategories || [],
        totalBudgeted,
        totalSpent,
        budgetRemaining,
        spentPercentage,
        isLoading,
        error,
        refreshBudgetCalculations,
        updateBudgetCategory,
        getCategoryTransactions,
        getSuggestedAmount
    };
};