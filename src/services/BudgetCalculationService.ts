import { Transaction } from 'types/Transactions';
import { Budget, BudgetCategory } from 'types/Budget';
import { isWithinInterval, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';

export interface CategoryMappingRule {
    budgetCategory: string;
    monzoCategories: string[];
    merchantPatterns?: string[];
    descriptionPatterns?: string[];
}

export interface BudgetPeriod {
    start: Date;
    end: Date;
    type: 'monthly' | 'yearly' | 'custom';
}

export class BudgetCalculationService {
    private static readonly DEFAULT_CATEGORY_MAPPINGS: CategoryMappingRule[] = [
        {
            budgetCategory: 'groceries',
            monzoCategories: ['shopping'],
            merchantPatterns: ['tesco', 'asda', 'sainsbury', 'morrisons', 'aldi', 'lidl', 'iceland', 'waitrose'],
            descriptionPatterns: ['grocery', 'supermarket', 'food shopping']
        },
        {
            budgetCategory: 'transport',
            monzoCategories: ['transport'],
            merchantPatterns: ['uber', 'bolt', 'citymapper', 'tfl', 'trainline', 'shell', 'bp', 'esso'],
            descriptionPatterns: ['fuel', 'petrol', 'diesel', 'parking', 'taxi', 'bus', 'train']
        },
        {
            budgetCategory: 'entertainment',
            monzoCategories: ['entertainment'],
            merchantPatterns: ['spotify', 'netflix', 'amazon prime', 'disney', 'cinema', 'pub', 'bar'],
            descriptionPatterns: ['entertainment', 'streaming', 'subscription', 'drinks', 'movie']
        },
        {
            budgetCategory: 'bills',
            monzoCategories: ['bills'],
            merchantPatterns: ['british gas', 'eon', 'vodafone', 'ee', 'three', 'sky', 'bt'],
            descriptionPatterns: ['utility', 'electric', 'gas', 'water', 'internet', 'phone', 'insurance']
        },
        {
            budgetCategory: 'general',
            monzoCategories: ['general', 'expenses'],
            merchantPatterns: [],
            descriptionPatterns: ['general', 'miscellaneous', 'other']
        }
    ];

    /**
     * Calculate spent amount for a budget category based on transactions
     */
    static calculateCategorySpent(
        transactions: Transaction[],
        budgetCategory: BudgetCategory,
        period: BudgetPeriod,
        customMappings?: CategoryMappingRule[]
    ): number {
        const mappings = customMappings || this.DEFAULT_CATEGORY_MAPPINGS;
        const relevantTransactions = this.getTransactionsForCategory(
            transactions,
            budgetCategory,
            period,
            mappings
        );

        return relevantTransactions.reduce((sum, transaction) => {
            // Only count spending transactions (negative amounts)
            if (transaction.amount < 0 && transaction.include_in_spending) {
                return sum + Math.abs(transaction.amount);
            }
            return sum;
        }, 0);
    }

    /**
     * Calculate spent amounts for all budget categories
     */
    static calculateBudgetSpending(
        transactions: Transaction[],
        budgetCategories: BudgetCategory[],
        period: BudgetPeriod,
        customMappings?: CategoryMappingRule[]
    ): Map<string, number> {
        const spendingMap = new Map<string, number>();

        budgetCategories.forEach(category => {
            const spent = this.calculateCategorySpent(
                transactions,
                category,
                period,
                customMappings
            );
            spendingMap.set(category.id, spent);
        });

        return spendingMap;
    }

    /**
     * Get transactions that match a specific budget category
     */
    private static getTransactionsForCategory(
        transactions: Transaction[],
        budgetCategory: BudgetCategory,
        period: BudgetPeriod,
        mappings: CategoryMappingRule[]
    ): Transaction[] {
        const categoryRule = mappings.find(rule => 
            rule.budgetCategory.toLowerCase() === budgetCategory.category.toLowerCase()
        );

        if (!categoryRule) {
            // Fallback to direct category matching
            return transactions.filter(transaction => 
                this.isTransactionInPeriod(transaction, period) &&
                transaction.category === budgetCategory.category
            );
        }

        return transactions.filter(transaction => {
            if (!this.isTransactionInPeriod(transaction, period)) {
                return false;
            }

            return this.matchesCategory(transaction, categoryRule);
        });
    }

    /**
     * Check if a transaction matches a category rule
     */
    private static matchesCategory(transaction: Transaction, rule: CategoryMappingRule): boolean {
        // Check Monzo category match
        if (rule.monzoCategories.includes(transaction.category)) {
            return true;
        }

        // Check merchant pattern match
        if (rule.merchantPatterns && transaction.merchant?.name) {
            const merchantName = transaction.merchant.name.toLowerCase();
            if (rule.merchantPatterns.some(pattern => 
                merchantName.includes(pattern.toLowerCase())
            )) {
                return true;
            }
        }

        // Check description pattern match
        if (rule.descriptionPatterns && transaction.description) {
            const description = transaction.description.toLowerCase();
            if (rule.descriptionPatterns.some(pattern => 
                description.includes(pattern.toLowerCase())
            )) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a transaction falls within the budget period
     */
    private static isTransactionInPeriod(transaction: Transaction, period: BudgetPeriod): boolean {
        const transactionDate = new Date(transaction.created);
        return isWithinInterval(transactionDate, { start: period.start, end: period.end });
    }

    /**
     * Get budget period for a specific budget
     */
    static getBudgetPeriod(budget: Budget): BudgetPeriod {
        const year = budget.year;
        return {
            start: startOfYear(new Date(year, 0, 1)),
            end: endOfYear(new Date(year, 11, 31)),
            type: 'yearly'
        };
    }

    /**
     * Get current month budget period
     */
    static getCurrentMonthPeriod(): BudgetPeriod {
        const now = new Date();
        return {
            start: startOfMonth(now),
            end: endOfMonth(now),
            type: 'monthly'
        };
    }

    /**
     * Get available Monzo categories from transactions
     */
    static getAvailableCategories(transactions: Transaction[]): string[] {
        const categories = new Set<string>();
        transactions.forEach(transaction => {
            if (transaction.category) {
                categories.add(transaction.category);
            }
        });
        return Array.from(categories).sort();
    }

    /**
     * Get category spending summary for a period
     */
    static getCategorySpendingSummary(
        transactions: Transaction[],
        period: BudgetPeriod
    ): Map<string, number> {
        const spendingMap = new Map<string, number>();

        transactions
            .filter(transaction => 
                this.isTransactionInPeriod(transaction, period) &&
                transaction.amount < 0 &&
                transaction.include_in_spending
            )
            .forEach(transaction => {
                const category = transaction.category || 'uncategorized';
                const currentAmount = spendingMap.get(category) || 0;
                spendingMap.set(category, currentAmount + Math.abs(transaction.amount));
            });

        return spendingMap;
    }

    /**
     * Update budget category with calculated spending
     */
    static updateBudgetCategorySpending(
        budgetCategory: BudgetCategory,
        transactions: Transaction[],
        period: BudgetPeriod,
        customMappings?: CategoryMappingRule[]
    ): BudgetCategory {
        const spentAmount = this.calculateCategorySpent(
            transactions,
            budgetCategory,
            period,
            customMappings
        );

        return {
            ...budgetCategory,
            spentAmount,
            updated: new Date().toISOString()
        };
    }

    /**
     * Create a new budget category with automatic spending calculation
     */
    static createBudgetCategory(
        budgetId: string,
        name: string,
        category: string,
        allocatedAmount: number,
        transactions: Transaction[],
        period: BudgetPeriod,
        color: string = '#3B82F6',
        customMappings?: CategoryMappingRule[]
    ): BudgetCategory {
        const newCategory: BudgetCategory = {
            id: crypto.randomUUID(),
            name,
            budgetId,
            allocatedAmount,
            spentAmount: 0,
            category,
            color,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        // Calculate initial spending
        return this.updateBudgetCategorySpending(
            newCategory,
            transactions,
            period,
            customMappings
        );
    }

    /**
     * Get suggested budget amounts based on historical spending
     */
    static getSuggestedBudgetAmounts(
        transactions: Transaction[],
        category: string,
        monthsToAnalyze: number = 6
    ): { suggested: number; average: number; min: number; max: number } {
        const now = new Date();
        const monthlySpending: number[] = [];

        for (let i = 0; i < monthsToAnalyze; i++) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            
            const monthPeriod: BudgetPeriod = {
                start: monthStart,
                end: monthEnd,
                type: 'monthly'
            };

            const monthlyTotal = transactions
                .filter(transaction => 
                    this.isTransactionInPeriod(transaction, monthPeriod) &&
                    transaction.category === category &&
                    transaction.amount < 0 &&
                    transaction.include_in_spending
                )
                .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

            if (monthlyTotal > 0) {
                monthlySpending.push(monthlyTotal);
            }
        }

        if (monthlySpending.length === 0) {
            return { suggested: 0, average: 0, min: 0, max: 0 };
        }

        const average = monthlySpending.reduce((sum, amount) => sum + amount, 0) / monthlySpending.length;
        const min = Math.min(...monthlySpending);
        const max = Math.max(...monthlySpending);
        
        // Suggest 20% buffer above average
        const suggested = Math.round(average * 1.2);

        return { suggested, average, min, max };
    }

    /**
     * Validate budget category mappings
     */
    static validateCategoryMappings(mappings: CategoryMappingRule[]): string[] {
        const errors: string[] = [];
        const budgetCategories = new Set<string>();

        mappings.forEach((mapping, index) => {
            if (!mapping.budgetCategory) {
                errors.push(`Mapping ${index}: budgetCategory is required`);
            } else if (budgetCategories.has(mapping.budgetCategory)) {
                errors.push(`Mapping ${index}: budgetCategory "${mapping.budgetCategory}" is duplicated`);
            } else {
                budgetCategories.add(mapping.budgetCategory);
            }

            if (!mapping.monzoCategories || mapping.monzoCategories.length === 0) {
                errors.push(`Mapping ${index}: at least one monzoCategory is required`);
            }
        });

        return errors;
    }
}