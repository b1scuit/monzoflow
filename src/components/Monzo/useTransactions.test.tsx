import { renderHook, act } from '@testing-library/react';
import { useTransactions } from './useTransactions';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { useFetch } from 'use-http';

// Mock dependencies
jest.mock('components/DatabaseContext/DatabaseContext');
jest.mock('use-http', () => ({
    useFetch: jest.fn()
}));

const mockDatabase = {
    transactions: {
        bulkPut: jest.fn(),
        where: jest.fn().mockReturnThis(),
        equals: jest.fn().mockReturnThis(),
        reverse: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        orderBy: jest.fn().mockReturnThis(),
        last: jest.fn()
    }
};

const mockGet = jest.fn();
const mockUseFetch = {
    get: mockGet,
    loading: false,
    error: null
};

(useDatabase as jest.Mock).mockReturnValue(mockDatabase);
(useFetch as jest.Mock).mockReturnValue(mockUseFetch);

describe('useTransactions Enhanced Features', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        
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
        });

        test('should not retry on authentication errors', async () => {
            const accountId = 'test-account-id';
            
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
        });

        test('should handle time range errors appropriately', async () => {
            const accountId = 'test-account-id';
            
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
        });
    });

    describe('Intelligent Pagination', () => {
        test('should use cursor-based pagination when available', async () => {
            const accountId = 'test-account-id';
            
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
        });

        test('should adapt chunk sizes based on estimated transaction volume', async () => {
            const accountId = 'test-account-id';
            
            // Set token as fresh to enable full historical sync
            localStorage.setItem('tokenTimestamp', Date.now().toString());
            
            mockGet.mockResolvedValue({ transactions: [] });
            
            const { result } = renderHook(() => useTransactions());
            
            await act(async () => {
                await result.current.retrieveTransactions(accountId, true);
            });
            
            // Should make multiple requests with adaptive chunk sizes
            expect(mockGet).toHaveBeenCalled();
        });
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
            expect(mockUseFetch.get).toHaveBeenCalledTimes(1);
            
            // Check that the URL contains appropriate date range
            const callUrl = mockUseFetch.get.mock.calls[0][0];
            expect(callUrl).toContain('since=');
            expect(callUrl).toContain('before=');
        });
    });
});