import { FC, useMemo } from 'react';
import { Transaction } from 'types/Transactions';
import { Account } from 'types/Account';
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

interface AccountOverviewProps {
    transactions: Transaction[];
    accounts: Account[];
}

export const AccountOverview: FC<AccountOverviewProps> = ({ transactions, accounts }) => {
    const analysis = useMemo(() => {
        // Income vs Outgoing analysis
        const income = transactions
            .filter(t => t.amount > 0 && t.include_in_spending)
            .reduce((sum, t) => sum + t.amount, 0);

        const outgoing = transactions
            .filter(t => t.amount < 0 && t.include_in_spending)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const netFlow = income - outgoing;

        // Recent activity (last 7 days)
        const sevenDaysAgo = subDays(new Date(), 7);
        const recentTransactions = transactions.filter(t => 
            isWithinInterval(parseISO(t.created), { start: sevenDaysAgo, end: new Date() })
        );

        // Daily activity for the last 7 days
        const dailyActivity = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), 6 - i);
            const dayStart = startOfDay(date);
            const dayEnd = endOfDay(date);
            
            const dayTransactions = transactions.filter(t =>
                isWithinInterval(parseISO(t.created), { start: dayStart, end: dayEnd })
            );

            const spending = dayTransactions
                .filter(t => t.amount < 0 && t.include_in_spending)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const income = dayTransactions
                .filter(t => t.amount > 0 && t.include_in_spending)
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                date: format(date, 'EEE dd'),
                spending,
                income,
                transactionCount: dayTransactions.length
            };
        });

        // Transaction patterns
        const avgTransactionSize = transactions.length > 0 
            ? Math.abs(transactions.reduce((sum, t) => sum + t.amount, 0)) / transactions.length 
            : 0;

        const largestTransaction = transactions.reduce((max, t) => 
            Math.abs(t.amount) > Math.abs(max.amount) ? t : max, 
            transactions[0] || { amount: 0 }
        );

        const smallestTransaction = transactions.reduce((min, t) => 
            Math.abs(t.amount) < Math.abs(min.amount) ? t : min, 
            transactions[0] || { amount: 0 }
        );

        // Account balances (estimate based on transactions)
        const accountBalances = accounts.map(account => {
            const accountTransactions = transactions.filter(t => t.account_id === account.id);
            const balance = accountTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            return {
                account,
                estimatedBalance: balance,
                transactionCount: accountTransactions.length,
                lastActivity: accountTransactions.length > 0 
                    ? Math.max(...accountTransactions.map(t => new Date(t.created).getTime()))
                    : 0
            };
        });

        // Spending velocity (transactions per day)
        const oldestTransaction = transactions.length > 0 
            ? Math.min(...transactions.map(t => new Date(t.created).getTime()))
            : Date.now();
        
        const daysSinceOldest = Math.max(1, Math.ceil((Date.now() - oldestTransaction) / (1000 * 60 * 60 * 24)));
        const transactionsPerDay = transactions.length / daysSinceOldest;

        return {
            income,
            outgoing,
            netFlow,
            recentTransactions: recentTransactions.length,
            dailyActivity,
            avgTransactionSize,
            largestTransaction,
            smallestTransaction,
            accountBalances,
            transactionsPerDay,
            totalTransactions: transactions.length
        };
    }, [transactions, accounts]);

    const formatCurrency = (amount: number) => `£${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getAccountTypeIcon = (type: string) => {
        switch (type) {
            case 'uk_retail': return '💳';
            case 'uk_retail_joint': return '👥';
            case 'uk_monzo_flex': return '🔄';
            case 'uk_business': return '🏢';
            case 'uk_loan': return '🏦';
            default: return '💰';
        }
    };

    return (
        <div className="space-y-6">
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-600">Total Income</h3>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(analysis.income)}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 text-xl">📈</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-600">Total Outgoing</h3>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(analysis.outgoing)}</p>
                        </div>
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 text-xl">📉</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-600">Net Flow</h3>
                            <p className={`text-2xl font-bold ${analysis.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(analysis.netFlow)}
                            </p>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            analysis.netFlow >= 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                            <span className={`text-xl ${analysis.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {analysis.netFlow >= 0 ? '💰' : '⚠️'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-600">Total Transactions</h3>
                            <p className="text-2xl font-bold text-blue-600">{analysis.totalTransactions.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {analysis.transactionsPerDay.toFixed(1)} per day avg
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-xl">📊</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">7-Day Activity Overview</h3>
                <div className="space-y-4">
                    {analysis.dailyActivity.map((day, index) => {
                        const maxAmount = Math.max(
                            ...analysis.dailyActivity.map(d => Math.max(d.spending, d.income))
                        );
                        
                        return (
                            <div key={index} className="flex items-center space-x-4">
                                <div className="w-16 text-sm font-medium text-gray-700">{day.date}</div>
                                
                                <div className="flex-1 space-y-1">
                                    {/* Income bar */}
                                    <div className="flex items-center space-x-2">
                                        <div className="w-12 text-xs text-green-600">Income</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                                            <div 
                                                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${maxAmount > 0 ? (day.income / maxAmount) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="w-20 text-xs font-medium text-gray-900 text-right">
                                            {formatCurrency(day.income)}
                                        </div>
                                    </div>
                                    
                                    {/* Spending bar */}
                                    <div className="flex items-center space-x-2">
                                        <div className="w-12 text-xs text-red-600">Spent</div>
                                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                                            <div 
                                                className="bg-red-500 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${maxAmount > 0 ? (day.spending / maxAmount) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="w-20 text-xs font-medium text-gray-900 text-right">
                                            {formatCurrency(day.spending)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-16 text-xs text-gray-600 text-center">
                                    {day.transactionCount} txns
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Account Balances */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
                <div className="space-y-4">
                    {analysis.accountBalances.map((accountData, index) => (
                        <div key={accountData.account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-4">
                                <div className="text-2xl">{getAccountTypeIcon(accountData.account.type)}</div>
                                <div>
                                    <h4 className="font-medium text-gray-900">
                                        {accountData.account.description || `${accountData.account.type.replace('uk_', '').replace('_', ' ')} Account`}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        {accountData.transactionCount} transactions
                                        {accountData.lastActivity > 0 && (
                                            <span className="ml-2">
                                                • Last activity: {format(accountData.lastActivity, 'MMM dd')}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-semibold ${
                                    accountData.estimatedBalance >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {formatCurrency(accountData.estimatedBalance)}
                                </p>
                                <p className="text-xs text-gray-500">Estimated balance</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transaction Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Insights</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Average Transaction</span>
                            <span className="font-semibold">{formatCurrency(analysis.avgTransactionSize)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Recent Activity (7 days)</span>
                            <span className="font-semibold">{analysis.recentTransactions} transactions</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Daily Average</span>
                            <span className="font-semibold">{analysis.transactionsPerDay.toFixed(1)} transactions</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Extremes</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Largest Transaction</p>
                            <p className="font-semibold text-red-600">{formatCurrency(Math.abs(analysis.largestTransaction.amount))}</p>
                            {analysis.largestTransaction.merchant && (
                                <p className="text-xs text-gray-500">{analysis.largestTransaction.merchant.name}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Smallest Transaction</p>
                            <p className="font-semibold text-green-600">{formatCurrency(Math.abs(analysis.smallestTransaction.amount))}</p>
                            {analysis.smallestTransaction.merchant && (
                                <p className="text-xs text-gray-500">{analysis.smallestTransaction.merchant.name}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountOverview;