import { FC, useState, useMemo } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { Budget } from 'types/Budget';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface YearlyOverviewProps {
    year: number;
}

export const YearlyOverview: FC<YearlyOverviewProps> = ({ year }) => {
    const db = useDatabase();
    const [selectedView, setSelectedView] = useState<'budget' | 'debt' | 'bills'>('budget');

    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    const budgets = useLiveQuery(() => db.budgets.where('year').equals(year).toArray(), [year]);
    const budgetCategories = useLiveQuery(() => 
        budgets ? db.budgetCategories.where('budgetId').anyOf(budgets.map(b => b.id)).toArray() : []
    , [budgets]);
    
    const debts = useLiveQuery(() => db.debts.toArray());
    const debtPayments = useLiveQuery(() => db.debtPayments.toArray());
    const bills = useLiveQuery(() => db.bills.toArray());
    const billPayments = useLiveQuery(() => db.billPayments.toArray());
    const transactions = useLiveQuery(() => db.transactions.toArray());

    const monthlyData = useMemo(() => {
        return months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            
            // Budget spending for this month
            const monthTransactions = transactions?.filter(t => 
                isWithinInterval(new Date(t.created), { start: monthStart, end: monthEnd })
            ) || [];
            
            const totalSpending = monthTransactions
                .filter(t => t.amount < 0 && t.include_in_spending)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            // Debt payments for this month
            const monthDebtPayments = debtPayments?.filter(p =>
                isWithinInterval(new Date(p.paymentDate), { start: monthStart, end: monthEnd })
            ) || [];
            
            const totalDebtPayments = monthDebtPayments.reduce((sum, p) => sum + p.amount, 0);

            // Bill payments for this month
            const monthBillPayments = billPayments?.filter(p =>
                isWithinInterval(new Date(p.paymentDate), { start: monthStart, end: monthEnd })
            ) || [];
            
            const totalBillPayments = monthBillPayments.reduce((sum, p) => sum + p.amount, 0);

            // Budget allocation for categories
            const budgetAllocated = budgetCategories?.reduce((sum, cat) => sum + cat.allocatedAmount, 0) || 0;

            return {
                month,
                totalSpending,
                totalDebtPayments,
                totalBillPayments,
                budgetAllocated,
                transactions: monthTransactions.length,
                debtPayments: monthDebtPayments.length,
                billPayments: monthBillPayments.length
            };
        });
    }, [months, transactions, debtPayments, billPayments, budgetCategories]);

    const yearlyTotals = useMemo(() => {
        return monthlyData.reduce((totals, month) => ({
            spending: totals.spending + month.totalSpending,
            debtPayments: totals.debtPayments + month.totalDebtPayments,
            billPayments: totals.billPayments + month.totalBillPayments,
            transactions: totals.transactions + month.transactions
        }), { spending: 0, debtPayments: 0, billPayments: 0, transactions: 0 });
    }, [monthlyData]);

    const debtProgress = useMemo(() => {
        if (!debts || debts.length === 0) return { totalPaid: 0, remainingDebt: 0, paidOffCount: 0 };
        
        const yearPayments = debtPayments?.filter(p => 
            isWithinInterval(new Date(p.paymentDate), { start: yearStart, end: yearEnd })
        ) || [];
        
        const totalPaid = yearPayments.reduce((sum, p) => sum + p.principal, 0);
        const remainingDebt = debts.filter(d => d.status === 'active').reduce((sum, d) => sum + d.currentBalance, 0);
        const paidOffCount = debts.filter(d => d.status === 'paid_off').length;

        return { totalPaid, remainingDebt, paidOffCount };
    }, [debts, debtPayments, yearStart, yearEnd]);

    const getCategorySpending = (category: string) => {
        return transactions?.filter(t => 
            t.category === category && 
            t.amount < 0 && 
            isWithinInterval(new Date(t.created), { start: yearStart, end: yearEnd })
        ).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    };

    const renderBudgetView = () => (
        <div className="space-y-6">
            {/* Budget vs Actual */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual Spending</h3>
                
                {budgetCategories && budgetCategories.length > 0 ? (
                    <div className="space-y-4">
                        {budgetCategories.map(category => {
                            const actualSpending = getCategorySpending(category.category);
                            const budgetAmount = category.allocatedAmount;
                            const percentage = budgetAmount > 0 ? (actualSpending / budgetAmount) * 100 : 0;
                            const isOverBudget = percentage > 100;

                            return (
                                <div key={category.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                                        <span className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                            {percentage.toFixed(1)}% of budget
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <p className="text-xs text-gray-500">Budgeted</p>
                                            <p className="text-lg font-semibold text-gray-900">£{budgetAmount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Actual</p>
                                            <p className={`text-lg font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                                                £{actualSpending.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                isOverBudget ? 'bg-red-500' : 'bg-green-500'
                                            }`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    
                                    <div className="mt-2 text-xs text-gray-500">
                                        {isOverBudget 
                                            ? `£${(actualSpending - budgetAmount).toLocaleString()} over budget`
                                            : `£${(budgetAmount - actualSpending).toLocaleString()} remaining`
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">No budget categories set up for {year}</p>
                )}
            </div>

            {/* Monthly Spending Trend */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending Trend</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {monthlyData.map((monthData, index) => (
                        <div key={index} className="border rounded-lg p-3">
                            <h4 className="font-medium text-gray-900 mb-2">
                                {format(monthData.month, 'MMM yyyy')}
                            </h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Spending:</span>
                                    <span className="font-medium">£{monthData.totalSpending.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Bills:</span>
                                    <span className="font-medium">£{monthData.totalBillPayments.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Debt:</span>
                                    <span className="font-medium">£{monthData.totalDebtPayments.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderDebtView = () => (
        <div className="space-y-6">
            {/* Debt Progress Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-green-600">£{debtProgress.totalPaid.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Total Debt Paid ({year})</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-red-600">£{debtProgress.remainingDebt.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Remaining Debt</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-blue-600">{debtProgress.paidOffCount}</p>
                    <p className="text-sm text-gray-600">Debts Paid Off</p>
                </div>
            </div>

            {/* Monthly Debt Payments */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Debt Payments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {monthlyData.map((monthData, index) => (
                        <div key={index} className="border rounded-lg p-3">
                            <h4 className="font-medium text-gray-900 mb-2">
                                {format(monthData.month, 'MMM yyyy')}
                            </h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="font-medium">£{monthData.totalDebtPayments.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Payments:</span>
                                    <span className="font-medium">{monthData.debtPayments}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderBillsView = () => (
        <div className="space-y-6">
            {/* Bills Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-blue-600">£{yearlyTotals.billPayments.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Total Bills Paid ({year})</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-green-600">
                        {bills?.filter(b => b.status === 'active').length || 0}
                    </p>
                    <p className="text-sm text-gray-600">Active Bills</p>
                </div>
                <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p className="text-3xl font-bold text-yellow-600">
                        £{(yearlyTotals.billPayments / 12).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Average Monthly</p>
                </div>
            </div>

            {/* Monthly Bill Payments */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Bill Payments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {monthlyData.map((monthData, index) => (
                        <div key={index} className="border rounded-lg p-3">
                            <h4 className="font-medium text-gray-900 mb-2">
                                {format(monthData.month, 'MMM yyyy')}
                            </h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="font-medium">£{monthData.totalBillPayments.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Payments:</span>
                                    <span className="font-medium">{monthData.billPayments}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Yearly Overview - {year}</h2>
                
                {/* View Selector */}
                <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                    {[
                        { key: 'budget', label: 'Budget', icon: '📊' },
                        { key: 'debt', label: 'Debt', icon: '🏦' },
                        { key: 'bills', label: 'Bills', icon: '💳' }
                    ].map(view => (
                        <button
                            key={view.key}
                            onClick={() => setSelectedView(view.key as any)}
                            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                selectedView === view.key
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="mr-2">{view.icon}</span>
                            {view.label}
                        </button>
                    ))}
                </div>

                {/* Yearly Totals */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">£{yearlyTotals.spending.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Total Spending</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">£{yearlyTotals.billPayments.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Bills Paid</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">£{yearlyTotals.debtPayments.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Debt Payments</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">{yearlyTotals.transactions.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Transactions</p>
                    </div>
                </div>
            </div>

            {/* Dynamic Content Based on Selected View */}
            {selectedView === 'budget' && renderBudgetView()}
            {selectedView === 'debt' && renderDebtView()}
            {selectedView === 'bills' && renderBillsView()}
        </div>
    );
};

export default YearlyOverview;