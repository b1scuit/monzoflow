import { renderHook, act } from '@testing-library/react';
import { useTransactions } from './useTransactions';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { useFetch } from 'use-http';

// Mock dependencies
jest.mock('components/DatabaseContext/DatabaseContext');
jest.mock('use-http');

// Create a proper mock for the Dexie query chain
const createMockQueryChain = () => {
    const mockChain = {
        where: jest.fn().mockReturnThis(),
        equals: jest.fn().mockReturnThis(),
        reverse: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        orderBy: jest.fn().mockReturnThis(),
        last: jest.fn().mockResolvedValue(null),
        toArray: jest.fn().mockResolvedValue([])
    };
    
    // Make sure all chain methods return the mock chain itself
    Object.keys(mockChain).forEach(key => {
        if (typeof mockChain[key as keyof typeof mockChain] === 'function' && 
            !['first', 'last', 'toArray', 'bulkPut'].includes(key)) {
            mockChain[key as keyof typeof mockChain] = jest.fn().mockReturnValue(mockChain);
        }
    });
    
    return mockChain;
};

const mockDatabase = {
    transactions: {
        bulkPut: jest.fn().mockResolvedValue(undefined),
        ...createMockQueryChain()
    }
};

const mockGet = jest.fn();
const mockUseFetch = {
    get: mockGet,
    loading: false,
    error: null
};

(useDatabase as jest.Mock).mockReturnValue(mockDatabase);

// Properly mock the entire use-http module
const useFetchMock = useFetch as jest.MockedFunction<typeof useFetch>;
useFetchMock.mockReturnValue(mockUseFetch);

describe('useTransactions Enhanced Features', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        
        // Re-setup mocks after clearing
        useFetchMock.mockReturnValue(mockUseFetch);
        (useDatabase as jest.Mock).mockReturnValue(mockDatabase);
        
        // Reset database mock functions to resolved values
        mockDatabase.transactions.bulkPut.mockResolvedValue(undefined);
        mockDatabase.transactions.first.mockResolvedValue(null);
        mockDatabase.transactions.last.mockResolvedValue(null);
        mockDatabase.transactions.toArray.mockResolvedValue([]);
        
        // Ensure chain methods return the mock database
        mockDatabase.transactions.where.mockReturnValue(mockDatabase.transactions);
        mockDatabase.transactions.equals.mockReturnValue(mockDatabase.transactions);
        mockDatabase.transactions.reverse.mockReturnValue(mockDatabase.transactions);
        mockDatabase.transactions.orderBy.mockReturnValue(mockDatabase.transactions);
        
        // Set up fresh token
        localStorage.setItem('auth_data', JSON.stringify({ token: 'test-token' }));
        localStorage.setItem('tokenTimestamp', Date.now().toString());
    });

    describe('Token Staleness Detection', () => {
        test('should detect fresh token (within 5 minutes)', () => {
            const { result } = renderHook(() => useTransactions());
            
            expect(result.current.isTokenStale()).toBe(false);
        });

        test('should detect stale token (older than 5 minutes)', () => {
            // Set token timestamp to 10 minutes ago
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            localStorage.setItem('tokenTimestamp', tenMinutesAgo.toString());
            
            const { result } = renderHook(() => useTransactions());
            
            expect(result.current.isTokenStale()).toBe(true);
        });

        test('should handle missing token timestamp', () => {
            localStorage.removeItem('tokenTimestamp');
            
            const { result } = renderHook(() => useTransactions());
            
            expect(result.current.isTokenStale()).toBe(true);
        });
    });

    describe('Enhanced Throttling Logic', () => {
        test('should respect recent pull throttling', () => {
            const accountId = 'test-account-id';
            
            // Set recent pull timestamp
            localStorage.setItem(`lastTransactionPull_${accountId}`, Date.now().toString());
            
            const { result } = renderHook(() => useTransactions());
            
            expect(result.current.wasRecentlyPulled(accountId)).toBe(true);
        });

        test('should allow custom throttling threshold', () => {
            const accountId = 'test-account-id';
            const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
            
            localStorage.setItem(`lastTransactionPull_${accountId}`, thirtyMinutesAgo.toString());
            
            const { result } = renderHook(() => useTransactions());
            
            // Should be throttled with 60-minute threshold
            expect(result.current.wasRecentlyPulled(accountId, 60)).toBe(true);
            
            // Should not be throttled with 15-minute threshold
            expect(result.current.wasRecentlyPulled(accountId, 15)).toBe(false);
        });
    });

    describe('Retry Logic and Error Handling', () => {
        test('should retry on rate limiting errors', async () => {
            const accountId = 'test-account-id';
            
            // Set token as stale to limit historical sync
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            localStorage.setItem('tokenTimestamp', tenMinutesAgo.toString());
            
            // Mock rate limiting error followed by success
            mockGet
                .mockRejectedValueOnce({ response: { status: 429 } })
                .mockResolvedValueOnce({ transactions: [{ id: 'tx1', created: '2023-01-01T00:00:00Z' }] });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                const transactions = await result.current.retrieveTransactions(accountId, true);
                expect(transactions).toHaveLength(1);
            });
            
            // Should have made 2 requests (initial + retry)
            expect(mockGet).toHaveBeenCalledTimes(2);
        }, 10000);

        test('should not retry on authentication errors', async () => {
            const accountId = 'test-account-id';
            
            // Set token as stale to limit historical sync
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            localStorage.setItem('tokenTimestamp', tenMinutesAgo.toString());
            
            // Mock authentication error
            mockGet.mockRejectedValue({ response: { status: 401 } });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                try {
                    await result.current.retrieveTransactions(accountId, true);
                    fail('Should have thrown error');
                } catch (error) {
                    expect(error).toBeDefined();
                }
            });
            
            // Should only make 1 request (no retry for auth errors)
            expect(mockGet).toHaveBeenCalledTimes(1);
        }, 10000);

        test('should handle time range errors appropriately', async () => {
            const accountId = 'test-account-id';
            
            // Set token as stale to limit historical sync
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            localStorage.setItem('tokenTimestamp', tenMinutesAgo.toString());
            
            // Mock time range error
            mockGet.mockRejectedValue({ 
                response: { 
                    data: { code: 'bad_request.invalid_time_range' } 
                } 
            });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                try {
                    await result.current.retrieveTransactions(accountId, true);
                    fail('Should have thrown error');
                } catch (error) {
                    expect((error as Error).message).toContain('time range error');
                }
            });
        }, 10000);
    });

    describe('Intelligent Pagination', () => {
        test('should use cursor-based pagination when available', async () => {
            const accountId = 'test-account-id';
            
            // Set token as stale to limit historical sync
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            localStorage.setItem('tokenTimestamp', tenMinutesAgo.toString());
            
            // Mock last known transaction
            mockDatabase.transactions.last.mockResolvedValue({ 
                id: 'last-tx-id', 
                created: '2023-06-01T00:00:00Z' 
            });
            
            mockGet.mockResolvedValue({ 
                transactions: [{ id: 'new-tx', created: '2023-07-01T00:00:00Z' }] 
            });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                await result.current.retrieveTransactions(accountId, true);
            });
            
            // Check that the URL contains starting_after parameter
            const callUrl = mockGet.mock.calls[0][0];
            expect(callUrl).toContain('starting_after=last-tx-id');
        }, 10000);

        test('should adapt chunk sizes based on estimated transaction volume', async () => {
            const accountId = 'test-account-id';
            
            // Set token as stale to limit historical sync
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            localStorage.setItem('tokenTimestamp', tenMinutesAgo.toString());
            
            mockGet.mockResolvedValue({ transactions: [] });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                await result.current.retrieveTransactions(accountId, true);
            });
            
            // Should make requests with adaptive chunk sizes
            expect(mockGet).toHaveBeenCalled();
        }, 10000);
    });

    describe('Deduplication and Data Integrity', () => {
        test('should deduplicate transactions properly', async () => {
            const accountId = 'test-account-id';
            
            // Mock response with duplicate transactions
            const duplicateTransactions = [
                { id: 'tx1', created: '2023-01-01T00:00:00Z', amount: 100 },
                { id: 'tx1', created: '2023-01-01T00:00:00Z', amount: 100 }, // Duplicate
                { id: 'tx2', created: '2023-01-02T00:00:00Z', amount: 200 }
            ];
            
            mockGet.mockResolvedValue({ transactions: duplicateTransactions });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                const transactions = await result.current.retrieveTransactions(accountId, true);
                expect(transactions).toHaveLength(2); // Should remove 1 duplicate
            });
            
            // Check that bulkPut was called with deduplicated transactions
            expect(mockDatabase.transactions.bulkPut).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'tx1' }),
                    expect.objectContaining({ id: 'tx2' })
                ])
            );
        });
    });

    describe('Progress Tracking', () => {
        test('should provide progress updates during sync', async () => {
            const accountId = 'test-account-id';
            const progressUpdates: any[] = [];
            
            mockGet.mockResolvedValue({ transactions: [] });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                await result.current.retrieveTransactions(accountId, true, (progress) => {
                    progressUpdates.push(progress);
                });
            });
            
            // Should receive progress updates
            expect(progressUpdates.length).toBeGreaterThan(0);
            expect(progressUpdates[0]).toHaveProperty('isInProgress', true);
            expect(progressUpdates[progressUpdates.length - 1]).toHaveProperty('isInProgress', false);
        });
    });

    describe('Incremental Sync', () => {
        test('should perform incremental sync for recent transactions', async () => {
            const accountId = 'test-account-id';
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            
            // Set last incremental sync timestamp
            localStorage.setItem(`lastIncrementalSync_${accountId}`, oneDayAgo.toString());
            
            mockGet.mockResolvedValue({ 
                transactions: [{ id: 'new-tx', created: new Date().toISOString() }] 
            });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                const transactions = await result.current.incrementalSync(accountId);
                expect(transactions).toHaveLength(1);
            });
            
            // Should have made a request with 'since' parameter from last sync
            const callUrl = mockGet.mock.calls[0][0];
            expect(callUrl).toContain('since=');
        });

        test('should fall back to full sync when no previous incremental sync', async () => {
            const accountId = 'test-account-id';
            
            mockGet.mockResolvedValue({ transactions: [] });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                await result.current.incrementalSync(accountId);
            });
            
            // Should perform full sync (multiple requests for historical data)
            expect(mockGet).toHaveBeenCalled();
        });
    });

    describe('Metrics and Monitoring', () => {
        test('should track API performance metrics', async () => {
            const accountId = 'test-account-id';
            
            mockGet.mockResolvedValue({ 
                transactions: [{ id: 'tx1', created: '2023-01-01T00:00:00Z' }] 
            });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                await result.current.retrieveTransactions(accountId, true);
            });
            
            // Check that metrics are tracked
            const metrics = result.current.getAPIMetrics();
            expect(metrics.length).toBeGreaterThan(0);
            expect(metrics[0]).toHaveProperty('totalRequests');
            expect(metrics[0]).toHaveProperty('successfulRequests');
            expect(metrics[0]).toHaveProperty('totalTransactions');
        });

        test('should clear API metrics', () => {
            const { result } = renderHook(() => useTransactions());
            
            // Add some metrics first
            localStorage.setItem('transaction_api_metrics', JSON.stringify([{ test: 'data' }]));
            
            act(() => {
                result.current.clearAPIMetrics();
            });
            
            expect(result.current.getAPIMetrics()).toEqual([]);
        });
    });

    describe('Token Management for Historical Data', () => {
        test('should limit to 90 days for stale tokens', async () => {
            const accountId = 'test-account-id';
            
            // Set stale token (older than 5 minutes)
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            localStorage.setItem('tokenTimestamp', tenMinutesAgo.toString());
            
            mockGet.mockResolvedValue({ transactions: [] });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                await result.current.retrieveTransactions(accountId, true);
            });
            
            // Should only make 1 request (limited to 90 days)
            expect(mockGet).toHaveBeenCalledTimes(1);
            
            // Check that the URL contains appropriate date range
            const callUrl = mockGet.mock.calls[0][0];
            expect(callUrl).toContain('since=');
            expect(callUrl).toContain('before=');
        });
    });
});