import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import { Transaction } from "../../types/Transactions"
import { useFetch } from "use-http";
import { useCallback, useMemo } from "react";

type TransactionsResponse = {
    transactions: Transaction[]
}

type RetryOptions = {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    jitter: boolean;
}

type PaginationMetrics = {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTransactions: number;
    averageResponseTime: number;
    errors: string[];
}

type TransactionSyncState = {
    isInProgress: boolean;
    progress: number;
    currentChunk: number;
    totalChunks: number;
    error?: string;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true
};

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

    // Check if transactions were pulled recently (within 1 hour by default)
    const wasRecentlyPulled = (accountId: string, thresholdMinutes: number = 60): boolean => {
        const lastPullKey = `lastTransactionPull_${accountId}`
        const lastPull = localStorage.getItem(lastPullKey)
        
        if (!lastPull) return false
        
        const thresholdAgo = Date.now() - (thresholdMinutes * 60 * 1000)
        return parseInt(lastPull) > thresholdAgo
    }

    // Enhanced error handling with exponential backoff retry logic
    const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

    const calculateRetryDelay = (attempt: number, options: RetryOptions): number => {
        const exponentialDelay = Math.min(options.baseDelay * Math.pow(2, attempt), options.maxDelay)
        
        if (options.jitter) {
            // Add random jitter to prevent thundering herd
            const jitterAmount = exponentialDelay * 0.1 * Math.random()
            return exponentialDelay + jitterAmount
        }
        
        return exponentialDelay
    }

    const shouldRetryError = (error: any): boolean => {
        // Retry on network errors, rate limiting, and temporary server errors
        const status = error?.response?.status
        const message = error?.message?.toLowerCase() || ''
        
        // Don't retry on authentication errors or client errors (except rate limiting)
        if (status === 401 || status === 403) return false
        if (status >= 400 && status < 500 && status !== 429) return false
        
        // Retry on rate limiting, server errors, network errors
        return status === 429 || status >= 500 || message.includes('network') || message.includes('timeout')
    }

    // Check if user signed in recently (within 5 minutes)
    const wasRecentlySignedIn = (): boolean => {
        const lastSignIn = localStorage.getItem('lastSignIn')
        
        if (!lastSignIn) return false
        
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        return parseInt(lastSignIn) > fiveMinutesAgo
    }

    // Adaptive chunk sizing based on estimated transaction volume
    const getOptimalChunkSize = (timeRangeMs: number): number => {
        const days = timeRangeMs / (24 * 60 * 60 * 1000)
        
        // Estimate transactions per day (assume ~5 transactions/day average)
        const estimatedTransactionsPerDay = 5
        const estimatedTotal = days * estimatedTransactionsPerDay
        
        // If estimated transactions > 80 (80% of 100 limit), use smaller chunks
        if (estimatedTotal > 80) {
            return Math.max(30, Math.floor(days * 0.5)) // Reduce chunk size by 50%
        }
        
        // Use larger chunks for sparse periods, smaller for dense periods
        return Math.min(350, Math.max(30, Math.floor(days)))
    }

    // Intelligent pagination with transaction ID cursors when available
    const getDateRangeChunks = (lastKnownTransactionId?: string): { since: string; before: string; startingAfter?: string }[] => {
        const now = new Date()
        const chunks: { since: string; before: string; startingAfter?: string }[] = []
        
        if (isTokenStale()) {
            // For stale tokens, only pull last 90 days maximum
            const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
            chunks.push({
                since: ninetyDaysAgo.toISOString(),
                before: now.toISOString(),
                startingAfter: lastKnownTransactionId
            })
        } else {
            // For fresh tokens, use intelligent chunking
            const startDate = new Date('2023-07-01T00:00:00Z')
            let currentStart = new Date(startDate)
            
            while (currentStart < now) {
                const timeRangeMs = now.getTime() - currentStart.getTime()
                const optimalChunkDays = getOptimalChunkSize(timeRangeMs)
                
                const chunkEnd = new Date(currentStart.getTime() + (optimalChunkDays * 24 * 60 * 60 * 1000))
                const actualEnd = chunkEnd > now ? now : chunkEnd
                
                chunks.push({
                    since: currentStart.toISOString(),
                    before: actualEnd.toISOString(),
                    startingAfter: currentStart.getTime() === startDate.getTime() ? lastKnownTransactionId : undefined
                })
                
                // Move to next chunk with 1-second buffer to prevent overlap
                currentStart = new Date(actualEnd.getTime() + 1000)
            }
        }
        
        return chunks
    }

    // Enhanced deduplication with integrity checks
    const deduplicateTransactions = (transactions: Transaction[]): Transaction[] => {
        const seen = new Set<string>()
        const deduplicated: Transaction[] = []
        
        for (const transaction of transactions) {
            const key = `${transaction.id}_${transaction.created}`
            if (!seen.has(key)) {
                seen.add(key)
                deduplicated.push(transaction)
            }
        }
        
        console.log(`Deduplicated ${transactions.length - deduplicated.length} duplicate transactions`)
        return deduplicated
    }

    // Track API performance metrics
    const trackAPIMetrics = (metrics: PaginationMetrics): void => {
        const metricsKey = 'transaction_api_metrics'
        const existingMetrics = JSON.parse(localStorage.getItem(metricsKey) || '[]')
        
        const newMetrics = {
            timestamp: Date.now(),
            ...metrics
        }
        
        existingMetrics.push(newMetrics)
        
        // Keep only last 10 metrics entries
        if (existingMetrics.length > 10) {
            existingMetrics.splice(0, existingMetrics.length - 10)
        }
        
        localStorage.setItem(metricsKey, JSON.stringify(existingMetrics))
    }

    // Enhanced transaction retrieval with comprehensive error handling and retry logic
    const retrieveTransactions = async (account_id: string, forceRefresh: boolean = false, onProgress?: (state: TransactionSyncState) => void): Promise<Transaction[] | undefined> => {
        const startTime = Date.now()
        const metrics: PaginationMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalTransactions: 0,
            averageResponseTime: 0,
            errors: []
        }

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

        // Get last known transaction ID for cursor-based pagination
        const lastKnownTransaction = await db.transactions
            .where('account_id')
            .equals(account_id)
            .reverse()
            .first()
        
        const dateRangeChunks = getDateRangeChunks(lastKnownTransaction?.id)
        console.log(`Fetching transactions in ${dateRangeChunks.length} chunk(s) for account ${account_id}`)
        
        let allTransactions: Transaction[] = []
        
        // Update progress
        const updateProgress = (currentChunk: number, error?: string) => {
            if (onProgress) {
                onProgress({
                    isInProgress: true,
                    progress: (currentChunk / dateRangeChunks.length) * 100,
                    currentChunk,
                    totalChunks: dateRangeChunks.length,
                    error
                })
            }
        }

        try {
            updateProgress(0)
            
            // Process each date range chunk with retry logic
            for (let i = 0; i < dateRangeChunks.length; i++) {
                const { since, before, startingAfter } = dateRangeChunks[i]
                
                // Construct URL with cursor-based pagination if available
                let url = `?expand[]=merchant&limit=100&since=${since}&before=${before}&account_id=${account_id}`
                if (startingAfter) {
                    url += `&starting_after=${startingAfter}`
                }
                
                console.log(`Fetching chunk ${i + 1}/${dateRangeChunks.length}: ${since} to ${before}`)
                
                let chunkSuccess = false
                let lastError: any = null
                
                // Retry logic for each chunk
                for (let retryAttempt = 0; retryAttempt <= DEFAULT_RETRY_OPTIONS.maxRetries; retryAttempt++) {
                    try {
                        const requestStart = Date.now()
                        metrics.totalRequests++
                        
                        const response = await get(url)
                        const requestTime = Date.now() - requestStart
                        
                        if (response && response.transactions) {
                            allTransactions = [...allTransactions, ...response.transactions]
                            metrics.successfulRequests++
                            metrics.totalTransactions += response.transactions.length
                            metrics.averageResponseTime = ((metrics.averageResponseTime * (metrics.successfulRequests - 1)) + requestTime) / metrics.successfulRequests
                            
                            console.log(`Chunk ${i + 1} retrieved ${response.transactions.length} transactions in ${requestTime}ms`)
                            chunkSuccess = true
                            break
                        } else {
                            console.log(`Chunk ${i + 1} returned no transactions`)
                            metrics.successfulRequests++
                            chunkSuccess = true
                            break
                        }
                    } catch (chunkError: any) {
                        lastError = chunkError
                        metrics.failedRequests++
                        
                        console.error(`Chunk ${i + 1} attempt ${retryAttempt + 1} failed:`, chunkError)
                        
                        // Check if it's a time range error - handle various error formats
                        const errorMessage = chunkError?.message || ''
                        const isTimeRangeError = 
                            errorMessage.includes('invalid_time_range') || 
                            errorMessage.includes('time range') ||
                            errorMessage.includes('8760') ||
                            (chunkError?.response?.data && 
                             (chunkError.response.data.code === 'bad_request.invalid_time_range' ||
                              chunkError.response.data.error?.includes('time range')))
                        
                        if (isTimeRangeError) {
                            console.error(`Monzo API time range error in chunk ${i + 1}:`, errorMessage)
                            metrics.errors.push(`Time range error in chunk ${i + 1}: ${errorMessage}`)
                            throw new Error(`Monzo API time range error in chunk ${i + 1}. Try reducing the date range.`)
                        }
                        
                        // Check if we should retry this error
                        if (!shouldRetryError(chunkError) || retryAttempt === DEFAULT_RETRY_OPTIONS.maxRetries) {
                            console.warn(`Not retrying chunk ${i + 1} - continuing with remaining chunks`)
                            metrics.errors.push(`Non-retryable error in chunk ${i + 1}: ${errorMessage}`)
                            break
                        }
                        
                        // Calculate delay for next retry
                        const delay = calculateRetryDelay(retryAttempt, DEFAULT_RETRY_OPTIONS)
                        console.log(`Retrying chunk ${i + 1} in ${delay}ms (attempt ${retryAttempt + 1}/${DEFAULT_RETRY_OPTIONS.maxRetries})`)
                        
                        await sleep(delay)
                    }
                }
                
                // Update progress
                updateProgress(i + 1, !chunkSuccess ? lastError?.message : undefined)
                
                // Add intelligent delay between requests
                if (i < dateRangeChunks.length - 1) {
                    // Adaptive delay based on previous response times
                    const adaptiveDelay = Math.min(1000, Math.max(200, metrics.averageResponseTime * 0.5))
                    await sleep(adaptiveDelay)
                }
            }
            
            // Deduplicate transactions to ensure data integrity
            const deduplicatedTransactions = deduplicateTransactions(allTransactions)
            metrics.totalTransactions = deduplicatedTransactions.length
            
            console.log(`Total transactions retrieved for account ${account_id}: ${deduplicatedTransactions.length}`)
            
            if (deduplicatedTransactions.length > 0) {
                // Update last pull timestamp
                localStorage.setItem(`lastTransactionPull_${account_id}`, Date.now().toString())
                
                // Store in database with bulk operation for efficiency
                await db.transactions.bulkPut(deduplicatedTransactions)
                
                // Track metrics
                trackAPIMetrics(metrics)
                
                // Final progress update
                if (onProgress) {
                    onProgress({
                        isInProgress: false,
                        progress: 100,
                        currentChunk: dateRangeChunks.length,
                        totalChunks: dateRangeChunks.length
                    })
                }
                
                return deduplicatedTransactions
            }
            
            // Even if no transactions, mark as complete
            if (onProgress) {
                onProgress({
                    isInProgress: false,
                    progress: 100,
                    currentChunk: dateRangeChunks.length,
                    totalChunks: dateRangeChunks.length
                })
            }
            
        } catch (err) {
            console.error('Failed to retrieve transactions:', err)
            metrics.errors.push(`Fatal error: ${err}`)
            trackAPIMetrics(metrics)
            
            if (onProgress) {
                onProgress({
                    isInProgress: false,
                    progress: 0,
                    currentChunk: 0,
                    totalChunks: dateRangeChunks.length,
                    error: err instanceof Error ? err.message : 'Unknown error'
                })
            }
            
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

    // Get API performance metrics for monitoring
    const getAPIMetrics = (): any[] => {
        const metricsKey = 'transaction_api_metrics'
        return JSON.parse(localStorage.getItem(metricsKey) || '[]')
    }

    // Clear API metrics
    const clearAPIMetrics = (): void => {
        localStorage.removeItem('transaction_api_metrics')
    }

    // Enhanced incremental sync for ongoing updates
    const incrementalSync = async (account_id: string, onProgress?: (state: TransactionSyncState) => void): Promise<Transaction[] | undefined> => {
        console.log('Starting incremental sync for account:', account_id)
        
        // Get last sync timestamp
        const lastSyncKey = `lastIncrementalSync_${account_id}`
        const lastSync = localStorage.getItem(lastSyncKey)
        
        if (!lastSync) {
            // If no previous sync, do a full sync
            console.log('No previous incremental sync found, performing full sync')
            return await retrieveTransactions(account_id, false, onProgress)
        }
        
        // Only sync transactions from the last sync point
        const sinceDate = new Date(parseInt(lastSync))
        const now = new Date()
        
        // Use a single request for incremental sync (recent transactions)
        const url = `?expand[]=merchant&limit=100&since=${sinceDate.toISOString()}&before=${now.toISOString()}&account_id=${account_id}`
        
        try {
            if (onProgress) {
                onProgress({
                    isInProgress: true,
                    progress: 50,
                    currentChunk: 1,
                    totalChunks: 1
                })
            }
            
            const response = await get(url)
            
            if (response && response.transactions) {
                const deduplicatedTransactions = deduplicateTransactions(response.transactions)
                console.log(`Incremental sync retrieved ${deduplicatedTransactions.length} new transactions`)
                
                if (deduplicatedTransactions.length > 0) {
                    await db.transactions.bulkPut(deduplicatedTransactions)
                }
                
                // Update incremental sync timestamp
                localStorage.setItem(lastSyncKey, now.getTime().toString())
                
                if (onProgress) {
                    onProgress({
                        isInProgress: false,
                        progress: 100,
                        currentChunk: 1,
                        totalChunks: 1
                    })
                }
                
                return deduplicatedTransactions
            }
        } catch (error) {
            console.error('Incremental sync failed:', error)
            if (onProgress) {
                onProgress({
                    isInProgress: false,
                    progress: 0,
                    currentChunk: 0,
                    totalChunks: 1,
                    error: error instanceof Error ? error.message : 'Unknown error'
                })
            }
            throw error
        }
    }

    return {
        retrieveTransactions,
        forceRefreshAllTransactions,
        incrementalSync,
        loading,
        error,
        isTokenStale,
        getAPIMetrics,
        clearAPIMetrics,
        wasRecentlyPulled
    }
}