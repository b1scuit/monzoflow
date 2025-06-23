import { FC, useMemo } from 'react';
import { Transaction } from 'types/Transactions';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';

interface SpendingInsightsProps {
    transactions: Transaction[];
}

export const SpendingInsights: FC<SpendingInsightsProps> = ({ transactions }) => {
    const insights = useMemo(() => {
        const currentMonth = new Date();
        const lastMonth = subMonths(currentMonth, 1);
        const currentMonthStart = startOfMonth(currentMonth);
        const currentMonthEnd = endOfMonth(currentMonth);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);

        // Filter spending transactions only (negative amounts, include in spending)
        const spendingTransactions = transactions.filter(t => 
            t.amount < 0 && t.include_in_spending
        );

        // Current month spending
        const currentMonthSpending = spendingTransactions
            .filter(t => isWithinInterval(parseISO(t.created), { start: currentMonthStart, end: currentMonthEnd }))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Last month spending
        const lastMonthSpending = spendingTransactions
            .filter(t => isWithinInterval(parseISO(t.created), { start: lastMonthStart, end: lastMonthEnd }))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Spending by category
        const categorySpending = spendingTransactions.reduce((acc, t) => {
            const category = t.category || 'uncategorized';
            acc[category] = (acc[category] || 0) + Math.abs(t.amount);
            return acc;
        }, {} as Record<string, number>);

        // Top categories
        const topCategories = Object.entries(categorySpending)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        // Average transaction amounts by category
        const categoryTransactionCounts = spendingTransactions.reduce((acc, t) => {
            const category = t.category || 'uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const categoryAverages = Object.entries(categorySpending).map(([category, total]) => ({
            category,
            average: total / (categoryTransactionCounts[category] || 1),
            total,
            count: categoryTransactionCounts[category] || 0
        })).sort((a, b) => b.average - a.average);

        // Most frequent merchants
        const merchantFrequency = spendingTransactions.reduce((acc, t) => {
            if (t.merchant) {
                const key = t.merchant.name;
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const topMerchants = Object.entries(merchantFrequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        // Spending trend (last 6 months)
        const monthlySpending = Array.from({ length: 6 }, (_, i) => {
            const month = subMonths(currentMonth, 5 - i);
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            
            const spending = spendingTransactions
                .filter(t => isWithinInterval(parseISO(t.created), { start: monthStart, end: monthEnd }))
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            return {
                month: format(month, 'MMM yyyy'),
                spending
            };
        });

        // Calculate spending change
        const spendingChange = lastMonthSpending > 0 
            ? ((currentMonthSpending - lastMonthSpending) / lastMonthSpending) * 100 
            : 0;

        return {
            currentMonthSpending,
            lastMonthSpending,
            spendingChange,
            topCategories,
            categoryAverages,
            topMerchants,
            monthlySpending,
            totalTransactions: spendingTransactions.length
        };
    }, [transactions]);

    const formatCurrency = (amount: number) => `£${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercentage = (percentage: number) => `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;

    return (
        <div className="space-y-6">
            {/* Spending Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">This Month</h3>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(insights.currentMonthSpending / 100)}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Spending</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Last Month</h3>
                    <p className="text-3xl font-bold text-gray-600">{formatCurrency(insights.lastMonthSpending / 100)}</p>
                    <p className="text-sm text-gray-600 mt-1">Previous Month</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Change</h3>
                    <p className={`text-3xl font-bold ${insights.spendingChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatPercentage(insights.spendingChange)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Month over Month</p>
                </div>
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Spending Categories</h3>
                <div className="space-y-3">
                    {insights.topCategories.map(([category, amount], index) => {
                        const percentage = (amount / insights.currentMonthSpending) * 100;
                        return (
                            <div key={category} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full ${getCategoryColor(index)}`}></div>
                                    <span className="font-medium text-gray-900 capitalize">
                                        {category.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">{formatCurrency(amount / 100)}</p>
                                    <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">6-Month Spending Trend</h3>
                <div className="space-y-2">
                    {insights.monthlySpending.map((month, index) => {
                        const maxSpending = Math.max(...insights.monthlySpending.map(m => m.spending));
                        const widthPercentage = maxSpending > 0 ? (month.spending / maxSpending) * 100 : 0;
                        
                        return (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 w-20">{month.month}</span>
                                <div className="flex-1 mx-4">
                                    <div className="bg-gray-200 rounded-full h-4">
                                        <div 
                                            className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                                            style={{ width: `${widthPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                                    {formatCurrency(month.spending / 100)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Category Averages */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Transaction Size by Category</h3>
                <div className="space-y-3">
                    {insights.categoryAverages.slice(0, 5).map((category, index) => (
                        <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900 capitalize">
                                    {category.category.replace('_', ' ')}
                                </p>
                                <p className="text-sm text-gray-600">{category.count} transactions</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(category.average / 100)}</p>
                                <p className="text-sm text-gray-600">avg per transaction</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Merchants */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Frequent Merchants</h3>
                <div className="space-y-2">
                    {insights.topMerchants.map(([merchant, count], index) => (
                        <div key={merchant} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-b-0">
                            <span className="font-medium text-gray-900">{merchant}</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                                {count} transactions
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const getCategoryColor = (index: number) => {
    const colors = [
        'bg-blue-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-purple-500',
        'bg-indigo-500'
    ];
    return colors[index % colors.length];
};

export default SpendingInsights;