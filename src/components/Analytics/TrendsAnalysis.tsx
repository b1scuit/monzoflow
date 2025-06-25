import { FC, useMemo } from 'react';
import { Transaction } from 'types/Transactions';
import { format, endOfWeek, eachWeekOfInterval, subWeeks, isWithinInterval, parseISO, getHours, getDay } from 'date-fns';

interface TrendsAnalysisProps {
    transactions: Transaction[];
}

export const TrendsAnalysis: FC<TrendsAnalysisProps> = ({ transactions }) => {
    const trends = useMemo(() => {
        const currentDate = new Date();
        const twelveWeeksAgo = subWeeks(currentDate, 12);
        
        // Filter spending transactions
        const spendingTransactions = transactions.filter(t => 
            t.amount < 0 && t.include_in_spending
        );

        // Weekly spending trend (last 12 weeks)
        const weeklyTrend = eachWeekOfInterval({
            start: twelveWeeksAgo,
            end: currentDate
        }).map(weekStart => {
            const weekEnd = endOfWeek(weekStart);
            const weekSpending = spendingTransactions
                .filter(t => isWithinInterval(parseISO(t.created), { start: weekStart, end: weekEnd }))
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            return {
                week: format(weekStart, 'MMM dd'),
                spending: weekSpending,
                transactionCount: spendingTransactions.filter(t => 
                    isWithinInterval(parseISO(t.created), { start: weekStart, end: weekEnd })
                ).length
            };
        });

        // Day of week spending patterns
        const dayOfWeekSpending = Array.from({ length: 7 }, (_, dayIndex) => {
            const dayTransactions = spendingTransactions.filter(t => 
                getDay(parseISO(t.created)) === dayIndex
            );
            const totalSpending = dayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const avgSpending = dayTransactions.length > 0 ? totalSpending / dayTransactions.length : 0;
            
            return {
                day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex],
                dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex],
                totalSpending,
                avgSpending,
                transactionCount: dayTransactions.length
            };
        });

        // Hour of day spending patterns
        const hourlySpending = Array.from({ length: 24 }, (_, hour) => {
            const hourTransactions = spendingTransactions.filter(t => 
                getHours(parseISO(t.created)) === hour
            );
            const totalSpending = hourTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            return {
                hour,
                hourLabel: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
                totalSpending,
                transactionCount: hourTransactions.length
            };
        });

        // Category trends over time
        const categoryTrends = spendingTransactions.reduce((acc, t) => {
            const category = t.category || 'uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({
                amount: Math.abs(t.amount),
                date: parseISO(t.created)
            });
            return acc;
        }, {} as Record<string, Array<{ amount: number; date: Date }>>);

        // Calculate category growth rates
        const categoryGrowthRates = Object.entries(categoryTrends).map(([category, transactions]) => {
            const sortedTransactions = transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
            const midPoint = Math.floor(sortedTransactions.length / 2);
            
            const firstHalf = sortedTransactions.slice(0, midPoint);
            const secondHalf = sortedTransactions.slice(midPoint);
            
            const firstHalfAvg = firstHalf.length > 0 
                ? firstHalf.reduce((sum, t) => sum + t.amount, 0) / firstHalf.length 
                : 0;
            const secondHalfAvg = secondHalf.length > 0 
                ? secondHalf.reduce((sum, t) => sum + t.amount, 0) / secondHalf.length 
                : 0;
            
            const growthRate = firstHalfAvg > 0 
                ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
                : 0;
            
            return {
                category,
                growthRate,
                totalTransactions: transactions.length,
                totalSpending: transactions.reduce((sum, t) => sum + t.amount, 0)
            };
        }).sort((a, b) => Math.abs(b.growthRate) - Math.abs(a.growthRate));

        // Merchant frequency analysis
        const merchantFrequency = spendingTransactions.reduce((acc, t) => {
            if (t.merchant) {
                const merchant = t.merchant.name;
                if (!acc[merchant]) {
                    acc[merchant] = {
                        count: 0,
                        totalSpending: 0,
                        category: t.category || 'uncategorized'
                    };
                }
                acc[merchant].count++;
                acc[merchant].totalSpending += Math.abs(t.amount);
            }
            return acc;
        }, {} as Record<string, { count: number; totalSpending: number; category: string }>);

        const topMerchantsByFrequency = Object.entries(merchantFrequency)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 10);

        const topMerchantsBySpending = Object.entries(merchantFrequency)
            .sort(([,a], [,b]) => b.totalSpending - a.totalSpending)
            .slice(0, 10);

        // Calculate weekly average and trend
        const totalWeeks = weeklyTrend.length;
        const avgWeeklySpending = totalWeeks > 0 
            ? weeklyTrend.reduce((sum, week) => sum + week.spending, 0) / totalWeeks 
            : 0;

        // Simple linear trend calculation
        const weeklyTrendSlope = totalWeeks > 1 ? calculateTrendSlope(weeklyTrend.map(w => w.spending)) : 0;

        return {
            weeklyTrend,
            dayOfWeekSpending,
            hourlySpending,
            categoryGrowthRates,
            topMerchantsByFrequency,
            topMerchantsBySpending,
            avgWeeklySpending,
            weeklyTrendSlope
        };
    }, [transactions]);

    const formatCurrency = (amount: number) => `£${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatPercentage = (percentage: number) => `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;

    return (
        <div className="space-y-6">
            {/* Weekly Trend Overview */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">12-Week Spending Trend</h3>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Weekly Average</p>
                        <p className="text-lg font-semibold">{formatCurrency(trends.avgWeeklySpending)}</p>
                        <p className={`text-xs ${trends.weeklyTrendSlope > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {trends.weeklyTrendSlope > 0 ? '↗' : '↘'} {formatPercentage(trends.weeklyTrendSlope)}
                        </p>
                    </div>
                </div>
                
                <div className="space-y-2">
                    {trends.weeklyTrend.map((week, index) => {
                        const maxSpending = Math.max(...trends.weeklyTrend.map(w => w.spending));
                        const widthPercentage = maxSpending > 0 ? (week.spending / maxSpending) * 100 : 0;
                        const isRecentWeek = index >= trends.weeklyTrend.length - 4;
                        
                        return (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 w-20">{week.week}</span>
                                <div className="flex-1 mx-4">
                                    <div className="bg-gray-200 rounded-full h-3">
                                        <div 
                                            className={`h-3 rounded-full transition-all duration-300 ${
                                                isRecentWeek ? 'bg-blue-500' : 'bg-gray-400'
                                            }`}
                                            style={{ width: `${widthPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="text-right w-24">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(week.spending)}
                                    </span>
                                    <p className="text-xs text-gray-500">{week.transactionCount} txns</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Day of Week Pattern */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Day of Week</h3>
                <div className="grid grid-cols-7 gap-2">
                    {trends.dayOfWeekSpending.map((day, index) => {
                        const maxSpending = Math.max(...trends.dayOfWeekSpending.map(d => d.totalSpending));
                        const intensity = maxSpending > 0 ? (day.totalSpending / maxSpending) * 100 : 0;
                        
                        return (
                            <div key={index} className="text-center">
                                <div className="text-xs font-medium text-gray-600 mb-2">{day.dayShort}</div>
                                <div className="mx-auto w-12 h-12 rounded-lg bg-gradient-to-t from-blue-500 to-blue-300 flex items-end justify-center relative overflow-hidden">
                                    <div 
                                        className="absolute bottom-0 left-0 right-0 bg-blue-600 transition-all duration-300"
                                        style={{ height: `${intensity}%` }}
                                    ></div>
                                    <span className="relative text-white text-xs font-bold z-10">
                                        {day.transactionCount}
                                    </span>
                                </div>
                                <div className="text-xs font-semibold text-gray-900 mt-1">
                                    {formatCurrency(day.totalSpending)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Category Growth Analysis */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Spending Trends</h3>
                <div className="space-y-3">
                    {trends.categoryGrowthRates.slice(0, 8).map((category, index) => (
                        <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 capitalize">
                                    {category.category.replace('_', ' ')}
                                </h4>
                                <p className="text-sm text-gray-600">
                                    {category.totalTransactions} transactions • {formatCurrency(category.totalSpending)}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    category.growthRate > 0 
                                        ? 'bg-red-100 text-red-800' 
                                        : category.growthRate < 0 
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                }`}>
                                    {formatPercentage(category.growthRate)}
                                </span>
                                <span className="text-lg">
                                    {category.growthRate > 5 ? '📈' : category.growthRate < -5 ? '📉' : '➡️'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hourly Spending Pattern */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Time of Day</h3>
                <div className="flex items-end justify-between h-32 space-x-1">
                    {trends.hourlySpending.map((hour, index) => {
                        const maxSpending = Math.max(...trends.hourlySpending.map(h => h.totalSpending));
                        const height = maxSpending > 0 ? (hour.totalSpending / maxSpending) * 100 : 0;
                        
                        return (
                            <div key={index} className="flex-1 flex flex-col items-center">
                                <div 
                                    className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                                    style={{ height: `${height}%` }}
                                    title={`${hour.hourLabel}: ${formatCurrency(hour.totalSpending)} (${hour.transactionCount} transactions)`}
                                ></div>
                                {index % 4 === 0 && (
                                    <span className="text-xs text-gray-600 mt-1 transform -rotate-45 origin-top-left">
                                        {hour.hour}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>12 AM</span>
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>11 PM</span>
                </div>
            </div>

            {/* Top Merchants Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Frequent Merchants</h3>
                    <div className="space-y-2">
                        {trends.topMerchantsByFrequency.map(([merchant, data], index) => (
                            <div key={merchant} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-b-0">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 truncate">{merchant}</p>
                                    <p className="text-xs text-gray-500 capitalize">{data.category.replace('_', ' ')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-blue-600">{data.count}</p>
                                    <p className="text-xs text-gray-500">visits</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Highest Spending Merchants</h3>
                    <div className="space-y-2">
                        {trends.topMerchantsBySpending.map(([merchant, data], index) => (
                            <div key={merchant} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-b-0">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 truncate">{merchant}</p>
                                    <p className="text-xs text-gray-500 capitalize">{data.category.replace('_', ' ')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-red-600">{formatCurrency(data.totalSpending)}</p>
                                    <p className="text-xs text-gray-500">{data.count} visits</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to calculate trend slope
const calculateTrendSlope = (values: number[]): number => {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;
    
    return avgY > 0 ? (slope / avgY) * 100 : 0;
};

export default TrendsAnalysis;