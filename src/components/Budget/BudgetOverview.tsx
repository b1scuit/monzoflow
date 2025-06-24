import { FC, useState, useEffect } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { Budget, BudgetCategory, Debt, Bill } from 'types/Budget';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { useBudgetCalculation } from 'hooks/useBudgetCalculation';

interface BudgetOverviewProps {
    year: number;
    onCreateBudget?: () => void;
}

export const BudgetOverview: FC<BudgetOverviewProps> = ({ year, onCreateBudget }) => {
    const db = useDatabase();
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    
    const budgets = useLiveQuery(() => db.budgets.where('year').equals(year).toArray(), [year]);
    const debts = useLiveQuery(() => db.debts.where('status').equals('active').toArray());
    const bills = useLiveQuery(() => db.bills.where('status').equals('active').toArray());

    // Use the new budget calculation hook
    const {
        budgetCategories,
        totalBudgeted,
        totalSpent,
        budgetRemaining,
        spentPercentage,
        isLoading: budgetLoading,
        error: budgetError,
        refreshBudgetCalculations
    } = useBudgetCalculation({ 
        budget: selectedBudget,
        autoRefresh: true 
    });

    useEffect(() => {
        if (budgets && budgets.length > 0 && !selectedBudget) {
            setSelectedBudget(budgets[0]);
        }
    }, [budgets, selectedBudget]);

    const calculateTotalDebt = () => {
        return debts?.reduce((sum, debt) => sum + debt.currentBalance, 0) || 0;
    };

    const calculateMonthlyBills = () => {
        return bills?.reduce((sum, bill) => {
            switch (bill.frequency) {
                case 'monthly': return sum + bill.amount;
                case 'weekly': return sum + (bill.amount * 4.33);
                case 'quarterly': return sum + (bill.amount / 3);
                case 'yearly': return sum + (bill.amount / 12);
                default: return sum;
            }
        }, 0) || 0;
    };

    const totalDebt = calculateTotalDebt();
    const monthlyBills = calculateMonthlyBills();

    return (
        <div className="space-y-6">
            {/* Budget Selection */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Budget Overview - {year}</h2>
                    {selectedBudget && (
                        <button
                            onClick={refreshBudgetCalculations}
                            disabled={budgetLoading}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {budgetLoading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    )}
                </div>

                {budgetError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-600 text-sm">{budgetError}</p>
                    </div>
                )}
                
                {budgets && budgets.length > 0 ? (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Budget:
                        </label>
                        <select
                            value={selectedBudget?.id || ''}
                            onChange={(e) => {
                                const budget = budgets.find(b => b.id === e.target.value);
                                setSelectedBudget(budget || null);
                            }}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            {budgets.map(budget => (
                                <option key={budget.id} value={budget.id}>
                                    {budget.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No budgets found for {year}</p>
                        <button 
                            onClick={onCreateBudget}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        >
                            Create Your First Budget
                        </button>
                    </div>
                )}
            </div>

            {selectedBudget && (
                <>
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Budgeted */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Total Budgeted</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        £{totalBudgeted.toLocaleString()}
                                    </p>
                                </div>
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 text-lg">📊</span>
                                </div>
                            </div>
                        </div>

                        {/* Total Spent */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Total Spent</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        £{totalSpent.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {spentPercentage.toFixed(1)}% of budget
                                    </p>
                                </div>
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <span className="text-red-600 text-lg">💳</span>
                                </div>
                            </div>
                        </div>

                        {/* Remaining Budget */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Remaining</p>
                                    <p className={`text-2xl font-bold ${budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        £{budgetRemaining.toLocaleString()}
                                    </p>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${budgetRemaining >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <span className={`text-lg ${budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {budgetRemaining >= 0 ? '✅' : '⚠️'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Total Debt */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Total Debt</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        £{totalDebt.toLocaleString()}
                                    </p>
                                </div>
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <span className="text-red-600 text-lg">🏦</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Budget Categories Progress */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Categories</h3>
                        
                        {budgetCategories && budgetCategories.length > 0 ? (
                            <div className="space-y-4">
                                {budgetCategories.map(category => {
                                    const percentage = category.allocatedAmount > 0 
                                        ? (category.spentAmount / category.allocatedAmount) * 100 
                                        : 0;
                                    const isOverBudget = percentage > 100;

                                    return (
                                        <div key={category.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-medium text-gray-900">{category.name}</h4>
                                                <span className={`text-sm ${isOverBudget ? 'text-red-600' : 'text-gray-600'}`}>
                                                    £{category.spentAmount.toLocaleString()} / £{category.allocatedAmount.toLocaleString()}
                                                </span>
                                            </div>
                                            
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                <div 
                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                        isOverBudget ? 'bg-red-500' : 'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                ></div>
                                            </div>
                                            
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>{percentage.toFixed(1)}% used</span>
                                                <span>
                                                    {isOverBudget 
                                                        ? `£${(category.spentAmount - category.allocatedAmount).toLocaleString()} over budget`
                                                        : `£${(category.allocatedAmount - category.spentAmount).toLocaleString()} remaining`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4">
                                No budget categories set up. Create categories to track your spending.
                            </p>
                        )}
                    </div>

                    {/* Monthly Bills Summary */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Bills Summary</h3>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-gray-900">£{monthlyBills.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">Estimated monthly bills</p>
                        </div>
                        
                        {bills && bills.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {bills.slice(0, 5).map(bill => (
                                    <div key={bill.id} className="flex justify-between text-sm">
                                        <span className="text-gray-600">{bill.name}</span>
                                        <span className="font-medium">£{bill.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                                {bills.length > 5 && (
                                    <p className="text-xs text-gray-500 text-center">
                                        +{bills.length - 5} more bills
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default BudgetOverview;