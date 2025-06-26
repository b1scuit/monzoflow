import { Chart, Node, Link } from "components/Chart/Chart";
import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import FilterBar from "components/FilterBar/FilterBar";
import SankeyFilterBar, { SankeyFilters } from "components/FilterBar/SankeyFilterBar";
import SpendingInsights from "components/Analytics/SpendingInsights";
import AccountOverview from "components/Analytics/AccountOverview";
import TrendsAnalysis from "components/Analytics/TrendsAnalysis";
import { useAccounts } from "components/Monzo/useAccounts";
import { useTransactions } from "components/Monzo/useTransactions";
import { BudgetCalculationService } from "services/BudgetCalculationService";
import { FC, useEffect, useState, useCallback, useMemo } from "react";
import { Account, Owners } from "types/Account";
import { Transaction } from "types/Transactions";
import { useLiveQuery } from "dexie-react-hooks";
import { FloatingActionButtons, useFABPresets } from "components/UI/FloatingActionButtons";
import Header from "components/Header/Header";


const renderName = (account: Account): string => {
    const types = (type: string): string => {
        switch (type) {
            case "uk_retail":
                return "UK Retail"
            case "uk_retail_joint":
                return "UK retail Joint"
            case "uk_monzo_flex":
                return "Monzo Flex"
            case "uk_loan":
                return "UK_Loan"
            case "uk_business":
                return "UK Business account"
            default:
                return "Other"
        }
    }

    const owner = (account: Account): string => {
        if (account.type === "uk_business") {
            return account.description
        }

        return retailOwner(account.owners)
    }

    const retailOwner = (owners: Owners[]): string => {
        if (owners.length !== 0) {
            return owners[0].preferred_name
        }

        return "Unknown"
    } 

    return types(account.type) +":"+ owner(account)
}

export const Index: FC = () => {
    let nodes = new Map<string, Node>()
    let [ chartnodes, setChartNodes] = useState<Node[]>([])
    let [chartLinks, setChartLinks] = useState<Link[]>([])
    let [allTransactions, setAllTransactions] = useState<Transaction[]>([])
    let [allAccounts, setAllAccounts] = useState<Account[]>([])
    let [activeView, setActiveView] = useState<'overview' | 'insights' | 'trends' | 'sankey'>('overview')
    let [sankeyViewMode, setSankeyViewMode] = useState<'merchants' | 'categories'>('merchants')
    let [availableCategories, setAvailableCategories] = useState<string[]>([])
    
    // Enhanced filtering state for Sankey diagram
    const [sankeyFilters, setSankeyFilters] = useState<SankeyFilters>({
        selectedAccounts: [],
        dateRange: {
            startDate: '',
            endDate: ''
        },
        minimumAmount: 0,
        transactionTypes: ['debit'],
        searchQuery: ''
    });
    const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());
    const [isFilteringActive, setIsFilteringActive] = useState<boolean>(false);

    const [loading, setLoading] = useState<boolean>(true)
    const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...')
    const db = useDatabase();
    const { retrieveAccounts } = useAccounts();
    const { dashboardFABs } = useFABPresets();
    const { retrieveTransactions, forceRefreshAllTransactions, loading: transactionLoading } = useTransactions();
    
    // Live queries for real-time updates
    const budgets = useLiveQuery(() => db.budgets.toArray());
    const debts = useLiveQuery(() => db.debts.where('status').equals('active').toArray());

    // Helper function to check if we should refresh transaction data
    const checkIfRefreshNeeded = async (accounts: Account[]): Promise<boolean> => {
        // Check if any account hasn't been pulled recently
        const now = Date.now()
        const oneHourAgo = now - (60 * 60 * 1000) // 1 hour threshold for refresh
        
        for (const account of accounts) {
            const lastPullKey = `lastTransactionPull_${account.id}`
            const lastPull = localStorage.getItem(lastPullKey)
            
            if (!lastPull || parseInt(lastPull) < oneHourAgo) {
                console.log(`Account ${account.id} needs refresh - last pull: ${lastPull ? new Date(parseInt(lastPull)).toLocaleString() : 'never'}`)
                return true
            }
        }
        
        return false
    }


    // Enhanced setup function with proper loading state management
    const setupFunction = async () => {
        try {
            setLoadingMessage('Initializing database...')
            
            // Try to open the database first
            try {
                await db.open()
                console.log('Database opened successfully')
            } catch (dbError: any) {
                console.error('Database error:', dbError)
                
                // Handle version error specifically
                if (dbError.name === 'VersionError' || dbError.name === 'DatabaseClosedError') {
                    setLoadingMessage('Resolving database version conflict...')
                    try {
                        await db.resetDatabase()
                        setLoadingMessage('Database reset successfully, continuing...')
                    } catch (resetError) {
                        console.error('Failed to reset database:', resetError)
                        setLoadingMessage('Database error. Please clear your browser data and refresh.')
                        return
                    }
                } else {
                    throw dbError
                }
            }
            
            setLoadingMessage('Checking local accounts...')
            
            // Check if we have accounts locally
            const accountCount = await db.accounts.count()
            let accounts: Account[] = []
            
            if (accountCount === 0) {
                setLoadingMessage('Fetching accounts from Monzo...')
                await retrieveAccounts()
                accounts = await db.accounts.toArray()
            } else {
                accounts = await db.accounts.toArray()
            }
            
            // Set up nodes for accounts
            accounts.forEach((acc: Account) => nodes.set(acc.id, {id: acc.id, description:renderName(acc)}))
            
            // Check if we have transactions locally
            setLoadingMessage('Checking local transactions...')
            const transactionCount = await db.transactions.count()
            
            if (transactionCount === 0) {
                setLoadingMessage('No transactions found - fetching historical data from Monzo...')
                console.log('🔄 REQUIREMENT: No transactions found, attempting full refresh from Monzo')
                
                // Force refresh all transactions when none are found
                try {
                    // Show progress during chunked requests
                    setLoadingMessage('Fetching transaction history (this may take a moment for large datasets)...')
                    await forceRefreshAllTransactions(accounts)
                    
                    // Check how many transactions we got
                    const newTransactionCount = await db.transactions.count()
                    if (newTransactionCount > 0) {
                        setLoadingMessage(`Successfully fetched ${newTransactionCount.toLocaleString()} transactions from Monzo`)
                        console.log(`✅ Full refresh successful: ${newTransactionCount} transactions retrieved`)
                    } else {
                        setLoadingMessage('No new transactions found on Monzo')
                        console.log('⚠️ Full refresh completed but no transactions were found')
                    }
                } catch (error: any) {
                    if (error.message?.includes('time range')) {
                        setLoadingMessage('Date range too large for Monzo API. Using chunked requests...')
                        console.log('Retrying with smaller date chunks due to API limit')
                    } else {
                        console.error('Failed to force refresh transactions:', error)
                        setLoadingMessage('Failed to fetch transactions. Trying individual account fetches...')
                        
                        // Fallback to individual account fetches
                        const transactionPromises = accounts.map(async (account: Account) => {
                            try {
                                return await retrieveTransactions(account.id, true) // Force refresh
                            } catch (error) {
                                console.error(`Failed to fetch transactions for account ${account.id}:`, error)
                                return []
                            }
                        })
                        
                        await Promise.allSettled(transactionPromises)
                        
                        // Check final count after fallback
                        const finalCount = await db.transactions.count()
                        if (finalCount > 0) {
                            setLoadingMessage(`Retrieved ${finalCount} transactions using fallback method`)
                        }
                    }
                }
            } else {
                console.log(`Found ${transactionCount} transactions in local storage`)
                
                // Still check if we should refresh based on data age
                const shouldRefresh = await checkIfRefreshNeeded(accounts)
                if (shouldRefresh) {
                    setLoadingMessage(`Refreshing ${transactionCount} existing transactions from Monzo...`)
                    try {
                        await forceRefreshAllTransactions(accounts)
                        const updatedCount = await db.transactions.count()
                        setLoadingMessage(`Updated transaction data (${updatedCount} total transactions)`)
                    } catch (error) {
                        console.warn('Failed to refresh transactions, using cached data:', error)
                        setLoadingMessage(`Using cached data (${transactionCount} transactions)`)
                    }
                }
            }
            
            // Wait for any ongoing transaction loading to complete
            if (transactionLoading) {
                setLoadingMessage('Finalizing transaction data...')
                // Small delay to ensure all async operations complete
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            setLoadingMessage('Loading analytics data...')
            
            // Retrieve final data from database
            const [transactions, finalAccounts] = await Promise.all([
                db.transactions.toArray(),
                db.accounts.toArray()
            ])
            
            // Store all data for analytics
            setAllTransactions(transactions)
            setAllAccounts(finalAccounts)
            
            // Set last sign in timestamp for throttling
            localStorage.setItem('lastSignIn', Date.now().toString())
            
            setLoadingMessage('Complete!')
            
        } catch (error: any) {
            console.error('Setup failed:', error)
            
            // Provide specific error messages based on error type
            if (error.name === 'DatabaseClosedError' || error.name === 'VersionError') {
                setLoadingMessage('Database version conflict. Please visit Settings to reset.')
            } else if (error.message?.includes('Failed to fetch')) {
                setLoadingMessage('Network error. Please check your connection and try again.')
            } else {
                setLoadingMessage('Error loading data. Please visit Settings if this persists.')
            }
        } finally {
            // Only set loading to false when everything is truly complete
            setTimeout(() => setLoading(false), 500)
        }
    }

    // Filter transactions based on sankeyFilters
    const filteredTransactions = useMemo(() => {
        if (!allTransactions.length) return [];
        
        let filtered = allTransactions;
        
        // Filter by selected accounts
        if (sankeyFilters.selectedAccounts.length > 0) {
            const selectedAccountIds = sankeyFilters.selectedAccounts.map(acc => acc.id);
            filtered = filtered.filter(t => selectedAccountIds.includes(t.account_id));
        }
        
        // Filter by date range
        if (sankeyFilters.dateRange.startDate) {
            const startDate = new Date(sankeyFilters.dateRange.startDate);
            filtered = filtered.filter(t => {
                const transactionDate = new Date(t.settled || t.created);
                return transactionDate >= startDate;
            });
        }
        
        if (sankeyFilters.dateRange.endDate) {
            const endDate = new Date(sankeyFilters.dateRange.endDate);
            endDate.setHours(23, 59, 59, 999); // Include the whole end date
            filtered = filtered.filter(t => {
                const transactionDate = new Date(t.settled || t.created);
                return transactionDate <= endDate;
            });
        }
        
        // Filter by minimum amount
        if (sankeyFilters.minimumAmount > 0) {
            filtered = filtered.filter(t => Math.abs(t.amount) >= sankeyFilters.minimumAmount * 100);
        }
        
        // Filter by transaction types
        if (sankeyFilters.transactionTypes.length > 0) {
            filtered = filtered.filter(t => {
                if (sankeyFilters.transactionTypes.includes('debit') && t.amount < 0) return true;
                if (sankeyFilters.transactionTypes.includes('credit') && t.amount > 0) return true;
                if (sankeyFilters.transactionTypes.includes('transfer') && t.merchant?.emoji === '🔄') return true;
                return false;
            });
        }
        
        // Filter by search query
        if (sankeyFilters.searchQuery.trim()) {
            const query = sankeyFilters.searchQuery.toLowerCase();
            filtered = filtered.filter(t => {
                const merchantName = t.merchant?.name?.toLowerCase() || '';
                const counterpartyName = t.counterparty?.name?.toLowerCase() || '';
                const description = t.description?.toLowerCase() || '';
                const category = t.category?.toLowerCase() || '';
                
                return merchantName.includes(query) || 
                       counterpartyName.includes(query) || 
                       description.includes(query) ||
                       category.includes(query);
            });
        }
        
        return filtered;
    }, [allTransactions, sankeyFilters]);

    // Initialize sankeyFilters with all accounts when allAccounts is loaded
    useEffect(() => {
        if (allAccounts.length > 0 && sankeyFilters.selectedAccounts.length === 0) {
            setSankeyFilters(prev => ({
                ...prev,
                selectedAccounts: allAccounts
            }));
        }
    }, [allAccounts, sankeyFilters.selectedAccounts.length]);

    // Initialize visibleCategories with all categories when availableCategories changes
    useEffect(() => {
        if (availableCategories.length > 0) {
            setVisibleCategories(new Set(availableCategories));
        }
    }, [availableCategories]);

    // Detect when filtering is active
    useEffect(() => {
        const hasActiveFilters = (
            sankeyFilters.searchQuery.trim() !== '' ||
            sankeyFilters.dateRange.startDate !== '' ||
            sankeyFilters.dateRange.endDate !== '' ||
            sankeyFilters.minimumAmount > 0 ||
            sankeyFilters.selectedAccounts.length !== allAccounts.length ||
            (availableCategories.length > 0 && visibleCategories.size !== availableCategories.length)
        );
        setIsFilteringActive(hasActiveFilters);
    }, [sankeyFilters, allAccounts.length, availableCategories.length, visibleCategories.size]);

    const processTransactionsToChart = useCallback((transactions: Transaction[]) => {
        if (sankeyViewMode === 'categories') {
            // Extract available categories from transactions
            const categories = BudgetCalculationService.getAvailableCategories(transactions);
            setAvailableCategories(categories);

            // Use category-based chart data
            const accountData = allAccounts.map(acc => ({
                id: acc.id,
                description: renderName(acc)
            }));

            const period = {
                start: new Date(new Date().getFullYear() - 1, 0, 1), // Last year to current
                end: new Date(),
                type: 'custom' as const
            };

            // Convert visibleCategories to omittedCategories for the service
            const omittedCategoriesForChart = new Set(
                availableCategories.filter(cat => !visibleCategories.has(cat))
            );

            const chartData = BudgetCalculationService.generateCategoryChartData(
                transactions,
                accountData,
                period,
                omittedCategoriesForChart,
                sankeyFilters.minimumAmount * 100 // Use the filter's minimum amount
            );

            setChartNodes(chartData.nodes);
            setChartLinks(chartData.links);
        } else {
            // Original merchant-based processing
            const newNodes = new Map<string, Node>()
            const newLinks = new Map<string, Link>()
            
            // Add account nodes
            allAccounts.forEach((acc: Account) => {
                newNodes.set(acc.id, {id: acc.id, description: renderName(acc)})
            })

            // Add other node
            newNodes.set("other", {id: "other", description: "Other"})

            // Process transactions into links
            transactions.forEach((transaction: Transaction) => {
                if (transaction.merchant) {
                    newNodes.set(transaction.merchant.id, {id: transaction.merchant.id, description: transaction.merchant.name})

                    if (transaction.amount < 0) {
                        const linkKey = `${transaction.account_id}:${transaction.merchant.id}`
                        const existingLink = newLinks.get(linkKey)
                        const linkValue = Math.abs(transaction.amount)
                        
                        if (existingLink) {
                            existingLink.value += linkValue
                        } else {
                            newLinks.set(linkKey, {
                                source: transaction.account_id,
                                target: transaction.merchant.id,
                                value: linkValue
                            })
                        }
                    }
                }
            })

            setChartNodes([...newNodes.values()])
            setChartLinks([...newLinks.values()])
        }
    }, [allAccounts, sankeyViewMode, availableCategories, visibleCategories, sankeyFilters.minimumAmount])


    useEffect(() => {
        setupFunction()
        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        if (filteredTransactions.length > 0) {
            processTransactionsToChart(filteredTransactions)
        }
    }, [filteredTransactions, processTransactionsToChart])


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900">Loading your financial data...</h2>
                    <p className="text-gray-600 mt-2">{loadingMessage}</p>
                    {transactionLoading && (
                        <div className="mt-4">
                            <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                                <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Fetching transactions...</p>
                        </div>
                    )}
                    {(loadingMessage.includes('Settings') || loadingMessage.includes('Database version')) && (
                        <div className="mt-6">
                            <button 
                                onClick={() => window.location.href = '/settings'}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                            >
                                Go to Settings
                            </button>
                            <p className="text-sm text-gray-500 mt-2">
                                Manage your data and resolve issues in Settings
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // For insights view, we can use all transactions for now
    const totalTransactions = allTransactions.length;
    const totalSpending = allTransactions.filter(t => t.amount < 0 && t.include_in_spending).reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const views = [
        { key: 'overview', label: 'Account Overview', icon: '🏦' },
        { key: 'insights', label: 'Spending Insights', icon: '📊' },
        { key: 'trends', label: 'Trends Analysis', icon: '📈' },
        { key: 'sankey', label: 'Money Flow', icon: '🔄' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Header 
                title="Financial Dashboard"
                subtitle={`${totalTransactions.toLocaleString()} transactions • Total spending: £${(totalSpending / 100).toLocaleString()}`}
                showNavigation={true}
                customActions={
                    <div className="hidden md:flex space-x-6">
                        {budgets && budgets.length > 0 && (
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{budgets.length}</p>
                                <p className="text-sm text-gray-600">Active Budgets</p>
                            </div>
                        )}
                        {debts && debts.length > 0 && (
                            <div className="text-center">
                                <p className="text-2xl font-bold text-red-600">{debts.length}</p>
                                <p className="text-sm text-gray-600">Active Debts</p>
                            </div>
                        )}
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{allAccounts.length}</p>
                            <p className="text-sm text-gray-600">Accounts</p>
                        </div>
                    </div>
                }
            />

            {/* View Navigation Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {views.map(view => (
                            <button
                                key={view.key}
                                onClick={() => setActiveView(view.key as any)}
                                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeView === view.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span>{view.icon}</span>
                                <span>{view.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            {activeView === 'sankey' && (
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <FilterBar />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeView === 'overview' && (
                    <AccountOverview transactions={allTransactions} accounts={allAccounts} />
                )}
                
                {activeView === 'insights' && (
                    <SpendingInsights transactions={allTransactions} />
                )}
                
                {activeView === 'trends' && (
                    <TrendsAnalysis transactions={allTransactions} />
                )}
                
                {activeView === 'sankey' && (
                    <div>
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Money Flow Visualization</h3>
                            <p className="text-gray-600">
                                {sankeyViewMode === 'categories' 
                                    ? 'Visual representation of money flowing from accounts to spending categories'
                                    : 'Visual representation of money flowing from accounts to merchants'
                                }
                            </p>
                        </div>

                        {/* Enhanced Filter Bar */}
                        <SankeyFilterBar
                            accounts={allAccounts}
                            filters={sankeyFilters}
                            onFiltersChange={setSankeyFilters}
                            availableCategories={availableCategories}
                            selectedCategories={visibleCategories}
                            onCategoriesChange={setVisibleCategories}
                        />

                        <div className="bg-white rounded-lg shadow p-6">
                            {/* View Mode Controls */}
                            <div className="mb-6 space-y-4">
                                <div className="flex justify-center space-x-4">
                                    <button
                                        onClick={() => setSankeyViewMode('merchants')}
                                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                                            sankeyViewMode === 'merchants'
                                                ? 'bg-blue-500 text-white shadow-md transform scale-105'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
                                        }`}
                                    >
                                        By Merchants
                                    </button>
                                    <button
                                        onClick={() => setSankeyViewMode('categories')}
                                        className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                                            sankeyViewMode === 'categories'
                                                ? 'bg-blue-500 text-white shadow-md transform scale-105'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
                                        }`}
                                    >
                                        By Categories
                                    </button>
                                </div>

                                {/* Transaction Summary */}
                                <div className="text-center space-y-2">
                                    <div className="text-sm text-gray-600">
                                        Showing {chartnodes.length} nodes and {chartLinks.length} connections from {filteredTransactions.length} transactions
                                        {allTransactions.length > filteredTransactions.length && (
                                            <span className="text-blue-600 font-medium">
                                                {' '}({allTransactions.length - filteredTransactions.length} filtered out)
                                            </span>
                                        )}
                                    </div>
                                    {isFilteringActive && (
                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                            </svg>
                                            Active Filters Applied
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <Chart width={900} height={700} data={{nodes: chartnodes, links: chartLinks}} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Buttons */}
            <FloatingActionButtons buttons={dashboardFABs()} />
        </div>
    )
}

export default Index