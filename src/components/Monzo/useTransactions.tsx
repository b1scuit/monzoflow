import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import { Transaction } from "../../types/Transactions"
import { useFetch } from "use-http";
import { useCallback, useMemo } from "react";

type TransactionsResponse = {
    transactions: Transaction[]
}

export const useTransactions = () => {
    const { get, loading, error } = useFetch<TransactionsResponse | undefined>('/transactions')
    const db = useDatabase()

    // Memoized token staleness check to prevent excessive calls
    const tokenStaleness = useMemo(() => {
        const authData = localStorage.getItem('auth_data')
        if (!authData) return { isStale: true, checkedAt: Date.now() }
        
        try {
            JSON.parse(authData) // Validate JSON format
            const tokenTimestamp = localStorage.getItem('tokenTimestamp')
            
            if (!tokenTimestamp) {
                // If no timestamp exists, set it now and consider token fresh
                localStorage.setItem('tokenTimestamp', Date.now().toString())
                console.log('No token timestamp found, setting fresh timestamp - token is fresh')
                return { isStale: false, checkedAt: Date.now() }
            }
            
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
            const isStale = parseInt(tokenTimestamp) < fiveMinutesAgo
            
            // Only log once when staleness changes, not on every call
            const lastLoggedStatus = localStorage.getItem('lastTokenStatus')
            const currentStatus = isStale ? 'stale' : 'fresh'
            
            if (lastLoggedStatus !== currentStatus) {
                localStorage.setItem('lastTokenStatus', currentStatus)
                if (isStale) {
                    console.log('Token is stale (older than 5 minutes)')
                } else {
                    console.log('Token is fresh (within 5 minutes)')
                }
            }
            
            return { isStale, checkedAt: Date.now() }
        } catch {
            return { isStale: true, checkedAt: Date.now() }
        }
    }, []) // Empty dependency array means this only runs once

    // Stable function reference that checks if we need to recompute staleness
    const isTokenStale = useCallback((): boolean => {
        // If the check is recent (within 30 seconds), use cached result
        const thirtySecondsAgo = Date.now() - (30 * 1000)
        if (tokenStaleness.checkedAt > thirtySecondsAgo) {
            return tokenStaleness.isStale
        }
        
        // For real-time checks, do a quick validation without logging
        const tokenTimestamp = localStorage.getItem('tokenTimestamp')
        if (!tokenTimestamp) return true
        
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        return parseInt(tokenTimestamp) < fiveMinutesAgo
    }, [tokenStaleness])

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

    const retrieveTransactions = async (account_id: string, forceRefresh: boolean = false): Promise<Transaction[] | undefined> => {
        // Skip throttling checks if forcing refresh
        if (!forceRefresh) {
            // Throttling checks
            if (wasRecentlySignedIn()) {
                console.log('Skipping transaction pull - user signed in recently')
                return
            }
            
            if (wasRecentlyPulled(account_id)) {
                console.log('Skipping transaction pull - transactions pulled recently for account:', account_id)
                return
            }
        } else {
            console.log('Force refresh enabled - bypassing throttling for account:', account_id)
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

    // Helper function to force refresh all transactions for all accounts
    const forceRefreshAllTransactions = async (accounts: any[]): Promise<void> => {
        console.log('Force refreshing transactions for all accounts...')
        
        // Clear existing transaction pull timestamps to allow fresh pulls
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('lastTransactionPull_')) {
                localStorage.removeItem(key)
            }
        })
        
        // Force pull transactions for all accounts
        const refreshPromises = accounts.map(async (account) => {
            try {
                return await retrieveTransactions(account.id, true)
            } catch (error) {
                console.error(`Failed to force refresh transactions for account ${account.id}:`, error)
                return []
            }
        })
        
        await Promise.allSettled(refreshPromises)
        console.log('Force refresh completed for all accounts')
    }

    return {
        retrieveTransactions,
        forceRefreshAllTransactions,
        loading,
        error,
        isTokenStale
    }
}