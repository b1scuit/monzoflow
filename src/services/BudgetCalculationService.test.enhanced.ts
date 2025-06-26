import { BudgetCalculationService } from './BudgetCalculationService';
import { Transaction } from '../types/Transactions';
import { MonthlyCycleConfig } from '../types/UserPreferences';

describe('BudgetCalculationService - Custom Monthly Cycle Integration', () => {
    const mockTransactions: Transaction[] = [
        {
            id: '1',
            amount: -5000, // £50.00
            category: 'shopping',
            created: '2024-01-15T10:00:00Z',
            description: 'Grocery shopping',
            include_in_spending: true,
            account_id: 'acc1',
            merchant: { name: 'Tesco' }
        },
        {
            id: '2',
            amount: -3000, // £30.00
            category: 'shopping',
            created: '2024-02-20T14:00:00Z',
            description: 'Weekly shop',
            include_in_spending: true,
            account_id: 'acc1',
            merchant: { name: 'ASDA' }
        },
        {
            id: '3',
            amount: -4500, // £45.00
            category: 'shopping',
            created: '2024-03-10T09:00:00Z',
            description: 'Food shopping',
            include_in_spending: true,
            account_id: 'acc1',
            merchant: { name: 'Sainsburys' }
        },
        {
            id: '4',
            amount: -2000, // £20.00
            category: 'transport',
            created: '2024-01-25T16:00:00Z',
            description: 'Bus fare',
            include_in_spending: true,
            account_id: 'acc1',
            merchant: { name: 'TFL' }
        }
    ];

    describe('getSuggestedBudgetAmountsWithCustomCycle', () => {
        it('should calculate suggestions based on custom monthly cycles', () => {
            const monthlyCycleConfig: MonthlyCycleConfig = {
                type: 'specific_date',
                date: 15
            };

            const result = BudgetCalculationService.getSuggestedBudgetAmountsWithCustomCycle(
                mockTransactions,
                'shopping',
                monthlyCycleConfig,
                3
            );

            // Should have found spending data
            expect(result.average).toBeGreaterThan(0);
            expect(result.suggested).toBeGreaterThan(result.average);
            expect(result.min).toBeGreaterThan(0);
            expect(result.max).toBeGreaterThan(0);
        });

        it('should return zeros for categories with no spending', () => {
            const monthlyCycleConfig: MonthlyCycleConfig = {
                type: 'specific_date',
                date: 1
            };

            const result = BudgetCalculationService.getSuggestedBudgetAmountsWithCustomCycle(
                mockTransactions,
                'nonexistent_category',
                monthlyCycleConfig,
                3
            );

            expect(result.average).toBe(0);
            expect(result.suggested).toBe(0);
            expect(result.min).toBe(0);
            expect(result.max).toBe(0);
        });

        it('should handle last working day cycle type', () => {
            const monthlyCycleConfig: MonthlyCycleConfig = {
                type: 'last_working_day'
            };

            const result = BudgetCalculationService.getSuggestedBudgetAmountsWithCustomCycle(
                mockTransactions,
                'shopping',
                monthlyCycleConfig,
                2
            );

            // Should complete without errors and return valid data
            expect(typeof result.average).toBe('number');
            expect(typeof result.suggested).toBe('number');
            expect(typeof result.min).toBe('number');
            expect(typeof result.max).toBe('number');
        });

        it('should handle closest workday cycle type', () => {
            const monthlyCycleConfig: MonthlyCycleConfig = {
                type: 'closest_workday',
                date: 25
            };

            const result = BudgetCalculationService.getSuggestedBudgetAmountsWithCustomCycle(
                mockTransactions,
                'transport',
                monthlyCycleConfig,
                2
            );

            // Should complete without errors
            expect(typeof result.average).toBe('number');
            expect(typeof result.suggested).toBe('number');
        });
    });

    describe('Custom cycle period calculations', () => {
        it('should use custom monthly periods for budget calculations', () => {
            const monthlyCycleConfig: MonthlyCycleConfig = {
                type: 'specific_date',
                date: 25
            };

            const customPeriod = BudgetCalculationService.getCurrentCustomMonthlyPeriod(monthlyCycleConfig);
            
            expect(customPeriod.start).toBeDefined();
            expect(customPeriod.end).toBeDefined();
            expect(customPeriod.type).toBe('monthly');
            expect(customPeriod.start.getTime()).toBeLessThan(customPeriod.end.getTime());
        });

        it('should generate multiple past custom periods', () => {
            const monthlyCycleConfig: MonthlyCycleConfig = {
                type: 'last_working_day'
            };

            const periods = BudgetCalculationService.getPastCustomMonthlyPeriods(monthlyCycleConfig, 3);
            
            expect(periods).toHaveLength(3);
            expect(periods[0].start.getTime()).toBeLessThan(periods[1].start.getTime());
            expect(periods[1].start.getTime()).toBeLessThan(periods[2].start.getTime());
        });
    });
});