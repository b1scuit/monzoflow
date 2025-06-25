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
    totalSyncTime: number;
    apiEfficiencyScore: number;
    errors: string[];
    skippedChunks: number;
    cacheHits: number;
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

// Cache for transaction chunk metadata to avoid redundant API calls
type ChunkCache = {
    [key: string]: {
        lastFetch: number;
        isEmpty: boolean;
        transactionCount: number;
    }
}

// Enhanced token management with priority queuing
type TokenWindow = {
    issuedAt: number;
    remainingWindow: number;
    historicalDataPriority: boolean;
}

export const useTransactions = () => {
    const { get, loading, error } = useFetch<TransactionsResponse | undefined>('/transactions')
    const db = useDatabase()

    // Enhanced token management with priority handling for historical data
    const getTokenWindow = (): TokenWindow => {
        const tokenTimestamp = localStorage.getItem('tokenTimestamp')
        const now = Date.now()
        
        if (!tokenTimestamp) {
            localStorage.setItem('tokenTimestamp', now.toString())
            return {
                issuedAt: now,
                remainingWindow: 5 * 60 * 1000, // 5 minutes
                historicalDataPriority: true
            }
        }
        
        const issuedAt = parseInt(tokenTimestamp)
        const elapsed = now - issuedAt
        const remainingWindow = Math.max(0, (5 * 60 * 1000) - elapsed)
        
        return {
            issuedAt,
            remainingWindow,
            historicalDataPriority: remainingWindow > 0
        }
    }

    // Memoized token staleness check to prevent excessive calls
    const tokenStaleness = useMemo(() => {
        const authData = localStorage.getItem('auth_data')
        if (!authData) return { isStale: true, checkedAt: Date.now() }
        
        try {
            JSON.parse(authData) // Validate JSON format
            const tokenWindow = getTokenWindow()
            const isStale = tokenWindow.remainingWindow <= 0
            
            // Only log once when staleness changes, not on every call
            const lastLoggedStatus = localStorage.getItem('lastTokenStatus')
            const currentStatus = isStale ? 'stale' : 'fresh'
            
            if (lastLoggedStatus !== currentStatus) {
                localStorage.setItem('lastTokenStatus', currentStatus)
                if (isStale) {
                    console.log('Token is stale (older than 5 minutes)')
                } else {
                    console.log(`Token is fresh (${Math.floor(tokenWindow.remainingWindow / 1000)}s remaining for historical data)`)
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

    // Enhanced chunk cache management to avoid redundant API calls
    const getChunkCache = (): ChunkCache => {
        const cacheKey = 'transaction_chunk_cache'
        const cached = localStorage.getItem(cacheKey)
        return cached ? JSON.parse(cached) : {}
    }

    const updateChunkCache = (chunkKey: string, isEmpty: boolean, transactionCount: number): void => {
        const cache = getChunkCache()
        cache[chunkKey] = {
            lastFetch: Date.now(),
            isEmpty,
            transactionCount
        }
        localStorage.setItem('transaction_chunk_cache', JSON.stringify(cache))
    }

    const shouldSkipChunk = (chunkKey: string): boolean => {
        // TEMPORARY: Disable caching to prevent missing transactions
        // TODO: Fix cache key generation and validation logic
        return false
        
        // const cache = getChunkCache()
        // const cached = cache[chunkKey]
        // 
        // if (!cached) return false
        // 
        // // Skip if chunk was empty and fetched within last 24 hours
        // const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
        // return cached.isEmpty && cached.lastFetch > twentyFourHoursAgo
    }

    // Adaptive chunk sizing with learning from historical patterns
    const getOptimalChunkSize = (timeRangeMs: number, accountId: string): number => {
        const days = timeRangeMs / (24 * 60 * 60 * 1000)
        
        // EMERGENCY: Ultra-conservative chunk sizing to capture all transactions
        // Based on your data (9032 transactions over ~5 years), you have high transaction volume
        
        // Assume very high transaction density for safety
        const estimatedTransactionsPerDay = 15 // Much higher estimate
        const estimatedTotal = days * estimatedTransactionsPerDay
        
        // Ultra-aggressive chunking to prevent any API limit hits
        if (estimatedTotal > 30) { // Much lower threshold
            return Math.max(3, Math.floor(days * 0.2)) // Very small chunks
        }
        
        // Cap maximum chunk size at 7 days to be ultra-safe
        // This will create many more API calls but ensure complete data
        return Math.min(7, Math.max(3, Math.floor(days * 0.4))) // Max 7 days per chunk
        
        // Original learning-based logic disabled temporarily
        // const cache = getChunkCache()
        // const accountChunks = Object.entries(cache).filter(([key]) => key.includes(accountId))
        // 
        // if (accountChunks.length > 0) {
        //     const avgTransactionsPerChunk = accountChunks.reduce((sum, [, data]) => sum + data.transactionCount, 0) / accountChunks.length
        //     
        //     // Adjust chunk size based on learned transaction density
        //     if (avgTransactionsPerChunk > 80) {
        //         return Math.max(15, Math.floor(days * 0.3)) // Aggressive reduction for high-density accounts
        //     } else if (avgTransactionsPerChunk > 50) {
        //         return Math.max(30, Math.floor(days * 0.6)) // Moderate reduction
        //     }
        // }
    }

    // Enhanced intelligent pagination with priority-based chunk ordering
    const getDateRangeChunks = (accountId: string, lastKnownTransactionId?: string): { since: string; before: string; startingAfter?: string; priority: number }[] => {
        const now = new Date()
        const tokenWindow = getTokenWindow()
        const chunks: { since: string; before: string; startingAfter?: string; priority: number }[] = []
        
        if (!tokenWindow.historicalDataPriority) {
            // For stale tokens, only pull last 90 days maximum
            const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
            chunks.push({
                since: ninetyDaysAgo.toISOString(),
                before: now.toISOString(),
                startingAfter: lastKnownTransactionId,
                priority: 1 // High priority for recent data
            })
        } else {
            // For fresh tokens, prioritize historical data first, then recent
            // Start from 5 years ago, January 1st
            const currentYear = new Date().getFullYear()
            const startDate = new Date(`${currentYear - 5}-01-01T00:00:00Z`)
            let currentStart = new Date(startDate)
            
            // Prioritize older chunks first to maximize historical data retrieval within token window
            const tempChunks: { since: string; before: string; startingAfter?: string; timeRange: number }[] = []
            
            while (currentStart < now) {
                const timeRangeMs = now.getTime() - currentStart.getTime()
                const optimalChunkDays = getOptimalChunkSize(timeRangeMs, accountId)
                
                const chunkEnd = new Date(currentStart.getTime() + (optimalChunkDays * 24 * 60 * 60 * 1000))
                const actualEnd = chunkEnd > now ? now : chunkEnd
                
                tempChunks.push({
                    since: currentStart.toISOString(),
                    before: actualEnd.toISOString(),
                    // TEMPORARY: Don't use starting_after to ensure complete retrieval
                    // startingAfter: currentStart.getTime() === startDate.getTime() ? lastKnownTransactionId : undefined,
                    startingAfter: undefined,
                    timeRange: currentStart.getTime()
                })
                
                // Move to next chunk with 1-second buffer to prevent overlap
                currentStart = new Date(actualEnd.getTime() + 1000)
            }
            
            // Sort chunks by age (oldest first) but boost priority for recent chunks
            tempChunks.forEach((chunk, index) => {
                const chunkDate = new Date(chunk.since)
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
                
                // Recent chunks get higher priority, older chunks get lower priority
                const priority = chunkDate > thirtyDaysAgo ? 1 : 2 + Math.floor(index / 5)
                
                chunks.push({
                    since: chunk.since,
                    before: chunk.before,
                    startingAfter: chunk.startingAfter,
                    priority
                })
            })
            
            // Sort by priority (lower number = higher priority)
            chunks.sort((a, b) => a.priority - b.priority)
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

    // Enhanced API performance metrics with efficiency scoring
    const trackAPIMetrics = (metrics: PaginationMetrics): void => {
        const metricsKey = 'transaction_api_metrics'
        const existingMetrics = JSON.parse(localStorage.getItem(metricsKey) || '[]')
        
        // Calculate API efficiency score (transactions per request ratio)
        const efficiencyScore = metrics.totalRequests > 0 ? 
            (metrics.totalTransactions / metrics.totalRequests) : 0
        
        const newMetrics = {
            timestamp: Date.now(),
            ...metrics,
            apiEfficiencyScore: Math.round(efficiencyScore * 100) / 100
        }
        
        existingMetrics.push(newMetrics)
        
        // Keep only last 20 metrics entries for better trend analysis
        if (existingMetrics.length > 20) {
            existingMetrics.splice(0, existingMetrics.length - 20)
        }
        
        localStorage.setItem(metricsKey, JSON.stringify(existingMetrics))
        
        // Log efficiency improvements
        if (existingMetrics.length > 1) {
            const previousMetrics = existingMetrics[existingMetrics.length - 2]
            const improvementPct = ((efficiencyScore - previousMetrics.apiEfficiencyScore) / previousMetrics.apiEfficiencyScore) * 100
            
            if (Math.abs(improvementPct) > 5) {
                console.log(`API efficiency ${improvementPct > 0 ? 'improved' : 'decreased'} by ${Math.abs(improvementPct).toFixed(1)}% (${efficiencyScore.toFixed(2)} trans/req)`)
            }
        }
    }

    // Enhanced transaction retrieval with comprehensive error handling and retry logic
    const retrieveTransactions = async (account_id: string, forceRefresh: boolean = false, onProgress?: (state: TransactionSyncState) => void): Promise<Transaction[] | undefined> => {
        const startTime = Date.now()
        const tokenWindow = getTokenWindow()
        const metrics: PaginationMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalTransactions: 0,
            averageResponseTime: 0,
            totalSyncTime: 0,
            apiEfficiencyScore: 0,
            errors: [],
            skippedChunks: 0,
            cacheHits: 0
        }

        // Prioritize historical data if within token window
        if (tokenWindow.historicalDataPriority) {
            console.log(`Token window: ${Math.floor(tokenWindow.remainingWindow / 1000)}s remaining - prioritizing historical data retrieval`)
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
        
        console.log(`Last known transaction for account ${account_id}:`, lastKnownTransaction?.id ? `${lastKnownTransaction.id} (${lastKnownTransaction.created})` : 'None')
        
        // TEMPORARY: Disable cursor-based pagination to ensure complete retrieval
        // The cursor might be causing chunks to skip large portions of data
        const dateRangeChunks = getDateRangeChunks(account_id, undefined) // Don't use lastKnownTransaction?.id
        
        // Apply cache-based filtering to skip known empty chunks
        const filteredChunks = forceRefresh ? dateRangeChunks : dateRangeChunks.filter(chunk => {
            const chunkKey = `${account_id}_${chunk.since}_${chunk.before}`
            const shouldSkip = shouldSkipChunk(chunkKey)
            if (shouldSkip) {
                metrics.skippedChunks++
                metrics.cacheHits++
            }
            return !shouldSkip
        })
        
        console.log(`Fetching transactions in ${filteredChunks.length}/${dateRangeChunks.length} chunk(s) for account ${account_id} (${metrics.skippedChunks} skipped from cache)`)
        console.log(`📅 Date range: ${dateRangeChunks[0]?.since} to ${dateRangeChunks[dateRangeChunks.length - 1]?.before}`)
        console.log(`📊 Expected transactions: ~${Math.round(dateRangeChunks.length * 50)} (rough estimate)`)
        
        let allTransactions: Transaction[] = []
        
        // Update progress
        const updateProgress = (currentChunk: number, error?: string) => {
            if (onProgress) {
                onProgress({
                    isInProgress: true,
                    progress: (currentChunk / filteredChunks.length) * 100,
                    currentChunk,
                    totalChunks: filteredChunks.length,
                    error
                })
            }
        }

        try {
            updateProgress(0)
            
            // Process each date range chunk with retry logic
            for (let i = 0; i < filteredChunks.length; i++) {
                const { since, before, startingAfter } = filteredChunks[i]
                const chunkKey = `${account_id}_${since}_${before}`
                
                // Construct URL with cursor-based pagination if available
                let url = `?expand[]=merchant&limit=100&since=${since}&before=${before}&account_id=${account_id}`
                if (startingAfter) {
                    url += `&starting_after=${startingAfter}`
                }
                
                console.log(`Fetching chunk ${i + 1}/${filteredChunks.length}: ${since} to ${before}`)
                console.log(`  → URL: ${url}`)
                console.log(`  → Chunk size: ~${Math.round((new Date(before).getTime() - new Date(since).getTime()) / (24 * 60 * 60 * 1000))} days`)
                
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
                            
                            // Update chunk cache with successful result
                            updateChunkCache(chunkKey, response.transactions.length === 0, response.transactions.length)
                            
                            console.log(`Chunk ${i + 1} retrieved ${response.transactions.length} transactions in ${requestTime}ms`)
                            if (response.transactions.length === 100) {
                                console.error(`  🚨 CRITICAL: Hit 100 transaction limit in chunk ${i + 1} (${since} to ${before})`)
                                console.error(`      This chunk needs to be split further! Missing transactions likely.`)
                                metrics.errors.push(`Chunk ${i + 1}: Hit 100 transaction limit`)
                            } else if (response.transactions.length > 80) {
                                console.warn(`  ⚠️  Warning: Chunk ${i + 1} has ${response.transactions.length} transactions (approaching limit)`)
                            }
                            chunkSuccess = true
                            break
                        } else {
                            console.log(`Chunk ${i + 1} returned no transactions`)
                            metrics.successfulRequests++
                            
                            // Cache empty result to avoid future calls
                            updateChunkCache(chunkKey, true, 0)
                            
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
                
                // Add intelligent delay between requests with token window consideration
                if (i < filteredChunks.length - 1) {
                    // Adaptive delay based on previous response times and token window
                    let adaptiveDelay = Math.min(1000, Math.max(200, metrics.averageResponseTime * 0.5))
                    
                    // Reduce delay if we're in the token window to maximize historical data retrieval
                    if (tokenWindow.historicalDataPriority && tokenWindow.remainingWindow < 120000) { // Less than 2 minutes
                        adaptiveDelay = Math.min(adaptiveDelay, 100) // Aggressive mode
                        console.log('Token window closing - reducing delay to maximize historical data retrieval')
                    }
                    
                    await sleep(adaptiveDelay)
                }
            }
            
            // Deduplicate transactions to ensure data integrity
            const deduplicatedTransactions = deduplicateTransactions(allTransactions)
            metrics.totalTransactions = deduplicatedTransactions.length
            metrics.totalSyncTime = Date.now() - startTime
            
            // Calculate and log efficiency metrics
            const efficiencyScore = metrics.totalRequests > 0 ? metrics.totalTransactions / metrics.totalRequests : 0
            const timeSaved = metrics.skippedChunks * (metrics.averageResponseTime || 500) // Estimate time saved from cache
            
            console.log(`Total transactions retrieved for account ${account_id}: ${deduplicatedTransactions.length}`)
            console.log(`API Efficiency: ${efficiencyScore.toFixed(2)} transactions/request, ${metrics.skippedChunks} chunks skipped, ~${Math.round(timeSaved)}ms saved`)
            
            // Check for potential missing transactions
            const chunksWithLimits = metrics.errors.filter(e => e.includes('100 transaction limit')).length
            if (chunksWithLimits > 0) {
                console.error(`⚠️  WARNING: ${chunksWithLimits} chunks hit the 100-transaction limit. May be missing transactions!`)
                console.error(`   Consider reducing chunk sizes further or implementing cursor-based pagination within chunks.`)
            }
            
            console.log(`📊 Retrieval Summary: ${filteredChunks.length} chunks processed, ${metrics.totalRequests} API calls, ${metrics.successfulRequests} successful`)
            
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
                        currentChunk: filteredChunks.length,
                        totalChunks: filteredChunks.length
                    })
                }
                
                return deduplicatedTransactions
            }
            
            // Even if no transactions, mark as complete and track metrics
            trackAPIMetrics(metrics)
            
            if (onProgress) {
                onProgress({
                    isInProgress: false,
                    progress: 100,
                    currentChunk: filteredChunks.length,
                    totalChunks: filteredChunks.length
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
                    totalChunks: filteredChunks.length,
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

    // Clear chunk cache for fresh starts
    const clearChunkCache = (): void => {
        localStorage.removeItem('transaction_chunk_cache')
        console.log('🗑️ Transaction chunk cache cleared - next retrieval will fetch all chunks')
    }

    // Force clear all transaction-related cache data
    const clearAllTransactionCache = (): void => {
        // Clear chunk cache
        localStorage.removeItem('transaction_chunk_cache')
        // Clear last pull timestamps  
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('lastTransactionPull_') || key.startsWith('lastIncrementalSync_')) {
                localStorage.removeItem(key)
            }
        })
        console.log('🗑️ All transaction cache data cleared - next retrieval will be completely fresh')
    }

    // Get efficiency analytics for monitoring dashboard
    const getEfficiencyAnalytics = (): { 
        averageEfficiency: number; 
        trend: 'improving' | 'declining' | 'stable';
        totalTimeSaved: number;
        cacheHitRate: number;
    } => {
        const metrics = getAPIMetrics()
        if (metrics.length < 2) {
            return { averageEfficiency: 0, trend: 'stable', totalTimeSaved: 0, cacheHitRate: 0 }
        }

        const totalEfficiency = metrics.reduce((sum, m) => sum + (m.apiEfficiencyScore || 0), 0)
        const averageEfficiency = totalEfficiency / metrics.length

        // Calculate trend
        const recent = metrics.slice(-3).reduce((sum, m) => sum + (m.apiEfficiencyScore || 0), 0) / 3
        const older = metrics.slice(-6, -3).reduce((sum, m) => sum + (m.apiEfficiencyScore || 0), 0) / 3
        
        let trend: 'improving' | 'declining' | 'stable' = 'stable'
        const improvementThreshold = 0.1
        if (recent - older > improvementThreshold) trend = 'improving'
        else if (older - recent > improvementThreshold) trend = 'declining'

        // Calculate total time saved from caching
        const totalTimeSaved = metrics.reduce((sum, m) => {
            const estimatedTimePerSkip = m.averageResponseTime || 500
            return sum + ((m.skippedChunks || 0) * estimatedTimePerSkip)
        }, 0)

        // Calculate cache hit rate
        const totalChunks = metrics.reduce((sum, m) => sum + (m.totalRequests || 0) + (m.skippedChunks || 0), 0)
        const totalSkipped = metrics.reduce((sum, m) => sum + (m.skippedChunks || 0), 0)
        const cacheHitRate = totalChunks > 0 ? (totalSkipped / totalChunks) * 100 : 0

        return { averageEfficiency, trend, totalTimeSaved, cacheHitRate }
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
        clearChunkCache,
        clearAllTransactionCache,
        getEfficiencyAnalytics,
        getTokenWindow,
        wasRecentlyPulled
    }
}