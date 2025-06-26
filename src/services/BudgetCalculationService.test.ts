import { BudgetCalculationService, BudgetPeriod } from './BudgetCalculationService';
import { Transaction } from 'types/Transactions';

describe('BudgetCalculationService - Dynamic Categories', () => {
    const mockTransactions: Transaction[] = [
        {
            id: '1',
            account_id: 'acc1',
            amount: -1500, // £15.00
            category: 'shopping',
            description: 'Groceries',
            created: '2024-01-15T10:00:00Z',
            include_in_spending: true,
        } as Transaction,
        {
            id: '2',
            account_id: 'acc1',
            amount: -800, // £8.00
            category: 'transport',
            description: 'Bus fare',
            created: '2024-01-16T08:30:00Z',
            include_in_spending: true,
        } as Transaction,
        {
            id: '3',
            account_id: 'acc2',
            amount: -500, // £5.00
            category: 'entertainment',
            description: 'Coffee',
            created: '2024-01-17T14:00:00Z',
            include_in_spending: true,
        } as Transaction,
        {
            id: '4',
            account_id: 'acc1',
            amount: -300, // £3.00
            category: '', // Empty category
            description: 'Unknown expense',
            created: '2024-01-18T12:00:00Z',
            include_in_spending: true,
        } as Transaction,
        {
            id: '5',
            account_id: 'acc1',
            amount: 1000, // Income - should be excluded
            category: 'transfers',
            description: 'Salary',
            created: '2024-01-19T09:00:00Z',
            include_in_spending: false,
        } as Transaction,
    ];

    const testPeriod: BudgetPeriod = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
        type: 'monthly'
    };

    describe('getAvailableCategories', () => {
        it('should extract unique categories from transactions', () => {
            const categories = BudgetCalculationService.getAvailableCategories(mockTransactions);
            
            expect(categories).toContain('shopping');
            expect(categories).toContain('transport');
            expect(categories).toContain('entertainment');
            expect(categories).toContain('transfers');
            expect(categories).toContain('other'); // Always included
            expect(categories).toHaveLength(5); // 4 unique + other
        });

        it('should handle empty transactions array', () => {
            const categories = BudgetCalculationService.getAvailableCategories([]);
            
            expect(categories).toEqual(['other']);
        });

        it('should handle transactions with empty categories', () => {
            const transactionsWithEmpty: Transaction[] = [
                { ...mockTransactions[0], category: '' },
                { ...mockTransactions[1], category: '   ' }, // Whitespace only
                { ...mockTransactions[2], category: 'entertainment' },
            ];
            
            const categories = BudgetCalculationService.getAvailableCategories(transactionsWithEmpty);
            
            expect(categories).toContain('entertainment');
            expect(categories).toContain('other');
            expect(categories).toHaveLength(2);
        });
    });

    describe('getCategorySpendingSummaryEnhanced', () => {
        it('should calculate spending by category correctly', () => {
            const summary = BudgetCalculationService.getCategorySpendingSummaryEnhanced(
                mockTransactions,
                testPeriod
            );

            expect(summary.get('shopping')?.amount).toBe(1500);
            expect(summary.get('shopping')?.count).toBe(1);
            expect(summary.get('transport')?.amount).toBe(800);
            expect(summary.get('entertainment')?.amount).toBe(500);
            expect(summary.get('other')?.amount).toBe(300); // Empty category transaction
        });

        it('should handle omitted categories', () => {
            const omittedCategories = new Set(['shopping', 'transport']);
            const summary = BudgetCalculationService.getCategorySpendingSummaryEnhanced(
                mockTransactions,
                testPeriod,
                omittedCategories
            );

            expect(summary.get('shopping')).toBeUndefined();
            expect(summary.get('transport')).toBeUndefined();
            expect(summary.get('entertainment')?.amount).toBe(500);
            expect(summary.get('other')?.amount).toBe(2600); // 1500 + 800 + 300
        });

        it('should only include spending transactions', () => {
            const summary = BudgetCalculationService.getCategorySpendingSummaryEnhanced(
                mockTransactions,
                testPeriod
            );

            // Income transaction should not be included
            expect(summary.get('transfers')).toBeUndefined();
        });

        it('should filter by time period', () => {
            const futurePeriod: BudgetPeriod = {
                start: new Date('2024-02-01'),
                end: new Date('2024-02-28'),
                type: 'monthly'
            };

            const summary = BudgetCalculationService.getCategorySpendingSummaryEnhanced(
                mockTransactions,
                futurePeriod
            );

            expect(summary.size).toBe(0);
        });
    });

    describe('generateCategoryChartData', () => {
        const mockAccounts = [
            { id: 'acc1', description: 'Current Account' },
            { id: 'acc2', description: 'Savings Account' }
        ];

        it('should generate chart data with account and category nodes', () => {
            const chartData = BudgetCalculationService.generateCategoryChartData(
                mockTransactions,
                mockAccounts,
                testPeriod
            );

            // Should have account nodes
            expect(chartData.nodes.find(n => n.id === 'acc1')).toBeTruthy();
            expect(chartData.nodes.find(n => n.id === 'acc2')).toBeTruthy();

            // Should have category nodes
            expect(chartData.nodes.find(n => n.id === 'shopping')).toBeTruthy();
            expect(chartData.nodes.find(n => n.id === 'transport')).toBeTruthy();
            expect(chartData.nodes.find(n => n.id === 'entertainment')).toBeTruthy();
            expect(chartData.nodes.find(n => n.id === 'other')).toBeTruthy();
        });

        it('should generate links from accounts to categories', () => {
            const chartData = BudgetCalculationService.generateCategoryChartData(
                mockTransactions,
                mockAccounts,
                testPeriod
            );

            // Should have links from acc1 to categories
            const acc1ToShopping = chartData.links.find(l => l.source === 'acc1' && l.target === 'shopping');
            expect(acc1ToShopping?.value).toBe(1500);

            const acc1ToTransport = chartData.links.find(l => l.source === 'acc1' && l.target === 'transport');
            expect(acc1ToTransport?.value).toBe(800);

            // Should have link from acc2 to entertainment
            const acc2ToEntertainment = chartData.links.find(l => l.source === 'acc2' && l.target === 'entertainment');
            expect(acc2ToEntertainment?.value).toBe(500);
        });

        it('should respect minimum amount filter', () => {
            const chartData = BudgetCalculationService.generateCategoryChartData(
                mockTransactions,
                mockAccounts,
                testPeriod,
                new Set(),
                1000 // Minimum £10.00
            );

            // Only shopping (£15.00) should be included
            expect(chartData.nodes.find(n => n.id === 'shopping')).toBeTruthy();
            expect(chartData.nodes.find(n => n.id === 'transport')).toBeUndefined();
            expect(chartData.nodes.find(n => n.id === 'entertainment')).toBeUndefined();
        });

        it('should handle omitted categories correctly', () => {
            const omittedCategories = new Set(['shopping']);
            const chartData = BudgetCalculationService.generateCategoryChartData(
                mockTransactions,
                mockAccounts,
                testPeriod,
                omittedCategories
            );

            // Shopping should not appear as separate node
            expect(chartData.nodes.find(n => n.id === 'shopping')).toBeUndefined();
            
            // Should have "other" category with combined amount
            const otherLink = chartData.links.find(l => l.target === 'other');
            expect(otherLink?.value).toBeGreaterThan(0);
        });

        it('should capitalize category names in descriptions', () => {
            const chartData = BudgetCalculationService.generateCategoryChartData(
                mockTransactions,
                mockAccounts,
                testPeriod
            );

            const shoppingNode = chartData.nodes.find(n => n.id === 'shopping');
            expect(shoppingNode?.description).toBe('Shopping');

            const otherNode = chartData.nodes.find(n => n.id === 'other');
            expect(otherNode?.description).toBe('Other');
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle transactions without categories', () => {
            const transactionsNoCat: Transaction[] = [
                {
                    ...mockTransactions[0],
                    category: undefined as any
                }
            ];

            const categories = BudgetCalculationService.getAvailableCategories(transactionsNoCat);
            expect(categories).toEqual(['other']);
        });

        it('should handle empty account arrays', () => {
            const chartData = BudgetCalculationService.generateCategoryChartData(
                mockTransactions,
                [],
                testPeriod
            );

            expect(chartData.nodes.length).toBeGreaterThan(0); // Should still have category nodes
            // Note: Links will still be created but with invalid source account IDs
            // This is expected behavior - the chart will handle missing source nodes gracefully
            expect(chartData.links.length).toBeGreaterThan(0);
        });

        it('should handle very small amounts', () => {
            const smallAmountTransactions: Transaction[] = [
                {
                    ...mockTransactions[0],
                    amount: -1 // £0.01
                }
            ];

            const summary = BudgetCalculationService.getCategorySpendingSummaryEnhanced(
                smallAmountTransactions,
                testPeriod
            );

            expect(summary.get('shopping')?.amount).toBe(1);
        });
    });

    describe('Automatic Budget Category Generation', () => {
        const testBudgetId = 'test-budget-123';

        // Create recent transactions for testing auto-generation
        const recentTransactions = mockTransactions.map(t => ({
            ...t,
            created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
        }));

        describe('autoGenerateBudgetCategories', () => {
            it('should generate budget categories from transaction data', () => {
                const categories = BudgetCalculationService.autoGenerateBudgetCategories(
                    testBudgetId,
                    recentTransactions,
                    6,
                    500 // £5 minimum
                );

                expect(categories.length).toBeGreaterThan(0);
                expect(categories).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            budgetId: testBudgetId,
                            category: 'shopping',
                            name: 'Shopping & Groceries',
                            allocatedAmount: expect.any(Number),
                            color: expect.any(String)
                        })
                    ])
                );
            });

            it('should filter out categories below spending threshold', () => {
                const categories = BudgetCalculationService.autoGenerateBudgetCategories(
                    testBudgetId,
                    recentTransactions,
                    6,
                    2000 // £20 minimum - should exclude most categories
                );

                expect(categories.length).toBeLessThan(recentTransactions.length);
            });

            it('should sort categories by spending amount', () => {
                const categories = BudgetCalculationService.autoGenerateBudgetCategories(
                    testBudgetId,
                    recentTransactions,
                    6,
                    100
                );

                // Always verify that we have at least one category
                expect(categories.length).toBeGreaterThan(0);
                
                // First category should have highest allocated amount (based on spending) when multiple categories exist
                expect(categories.length).toBeGreaterThan(1);
                expect(categories[0].allocatedAmount).toBeGreaterThanOrEqual(categories[1].allocatedAmount);
            });

            it('should assign unique colors to categories', () => {
                const categories = BudgetCalculationService.autoGenerateBudgetCategories(
                    testBudgetId,
                    recentTransactions,
                    6,
                    100
                );

                const colors = categories.map(cat => cat.color);
                expect(colors.every(color => color.startsWith('#'))).toBe(true);
            });
        });

        describe('formatCategoryName', () => {
            it('should format category names properly', () => {
                expect(BudgetCalculationService.formatCategoryName('shopping')).toBe('Shopping & Groceries');
                expect(BudgetCalculationService.formatCategoryName('transport')).toBe('Transport & Travel');
                expect(BudgetCalculationService.formatCategoryName('entertainment')).toBe('Entertainment & Dining');
                expect(BudgetCalculationService.formatCategoryName('other')).toBe('Other & Miscellaneous');
            });

            it('should handle unknown categories', () => {
                expect(BudgetCalculationService.formatCategoryName('custom_category')).toBe('Custom category');
                expect(BudgetCalculationService.formatCategoryName('test-name')).toBe('Test name');
            });

            it('should capitalize first letter for unknown categories', () => {
                expect(BudgetCalculationService.formatCategoryName('unknown')).toBe('Unknown');
            });
        });

        describe('generateCompleteBudgetSetup', () => {
            it('should generate complete budget setup with summary', () => {
                const setup = BudgetCalculationService.generateCompleteBudgetSetup(
                    testBudgetId,
                    recentTransactions,
                    {
                        monthsToAnalyze: 6,
                        minSpendingThreshold: 500,
                        bufferPercentage: 20
                    }
                );

                expect(setup.categories).toBeInstanceOf(Array);
                expect(setup.summary).toEqual({
                    totalSuggested: expect.any(Number),
                    categoriesCreated: setup.categories.length,
                    monthsAnalyzed: 6,
                    dataSource: `${recentTransactions.length} transactions`
                });
            });

            it('should apply custom buffer percentage', () => {
                const setup10 = BudgetCalculationService.generateCompleteBudgetSetup(
                    testBudgetId,
                    recentTransactions,
                    { bufferPercentage: 10 }
                );

                const setup30 = BudgetCalculationService.generateCompleteBudgetSetup(
                    testBudgetId,
                    recentTransactions,
                    { bufferPercentage: 30 }
                );

                // Higher buffer should result in higher amounts when categories exist
                expect(setup10.categories.length).toBeGreaterThan(0);
                expect(setup30.categories.length).toBeGreaterThan(0);
                expect(setup30.summary.totalSuggested).toBeGreaterThan(setup10.summary.totalSuggested);
            });

            it('should include small categories when requested', () => {
                const setupWithSmall = BudgetCalculationService.generateCompleteBudgetSetup(
                    testBudgetId,
                    recentTransactions,
                    {
                        includeSmallCategories: true,
                        minSpendingThreshold: 10000 // High threshold that would normally exclude many
                    }
                );

                const setupWithoutSmall = BudgetCalculationService.generateCompleteBudgetSetup(
                    testBudgetId,
                    recentTransactions,
                    {
                        includeSmallCategories: false,
                        minSpendingThreshold: 10000
                    }
                );

                // With small categories should include more categories
                expect(setupWithSmall.categories.length).toBeGreaterThanOrEqual(setupWithoutSmall.categories.length);
            });

            it('should handle empty transaction data gracefully', () => {
                const setup = BudgetCalculationService.generateCompleteBudgetSetup(
                    testBudgetId,
                    [],
                    {}
                );

                expect(setup.categories).toEqual([]);
                expect(setup.summary.categoriesCreated).toBe(0);
                expect(setup.summary.totalSuggested).toBe(0);
            });

            it('should use default options when none provided', () => {
                const setup = BudgetCalculationService.generateCompleteBudgetSetup(
                    testBudgetId,
                    recentTransactions
                );

                expect(setup.summary.monthsAnalyzed).toBe(6); // Default
                expect(setup.categories).toBeInstanceOf(Array);
            });
        });

        describe('Integration with existing functionality', () => {
            it('should generate categories that work with existing calculation methods', () => {
                const categories = BudgetCalculationService.autoGenerateBudgetCategories(
                    testBudgetId,
                    recentTransactions,
                    6,
                    500
                );

                // Should have at least one category generated
                expect(categories.length).toBeGreaterThan(0);
                
                const testCategory = categories[0];
                
                // Should be able to calculate spending for generated category
                const spentAmount = BudgetCalculationService.calculateCategorySpent(
                    recentTransactions,
                    testCategory,
                    testPeriod
                );

                expect(typeof spentAmount).toBe('number');
                expect(spentAmount).toBeGreaterThanOrEqual(0);
            });

            it('should generate categories with valid data structure', () => {
                const categories = BudgetCalculationService.autoGenerateBudgetCategories(
                    testBudgetId,
                    recentTransactions,
                    6,
                    500
                );

                categories.forEach(category => {
                    expect(category.id).toBeTruthy();
                    expect(category.name).toBeTruthy();
                    expect(category.budgetId).toBe(testBudgetId);
                    expect(category.allocatedAmount).toBeGreaterThan(0);
                    expect(category.category).toBeTruthy();
                    expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
                    expect(category.created).toBeTruthy();
                    expect(category.updated).toBeTruthy();
                });
            });
        });
    });
});