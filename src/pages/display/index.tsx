import { Chart, Node, Link } from "components/Chart/Chart";
import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import FilterBar, { FilterOptions } from "components/FilterBar/FilterBar";
import { useAccounts } from "components/Monzo/useAccounts";
import { useTransactions } from "components/Monzo/useTransactions";
import { FC, useEffect, useState, useCallback } from "react";
import { Account, Owners } from "types/Account";
import { Transaction } from "types/Transactions";

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
    let [filters, setFilters] = useState<FilterOptions | null>(null)

    const [loading, setLoading] = useState<boolean>(true)
    const db = useDatabase();
    const { retrieveAccounts } = useAccounts();
    const { retrieveTransactions } = useTransactions();


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
            if (count === 0) {
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
        // Retrieve transactions from DB
        .then(() => db.transactions.toArray())
        // Store all transactions for filtering
        .then((transactions: Transaction[]) => {
            setAllTransactions(transactions)
        }).finally(() => setLoading(false))
    }

    const applyFilters = useCallback((transactions: Transaction[], filterOptions: FilterOptions) => {
        let filteredTransactions = [...transactions];

        // Filter by selected accounts
        if (filterOptions.selectedAccounts.length > 0) {
            const selectedAccountIds = filterOptions.selectedAccounts.map(acc => acc.id);
            filteredTransactions = filteredTransactions.filter(t => selectedAccountIds.includes(t.account_id));
        }

        // Filter by date range
        if (filterOptions.dateRange.start || filterOptions.dateRange.end) {
            filteredTransactions = filteredTransactions.filter(t => {
                const transactionDate = new Date(t.created);
                const start = filterOptions.dateRange.start;
                const end = filterOptions.dateRange.end;
                
                if (start && transactionDate < start) return false;
                if (end && transactionDate > end) return false;
                return true;
            });
        }

        // Filter by excluded categories
        if (filterOptions.excludedCategories.length > 0) {
            filteredTransactions = filteredTransactions.filter(t => 
                !filterOptions.excludedCategories.includes(t.category)
            );
        }

        // Filter by spending summary exclusion
        if (filterOptions.excludeFromSpending) {
            filteredTransactions = filteredTransactions.filter(t => t.include_in_spending);
        }

        return filteredTransactions;
    }, []);

    const processTransactionsToChart = useCallback((transactions: Transaction[]) => {
        const newNodes = new Map<string, Node>()
        const newLinks = new Map<string, Link>()
        
        // Add account nodes
        db.accounts.toArray().then(accounts => {
            accounts.forEach((acc: Account) => {
                if (filters?.selectedAccounts.find(sa => sa.id === acc.id)) {
                    newNodes.set(acc.id, {id: acc.id, description: renderName(acc)})
                }
            })
        })

        // Group merchants by frequency and apply payee limit
        const merchantCounts = new Map<string, { count: number, totalAmount: number, merchant: any }>()
        
        transactions.forEach((transaction: Transaction) => {
            if (transaction.merchant) {
                const existing = merchantCounts.get(transaction.merchant.id) || { count: 0, totalAmount: 0, merchant: transaction.merchant }
                merchantCounts.set(transaction.merchant.id, {
                    count: existing.count + 1,
                    totalAmount: existing.totalAmount + Math.abs(transaction.amount),
                    merchant: transaction.merchant
                })
            }
        })

        // Sort merchants by total amount and apply limit
        const sortedMerchants = Array.from(merchantCounts.entries())
            .sort(([,a], [,b]) => b.totalAmount - a.totalAmount)
        
        let topMerchants: Array<[string, any]>
        let otherMerchants: Array<[string, any]> = []
        
        if (filters?.payeeLimit === 'all') {
            topMerchants = sortedMerchants
        } else {
            const limit = filters?.payeeLimit || 50
            topMerchants = sortedMerchants.slice(0, limit)
            otherMerchants = sortedMerchants.slice(limit)
        }

        // Add top merchant nodes
        topMerchants.forEach(([merchantId, data]) => {
            newNodes.set(merchantId, {id: merchantId, description: data.merchant.name})
        })

        // Add "Other" node if there are grouped merchants
        if (otherMerchants.length > 0) {
            newNodes.set("other", {id: "other", description: "Other"})
        }

        // Process transactions into links
        transactions.forEach((transaction: Transaction) => {
            if (transaction.merchant) {
                let targetMerchantId = transaction.merchant.id
                
                // Group into "other" if not in top merchants
                if (transaction.merchant && otherMerchants.find(([id]) => id === transaction.merchant!.id)) {
                    targetMerchantId = "other"
                }

                const linkKey = `${transaction.account_id}:${targetMerchantId}`
                const existingLink = newLinks.get(linkKey)
                
                if (transaction.amount < 0) { // Outgoing transaction
                    const linkValue = Math.abs(transaction.amount)
                    if (existingLink) {
                        existingLink.value += linkValue
                    } else {
                        newLinks.set(linkKey, {
                            source: transaction.account_id,
                            target: targetMerchantId,
                            value: linkValue
                        })
                    }
                }
            }
        })

        setChartNodes([...newNodes.values()])
        setChartLinks([...newLinks.values()])
    }, [filters, db.accounts])

    useEffect(() => {
        setupFunction()
        // eslint-disable-next-line
    }, [])

    useEffect(() => {
        if (filters && allTransactions.length > 0) {
            const filteredTransactions = applyFilters(allTransactions, filters)
            processTransactionsToChart(filteredTransactions)
        }
    }, [filters, allTransactions, applyFilters, processTransactionsToChart])


    return (loading) ? <h1>Loading</h1> : <div className="flex flex-col">
        <FilterBar onFiltersChange={setFilters} />
        <div className="block m-auto mt-4">
            <Chart width={900} height={900} data={{nodes: chartnodes, links: chartLinks}} />
        </div>
    </div>
}

export default Index