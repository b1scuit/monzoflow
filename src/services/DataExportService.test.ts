import { DataExportService, ExportOptions } from './DataExportService';
import { MySubClassedDexie } from '../components/DatabaseContext/DatabaseContext';

// Mock sample data
const mockAccounts = [
    { 
        id: '1', 
        closed: false, 
        created: '2024-01-01T00:00:00.000Z', 
        description: 'Test Account', 
        type: 'uk_retail', 
        currency: 'GBP', 
        country_code: 'GB', 
        owners: [], 
        account_number: '12345678', 
        sort_code: '12-34-56' 
    }
];

const mockTransactions = [
    { 
        id: '1', 
        account_id: 'acc_1', 
        amount: -1000, 
        amount_is_pending: false,
        can_add_to_tab: false,
        can_be_excluded_from_breakdown: false,
        can_be_made_subscription: false,
        can_match_transactions_in_categorization: false,
        can_split_the_bill: false,
        categories: {},
        category: 'general',
        created: '2024-01-01T00:00:00.000Z', 
        currency: 'GBP',
        dedupe_id: 'dedupe_1',
        description: 'Test transaction',
        fees: {},
        include_in_spending: true,
        is_load: false,
        local_amount: -1000,
        local_currency: 'GBP',
        merchant_feedback_uri: '',
        metadata: { suggested_tags: '', website: '' },
        notes: '',
        originator: false,
        parent_account_id: '',
        scheme: 'faster_payments',
        settled: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z',
        user_id: 'user_1'
    },
    { 
        id: '2', 
        account_id: 'acc_1', 
        amount: -2000, 
        amount_is_pending: false,
        can_add_to_tab: false,
        can_be_excluded_from_breakdown: false,
        can_be_made_subscription: false,
        can_match_transactions_in_categorization: false,
        can_split_the_bill: false,
        categories: {},
        category: 'general',
        created: '2024-01-02T00:00:00.000Z', 
        currency: 'GBP',
        dedupe_id: 'dedupe_2',
        description: 'Another transaction',
        fees: {},
        include_in_spending: true,
        is_load: false,
        local_amount: -2000,
        local_currency: 'GBP',
        merchant_feedback_uri: '',
        metadata: { suggested_tags: '', website: '' },
        notes: '',
        originator: false,
        parent_account_id: '',
        scheme: 'faster_payments',
        settled: '2024-01-02T00:00:00.000Z',
        updated: '2024-01-02T00:00:00.000Z',
        user_id: 'user_1'
    }
];

const mockBudgets = [
    { 
        id: '1', 
        name: 'Test Budget', 
        year: 2024, 
        categories: [],
        created: '2024-01-01T00:00:00.000Z',
        updated: '2024-01-01T00:00:00.000Z'
    }
];

const mockUserPreferences = [
    { id: '1', userId: 'default', monthlyCycleType: 'specific_date' as const, monthlyCycleDate: 1, created: '2024-01-01T00:00:00.000Z', updated: '2024-01-01T00:00:00.000Z' }
];

// Create proper mock functions
const createMockQuery = (data: any[]) => ({
    filter: jest.fn().mockImplementation((filterFn) => ({
        toArray: jest.fn().mockResolvedValue(data.filter(filterFn))
    })),
    toArray: jest.fn().mockResolvedValue(data)
});

// Function to create a fresh mock database
const createMockDatabase = () => ({
    verno: 4,
    accounts: {
        toArray: jest.fn().mockResolvedValue(mockAccounts)
    },
    transactions: {
        orderBy: jest.fn().mockImplementation(() => createMockQuery(mockTransactions)),
        toArray: jest.fn().mockResolvedValue(mockTransactions)
    },
    budgets: {
        toArray: jest.fn().mockResolvedValue(mockBudgets)
    },
    budgetCategories: {
        toArray: jest.fn().mockResolvedValue([])
    },
    budgetTargets: {
        toArray: jest.fn().mockResolvedValue([])
    },
    debts: {
        toArray: jest.fn().mockResolvedValue([])
    },
    bills: {
        toArray: jest.fn().mockResolvedValue([])
    },
    debtPayments: {
        toArray: jest.fn().mockResolvedValue([])
    },
    billPayments: {
        toArray: jest.fn().mockResolvedValue([])
    },
    creditorMatchingRules: {
        toArray: jest.fn().mockResolvedValue([])
    },
    debtTransactionMatches: {
        toArray: jest.fn().mockResolvedValue([])
    },
    debtPaymentHistory: {
        toArray: jest.fn().mockResolvedValue([])
    },
    userPreferences: {
        toArray: jest.fn().mockResolvedValue(mockUserPreferences)
    }
} as unknown as MySubClassedDexie);

// Mock database
let mockDatabase = createMockDatabase();

// Mock DOM methods
Object.defineProperty(global, 'URL', {
    value: {
        createObjectURL: jest.fn(() => 'mock-url'),
        revokeObjectURL: jest.fn()
    }
});

Object.defineProperty(global.document, 'createElement', {
    value: jest.fn(() => ({
        href: '',
        download: '',
        click: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn()
    }))
});

Object.defineProperty(global.document, 'body', {
    value: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    }
});

describe('DataExportService', () => {
    let service: DataExportService;

    beforeEach(() => {
        mockDatabase = createMockDatabase();
        service = new DataExportService(mockDatabase);
    });


    describe('exportData', () => {
        it('should export all data with default options', async () => {
            const result = await service.exportData();
            
            expect(result.version).toBe('1.0');
            expect(result.metadata.platform).toBe('MFLOW');
            expect(result.metadata.databaseVersion).toBe(4);
            expect(result.userData.accounts).toEqual(mockAccounts);
            expect(result.userData.transactions).toEqual(mockTransactions);
            expect(result.userData.budgets).toEqual(mockBudgets);
            expect(result.userData.userPreferences).toEqual(mockUserPreferences);
        });

        it('should exclude sensitive data when requested', async () => {
            const options: ExportOptions = {
                excludeSensitiveData: true
            };
            
            const result = await service.exportData(options);
            
            expect(result.userData.accounts[0].account_number).toBe('****5678');
            expect(result.userData.accounts[0].sort_code).toBe('**-**-**');
        });

        it('should exclude specific data types when requested', async () => {
            const options: ExportOptions = {
                includeAccounts: false,
                includeTransactions: false,
                includeBudgets: true
            };
            
            const result = await service.exportData(options);
            
            expect(result.userData.accounts).toEqual([]);
            expect(result.userData.transactions).toEqual([]);
            expect(result.userData.budgets).toEqual(mockBudgets);
        });

        it('should filter transactions by date range', async () => {
            const options: ExportOptions = {
                dateRange: {
                    startDate: new Date('2024-01-01'),
                    endDate: new Date('2024-01-01')
                }
            };
            
            const result = await service.exportData(options);
            
            // Verify that orderBy was called (which enables date filtering)
            expect(mockDatabase.transactions.orderBy).toHaveBeenCalled();
            // Verify we get filtered results (only one transaction matches the date range)
            expect(result.userData.transactions.length).toBe(1);
            expect(result.userData.transactions[0].created).toBe('2024-01-01T00:00:00.000Z');
        });
    });

    describe('exportToJson', () => {
        it('should return valid JSON string', async () => {
            const result = await service.exportToJson();
            
            expect(() => JSON.parse(result)).not.toThrow();
            
            const parsed = JSON.parse(result);
            expect(parsed.version).toBe('1.0');
            expect(parsed.userData).toBeDefined();
            expect(parsed.metadata).toBeDefined();
        });
    });

    describe('exportToCsv', () => {
        it('should export transactions to CSV format', async () => {
            const result = await service.exportToCsv('transactions');
            
            // Check for the key columns we expect in the CSV
            expect(result).toContain('id,account_id,amount,');
            expect(result).toContain('created,');
            expect(result).toContain('description,');
            // Check for actual data rows
            expect(result).toContain('1,acc_1,-1000,');
            expect(result).toContain('Test transaction');
            expect(result).toContain('2,acc_1,-2000,');
            expect(result).toContain('Another transaction');
        });

        it('should handle empty data', async () => {
            // Create a new mock database with empty transactions
            const emptyMockDatabase = createMockDatabase();
            emptyMockDatabase.transactions.orderBy = jest.fn().mockImplementation(() => createMockQuery([]));
            const emptyService = new DataExportService(emptyMockDatabase);
            
            const result = await emptyService.exportToCsv('transactions');
            
            expect(result).toBe('');
        });

        it('should escape CSV special characters', async () => {
            const mockTransactionsWithSpecialChars = [
                { 
                    id: '1', 
                    account_id: 'acc_1', 
                    amount: -1000, 
                    amount_is_pending: false,
                    can_add_to_tab: false,
                    can_be_excluded_from_breakdown: false,
                    can_be_made_subscription: false,
                    can_match_transactions_in_categorization: false,
                    can_split_the_bill: false,
                    categories: {},
                    category: 'general',
                    created: '2024-01-01T00:00:00.000Z', 
                    currency: 'GBP',
                    dedupe_id: 'dedupe_1',
                    description: 'Transaction, with comma',
                    fees: {},
                    include_in_spending: true,
                    is_load: false,
                    local_amount: -1000,
                    local_currency: 'GBP',
                    merchant_feedback_uri: '',
                    metadata: { suggested_tags: '', website: '' },
                    notes: '',
                    originator: false,
                    parent_account_id: '',
                    scheme: 'faster_payments',
                    settled: '2024-01-01T00:00:00.000Z',
                    updated: '2024-01-01T00:00:00.000Z',
                    user_id: 'user_1'
                },
                { 
                    id: '2', 
                    account_id: 'acc_1', 
                    amount: -2000, 
                    amount_is_pending: false,
                    can_add_to_tab: false,
                    can_be_excluded_from_breakdown: false,
                    can_be_made_subscription: false,
                    can_match_transactions_in_categorization: false,
                    can_split_the_bill: false,
                    categories: {},
                    category: 'general',
                    created: '2024-01-02T00:00:00.000Z', 
                    currency: 'GBP',
                    dedupe_id: 'dedupe_2',
                    description: 'Transaction "with quotes"',
                    fees: {},
                    include_in_spending: true,
                    is_load: false,
                    local_amount: -2000,
                    local_currency: 'GBP',
                    merchant_feedback_uri: '',
                    metadata: { suggested_tags: '', website: '' },
                    notes: '',
                    originator: false,
                    parent_account_id: '',
                    scheme: 'faster_payments',
                    settled: '2024-01-02T00:00:00.000Z',
                    updated: '2024-01-02T00:00:00.000Z',
                    user_id: 'user_1'
                }
            ];
            
            // Create a new mock database with special character transactions
            const specialCharMockDatabase = createMockDatabase();
            specialCharMockDatabase.transactions.orderBy = jest.fn().mockImplementation(() => createMockQuery(mockTransactionsWithSpecialChars));
            const specialCharService = new DataExportService(specialCharMockDatabase);
            
            const result = await specialCharService.exportToCsv('transactions');
            
            expect(result).toContain('"Transaction, with comma"');
            expect(result).toContain('"Transaction ""with quotes"""');
        });
    });

    describe('downloadExport', () => {
        it('should trigger JSON download', async () => {
            const createElementSpy = jest.spyOn(document, 'createElement');
            const mockLink = {
                href: '',
                download: '',
                click: jest.fn()
            };
            createElementSpy.mockReturnValue(mockLink as any);

            await service.downloadExport('json');

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(mockLink.click).toHaveBeenCalled();
            expect(mockLink.download).toMatch(/mflow-export-\d{4}-\d{2}-\d{2}\.json/);
        });

        it('should trigger CSV download', async () => {
            const createElementSpy = jest.spyOn(document, 'createElement');
            const mockLink = {
                href: '',
                download: '',
                click: jest.fn()
            };
            createElementSpy.mockReturnValue(mockLink as any);

            await service.downloadExport('csv', {}, 'transactions');

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(mockLink.click).toHaveBeenCalled();
            expect(mockLink.download).toMatch(/mflow-transactions-export-\d{4}-\d{2}-\d{2}\.csv/);
        });

        it('should throw error for CSV without table name', async () => {
            await expect(service.downloadExport('csv')).rejects.toThrow(
                'Invalid export format or missing table name for CSV export'
            );
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            mockDatabase.accounts.toArray = jest.fn().mockRejectedValue(new Error('Database error'));
            
            await expect(service.exportData()).rejects.toThrow('Failed to export data: Database error');
        });
    });
});