import { BudgetCalculationService, CategoryMappingRule, BudgetPeriod } from './BudgetCalculationService';
import { Transaction } from 'types/Transactions';
import { BudgetCategory } from 'types/Budget';

describe('BudgetCalculationService', () => {
    const mockTransactions: Transaction[] = [
        {
            id: '1',
            account_id: 'acc1',
            amount: -5000, // £50.00
            amount_is_pending: false,
            can_add_to_tab: false,
            can_be_excluded_from_breakdown: true,
            can_be_made_subscription: false,
            can_match_transactions_in_categorization: true,
            can_split_the_bill: false,
            categories: { shopping: 1 },
            category: 'shopping',
            created: '2024-01-15T10:00:00Z',
            currency: 'GBP',
            dedupe_id: 'dedupe1',
            description: 'Tesco groceries',
            fees: {},
            include_in_spending: true,
            is_load: false,
            local_amount: -5000,
            local_currency: 'GBP',
            merchant: { 
                id: 'merchant1',
                group_id: 'group1',
                name: 'Tesco', 
                logo: '', 
                emoji: '🛒',
                category: 'shopping',
                online: false,
                atm: false,
                address: {
                    short_formatted: 'Tesco Store',
                    city: 'London',
                    latitude: 51.5074,
                    longitude: -0.1278,
                    zoom_level: 10,
                    approximate: false,
                    formatted: 'Tesco Store, London',
                    address: 'High Street',
                    region: 'London',
                    country: 'UK',
                    postcode: 'SW1A 1AA'
                },
                disable_feedback: false,
                suggested_tags: '',
                metadata: { suggested_tags: '', website: '' }
            },
            merchant_feedback_uri: '',
            metadata: {},
            notes: '',
            originator: false,
            parent_account_id: 'acc1',
            scheme: 'mastercard',
            settled: '2024-01-15T10:00:00Z',
            updated: '2024-01-15T10:00:00Z',
            user_id: 'user1'
        },
        {
            id: '2',
            account_id: 'acc1',
            amount: -3000, // £30.00
            amount_is_pending: false,
            can_add_to_tab: false,
            can_be_excluded_from_breakdown: true,
            can_be_made_subscription: false,
            can_match_transactions_in_categorization: true,
            can_split_the_bill: false,
            categories: { transport: 1 },
            category: 'transport',
            created: '2024-01-20T14:30:00Z',
            currency: 'GBP',
            dedupe_id: 'dedupe2',
            description: 'Uber ride',
            fees: {},
            include_in_spending: true,
            is_load: false,
            local_amount: -3000,
            local_currency: 'GBP',
            merchant: { 
                id: 'merchant2',
                group_id: 'group2',
                name: 'Uber', 
                logo: '', 
                emoji: '🚗',
                category: 'transport',
                online: true,
                atm: false,
                address: {
                    short_formatted: 'Uber Technologies',
                    city: 'London',
                    latitude: 51.5074,
                    longitude: -0.1278,
                    zoom_level: 10,
                    approximate: false,
                    formatted: 'Uber Technologies, London',
                    address: 'Tech Street',
                    region: 'London',
                    country: 'UK',
                    postcode: 'W1A 1AA'
                },
                disable_feedback: false,
                suggested_tags: '',
                metadata: { suggested_tags: '', website: 'uber.com' }
            },
            merchant_feedback_uri: '',
            metadata: {},
            notes: '',
            originator: false,
            parent_account_id: 'acc1',
            scheme: 'mastercard',
            settled: '2024-01-20T14:30:00Z',
            updated: '2024-01-20T14:30:00Z',
            user_id: 'user1'
        }
    ];

    const mockBudgetCategory: BudgetCategory = {
        id: 'cat1',
        name: 'Groceries',
        budgetId: 'budget1',
        allocatedAmount: 10000, // £100.00
        spentAmount: 0,
        category: 'shopping',
        color: '#3B82F6',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
    };

    const testPeriod: BudgetPeriod = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
        type: 'monthly'
    };

    describe('calculateCategorySpent', () => {
        it('should calculate spent amount for a category', () => {
            const spent = BudgetCalculationService.calculateCategorySpent(
                mockTransactions,
                mockBudgetCategory,
                testPeriod
            );

            // Should match the shopping transaction (£50.00)
            expect(spent).toBe(5000);
        });

        it('should return 0 for category with no matching transactions', () => {
            const categoryWithNoTransactions: BudgetCategory = {
                ...mockBudgetCategory,
                category: 'entertainment'
            };

            const spent = BudgetCalculationService.calculateCategorySpent(
                mockTransactions,
                categoryWithNoTransactions,
                testPeriod
            );

            expect(spent).toBe(0);
        });
    });

    describe('getAvailableCategories', () => {
        it('should return unique categories from transactions', () => {
            const categories = BudgetCalculationService.getAvailableCategories(mockTransactions);
            
            expect(categories).toEqual(['shopping', 'transport']);
        });

        it('should return sorted categories', () => {
            const unsortedTransactions = [
                { ...mockTransactions[0], category: 'zzz_category' },
                { ...mockTransactions[1], category: 'aaa_category' }
            ];

            const categories = BudgetCalculationService.getAvailableCategories(unsortedTransactions);
            
            expect(categories).toEqual(['aaa_category', 'zzz_category']);
        });
    });

    describe('getSuggestedBudgetAmounts', () => {
        it('should calculate suggested amounts based on historical spending', () => {
            // Create transactions from the current month to ensure they're included
            const currentDate = new Date();
            const currentTransactions = [
                {
                    ...mockTransactions[0],
                    created: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15).toISOString()
                }
            ];

            const result = BudgetCalculationService.getSuggestedBudgetAmounts(
                currentTransactions,
                'shopping'
            );

            expect(result.average).toBe(5000); // £50.00 average
            expect(result.suggested).toBe(6000); // £60.00 (20% buffer)
            expect(result.min).toBe(5000);
            expect(result.max).toBe(5000);
        });

        it('should return zeros for category with no spending', () => {
            const result = BudgetCalculationService.getSuggestedBudgetAmounts(
                mockTransactions,
                'entertainment'
            );

            expect(result.average).toBe(0);
            expect(result.suggested).toBe(0);
            expect(result.min).toBe(0);
            expect(result.max).toBe(0);
        });
    });

    describe('validateCategoryMappings', () => {
        it('should validate correct mappings', () => {
            const validMappings: CategoryMappingRule[] = [
                {
                    budgetCategory: 'groceries',
                    monzoCategories: ['shopping'],
                    merchantPatterns: ['tesco']
                }
            ];

            const errors = BudgetCalculationService.validateCategoryMappings(validMappings);
            expect(errors).toEqual([]);
        });

        it('should catch missing budget category', () => {
            const invalidMappings: CategoryMappingRule[] = [
                {
                    budgetCategory: '',
                    monzoCategories: ['shopping']
                }
            ];

            const errors = BudgetCalculationService.validateCategoryMappings(invalidMappings);
            expect(errors).toContain('Mapping 0: budgetCategory is required');
        });

        it('should catch missing monzo categories', () => {
            const invalidMappings: CategoryMappingRule[] = [
                {
                    budgetCategory: 'groceries',
                    monzoCategories: []
                }
            ];

            const errors = BudgetCalculationService.validateCategoryMappings(invalidMappings);
            expect(errors).toContain('Mapping 0: at least one monzoCategory is required');
        });
    });
});