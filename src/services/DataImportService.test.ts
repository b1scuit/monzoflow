import { DataImportService, ImportOptions } from './DataImportService';
import { ExportData } from './DataExportService';
import { MySubClassedDexie } from '../components/DatabaseContext/DatabaseContext';

// Mock export data for testing
const mockExportData: ExportData = {
    version: '1.0',
    exportDate: '2024-01-01T00:00:00.000Z',
    userData: {
        accounts: [
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
        ],
        transactions: [
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
        ],
        budgets: [
            { 
                id: '1', 
                name: 'Test Budget', 
                year: 2024, 
                categories: [],
                created: '2024-01-01T00:00:00.000Z',
                updated: '2024-01-01T00:00:00.000Z'
            }
        ],
        budgetCategories: [],
        debts: [],
        bills: [],
        debtPayments: [],
        billPayments: [],
        budgetTargets: [],
        creditorMatchingRules: [],
        debtTransactionMatches: [],
        debtPaymentHistory: [],
        userPreferences: [
            { id: '1', userId: 'default', monthlyCycleType: 'specific_date' as const, monthlyCycleDate: 1, created: '2024-01-01T00:00:00.000Z', updated: '2024-01-01T00:00:00.000Z' }
        ]
    },
    metadata: {
        totalRecords: 4,
        exportedBy: 'default',
        platform: 'MFLOW',
        databaseVersion: 4
    }
};

// Mock database methods
const mockDatabase = {
    transaction: jest.fn().mockImplementation((mode, tables, callback) => callback()),
    accounts: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    transactions: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    budgets: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    budgetCategories: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    budgetTargets: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    debts: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    bills: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    debtPayments: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    billPayments: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    creditorMatchingRules: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    debtTransactionMatches: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    debtPaymentHistory: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    },
    userPreferences: {
        add: jest.fn().mockResolvedValue(undefined),
        where: jest.fn().mockReturnValue({
            equals: jest.fn().mockReturnValue({
                first: jest.fn().mockResolvedValue(null),
                delete: jest.fn().mockResolvedValue(undefined),
                modify: jest.fn().mockResolvedValue(undefined)
            })
        })
    }
} as unknown as MySubClassedDexie;

describe('DataImportService', () => {
    let service: DataImportService;

    beforeEach(() => {
        service = new DataImportService(mockDatabase);
        jest.clearAllMocks();
    });

    describe('importData', () => {
        it('should successfully import valid data with merge strategy', async () => {
            const options: ImportOptions = {
                mergeStrategy: 'merge',
                validateData: true,
                skipInvalidRecords: true
            };

            const result = await service.importData(mockExportData, options);

            expect(result.success).toBe(true);
            expect(result.totalRecords).toBe(4);
            expect(result.importedRecords).toBe(4);
            expect(result.errorRecords).toBe(0);
            expect(result.errors).toEqual([]);
        });

        it('should validate export data and reject invalid versions', async () => {
            const invalidData = {
                ...mockExportData,
                version: '999.0'
            };

            const options: ImportOptions = {
                mergeStrategy: 'merge',
                validateData: true
            };

            const result = await service.importData(invalidData, options);

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Unsupported export version');
        });

        it('should handle replace merge strategy', async () => {
            const options: ImportOptions = {
                mergeStrategy: 'replace',
                validateData: true
            };

            const mockAccountsTable = mockDatabase.accounts as any;
            mockAccountsTable.where().equals().delete = jest.fn().mockResolvedValue(undefined);

            const result = await service.importData(mockExportData, options);

            expect(result.success).toBe(true);
            expect(mockAccountsTable.where().equals().delete).toHaveBeenCalled();
        });

        it('should handle skip_existing merge strategy', async () => {
            const options: ImportOptions = {
                mergeStrategy: 'skip_existing',
                validateData: true
            };

            // Mock existing record
            const mockAccountsTable = mockDatabase.accounts as any;
            mockAccountsTable.where().equals().first = jest.fn().mockResolvedValue({ id: '1' });

            const result = await service.importData(mockExportData, options);

            expect(result.success).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it('should exclude data types when specified', async () => {
            const options: ImportOptions = {
                mergeStrategy: 'merge',
                includeAccounts: false,
                includeTransactions: true,
                includeBudgets: false,
                includeDebts: false,
                includeBills: false,
                includeUserPreferences: false
            };

            const result = await service.importData(mockExportData, options);

            expect(result.success).toBe(true);
            expect(mockDatabase.accounts.add).not.toHaveBeenCalled();
            expect(mockDatabase.transactions.add).toHaveBeenCalled();
            expect(mockDatabase.budgets.add).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            const options: ImportOptions = {
                mergeStrategy: 'merge',
                validateData: true
            };

            mockDatabase.accounts.add = jest.fn().mockRejectedValue(new Error('Database error'));

            const result = await service.importData(mockExportData, options);

            expect(result.success).toBe(false);
            expect(result.errorRecords).toBeGreaterThan(0);
            expect(result.errors.some(error => error.includes('Database error'))).toBe(true);
        });

        it('should report progress during import', async () => {
            const progressCallback = jest.fn();
            service.setProgressCallback(progressCallback);

            const options: ImportOptions = {
                mergeStrategy: 'merge',
                validateData: true
            };

            await service.importData(mockExportData, options);

            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    stage: 'Starting import',
                    progress: 0,
                    total: 4
                })
            );

            expect(progressCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    stage: 'Import completed',
                    progress: 4,
                    total: 4
                })
            );
        });
    });

    describe('importFromFile', () => {
        it('should import from valid JSON file', async () => {
            const mockFile = new File([JSON.stringify(mockExportData)], 'export.json', {
                type: 'application/json'
            });

            const options: ImportOptions = {
                mergeStrategy: 'merge',
                validateData: true
            };

            const result = await service.importFromFile(mockFile, options);

            expect(result.success).toBe(true);
            expect(result.totalRecords).toBe(4);
        });

        it('should handle invalid JSON files', async () => {
            const mockFile = new File(['invalid json'], 'export.json', {
                type: 'application/json'
            });

            const options: ImportOptions = {
                mergeStrategy: 'merge',
                validateData: true
            };

            const result = await service.importFromFile(mockFile, options);

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Failed to parse import file');
        });
    });

    describe('validation', () => {
        it('should detect data integrity issues', async () => {
            const corruptedData = {
                ...mockExportData,
                metadata: {
                    ...mockExportData.metadata,
                    totalRecords: 999 // Wrong total
                }
            };

            const options: ImportOptions = {
                mergeStrategy: 'merge',
                validateData: true
            };

            const result = await service.importData(corruptedData, options);

            expect(result.success).toBe(false);
            expect(result.errors.some(error => error.includes('Data integrity check failed'))).toBe(true);
        });

        it('should handle missing required fields', async () => {
            const invalidData = {
                version: '1.0',
                exportDate: '2024-01-01T00:00:00.000Z'
                // Missing userData and metadata
            } as any;

            const options: ImportOptions = {
                mergeStrategy: 'merge',
                validateData: true
            };

            const result = await service.importData(invalidData, options);

            expect(result.success).toBe(false);
            expect(result.errors.some(error => error.includes('missing metadata or userData'))).toBe(true);
        });
    });
});