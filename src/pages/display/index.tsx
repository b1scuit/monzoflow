import { Chart, Node, Link } from "components/Chart/Chart";
import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import FilterBar from "components/FilterBar/FilterBar";
import SpendingInsights from "components/Analytics/SpendingInsights";
import AccountOverview from "components/Analytics/AccountOverview";
import TrendsAnalysis from "components/Analytics/TrendsAnalysis";
import { useAccounts } from "components/Monzo/useAccounts";
import { useTransactions } from "components/Monzo/useTransactions";
import { FC, useEffect, useState, useCallback } from "react";
import { Account, Owners } from "types/Account";
import { Transaction } from "types/Transactions";
import { useLiveQuery } from "dexie-react-hooks";


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
    let links = new Map<string, Link>()
    let [ chartnodes, setChartNodes] = useState<Node[]>([])
    let [chartLinks, setChartLinks] = useState<Link[]>([])
    let [allTransactions, setAllTransactions] = useState<Transaction[]>([])
    let [allAccounts, setAllAccounts] = useState<Account[]>([])
    let [activeView, setActiveView] = useState<'overview' | 'insights' | 'trends' | 'sankey'>('overview')

    const [loading, setLoading] = useState<boolean>(true)
    const db = useDatabase();
    const { retrieveAccounts } = useAccounts();
    const { retrieveTransactions } = useTransactions();
    
    // Live queries for real-time updates
    const budgets = useLiveQuery(() => db.budgets.toArray());
    const debts = useLiveQuery(() => db.debts.where('status').equals('active').toArray());


    // Logic: 
    // Count transactions,if more than zero just return those
    // if not, retrieve accounts from the Monzo API and populate the table, then return them
    // From there use the accounts to get and store transactions
    // from there set the transactions into the current state
    // Resolve loading
    const setupFunction = () => {
        db.accounts.count()
        .then((count: number) => {
            return count
        })
        .then((count: number) =>{
            if (count == 0) {
                return retrieveAccounts().then(() => db.accounts.toArray())
            }

            return db.accounts.toArray()
        })
        .then((accounts: Account[]) => {
            accounts.forEach((acc: Account) => nodes.set(acc.id, {id: acc.id, description:renderName(acc)}))
            return accounts
        })
        // Count transactions and if there are none, go get them
        .then((accounts: Account[]) => {
            return db.transactions.count().then((count) => {
                if (count === 0 ) return Promise.all(accounts.map<Promise<Transaction[]>>((account: Account) =>retrieveTransactions(account.id) ))
            })
        })
        // Retrieve transactions and accounts from DB
        .then(() => Promise.all([
            db.transactions.toArray(),
            db.accounts.toArray()
        ]))
        // Store all data for analytics
        .then(([transactions, accounts]: [Transaction[], Account[]]) => {
            setAllTransactions(transactions)
            setAllAccounts(accounts)
            return { transactions, accounts }
        }).finally(() => setLoading(false))
    }


    const processTransactionsToChart = useCallback((transactions: Transaction[]) => {
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
    }, [allAccounts])

    useEffect(() => {
        setupFunction()
        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        if (allTransactions.length > 0) {
            processTransactionsToChart(allTransactions)
        }
    }, [allTransactions, processTransactionsToChart])


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900">Loading your financial data...</h2>
                    <p className="text-gray-600 mt-2">Analyzing transactions and generating insights</p>
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
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
                            <p className="text-gray-600 mt-1">
                                {totalTransactions.toLocaleString()} transactions • 
                                Total spending: £{(totalSpending / 100).toLocaleString()}
                            </p>
                        </div>

                        {/* Quick Stats */}
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
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex space-x-8 border-b border-gray-200">
                        {views.map(view => (
                            <button
                                key={view.key}
                                onClick={() => setActiveView(view.key as any)}
                                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
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
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Money Flow Visualization</h3>
                            <p className="text-gray-600">
                                Visual representation of money flowing from accounts to merchants
                            </p>
                        </div>
                        <div className="flex justify-center">
                            <Chart width={900} height={700} data={{nodes: chartnodes, links: chartLinks}} />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions Floating Button */}
            <div className="fixed bottom-6 right-6">
                <div className="flex flex-col space-y-2">
                    <button className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors">
                        <span className="text-xl">💳</span>
                    </button>
                    <button 
                        onClick={() => window.location.href = '/budget'}
                        className="bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-colors"
                    >
                        <span className="text-xl">📊</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Index