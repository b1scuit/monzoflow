import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import { Transaction } from "../../types/Transactions"
import { useFetch } from "use-http";

type TransactionsResponse = {
    transactions: Transaction[]
}

export const useTransactions = () => {
    const { get, loading, error } = useFetch<TransactionsResponse | undefined>('/transactions')
    const db = useDatabase()

    // Check if token is stale (older than 5 minutes)
    const isTokenStale = (): boolean => {
        const authData = localStorage.getItem('authData')
        if (!authData) return true
        
        try {
            JSON.parse(authData) // Validate JSON format
            const tokenTimestamp = localStorage.getItem('tokenTimestamp')
            
            if (!tokenTimestamp) {
                // If no timestamp exists, consider token stale
                localStorage.setItem('tokenTimestamp', Date.now().toString())
                return true
            }
            
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
            return parseInt(tokenTimestamp) < fiveMinutesAgo
        } catch {
            return true
        }
    }

    // Check if transactions were pulled recently (within 5 minutes)
    const wasRecentlyPulled = (accountId: string): boolean => {
        const lastPullKey = `lastTransactionPull_${accountId}`
        const lastPull = localStorage.getItem(lastPullKey)
        
        if (!lastPull) return false
        
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        return parseInt(lastPull) > fiveMinutesAgo
    }

    // Check if user signed in recently (within 5 minutes)
    const wasRecentlySignedIn = (): boolean => {
        const lastSignIn = localStorage.getItem('lastSignIn')
        
        if (!lastSignIn) return false
        
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        return parseInt(lastSignIn) > fiveMinutesAgo
    }

    // Generate date range based on token age
    const getDateRange = (): { since: string; before: string } => {
        const now = new Date()
        const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
        
        if (isTokenStale()) {
            // For stale tokens, only pull last 90 days maximum
            return {
                since: ninetyDaysAgo.toISOString(),
                before: now.toISOString()
            }
        } else {
            // For fresh tokens, can pull more historical data
            return {
                since: '2023-07-01T00:00:00Z',
                before: now.toISOString()
            }
        }
    }

    const retrieveTransactions = async (account_id: string): Promise<Transaction[] | undefined> => {
        // Throttling checks
        if (wasRecentlySignedIn()) {
            console.log('Skipping transaction pull - user signed in recently')
            return
        }
        
        if (wasRecentlyPulled(account_id)) {
            console.log('Skipping transaction pull - transactions pulled recently for account:', account_id)
            return
        }

        // Token validation for old transactions
        if (isTokenStale()) {
            console.log('Token is stale, limiting to 90 days of transactions')
        }

        const { since, before } = getDateRange()
        const url = `?expand[]=merchant&limit=100&since=${since}&before=${before}&account_id=${account_id}`
        
        try {
            const response = await get(url)
            
            if (response && response.transactions) {
                // Update last pull timestamp
                localStorage.setItem(`lastTransactionPull_${account_id}`, Date.now().toString())
                
                // Store in database
                await db.transactions.bulkPut(response.transactions)
                return response.transactions
            }
        } catch (err) {
            console.error('Failed to retrieve transactions:', err)
            throw err
        }
    }

    return {
        retrieveTransactions,
        loading,
        error,
        isTokenStale
    }
}