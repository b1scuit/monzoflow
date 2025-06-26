import { MySubClassedDexie } from '../components/DatabaseContext/DatabaseContext';
import { Account } from '../types/Account';
import { Transaction } from '../types/Transactions';
import { Budget, BudgetCategory, Debt, Bill, DebtPayment, BillPayment, BudgetTarget, CreditorMatchingRule, DebtTransactionMatch, DebtPaymentHistory } from '../types/Budget';
import { UserPreferences } from '../types/UserPreferences';

export interface ExportOptions {
    includeAccounts?: boolean;
    includeTransactions?: boolean;
    includeBudgets?: boolean;
    includeDebts?: boolean;
    includeBills?: boolean;
    includeUserPreferences?: boolean;
    dateRange?: {
        startDate: Date;
        endDate: Date;
    };
    excludeSensitiveData?: boolean;
}

export interface ExportData {
    version: string;
    exportDate: string;
    userData: {
        accounts: Account[];
        transactions: Transaction[];
        budgets: Budget[];
        budgetCategories: BudgetCategory[];
        debts: Debt[];
        bills: Bill[];
        debtPayments: DebtPayment[];
        billPayments: BillPayment[];
        budgetTargets: BudgetTarget[];
        creditorMatchingRules: CreditorMatchingRule[];
        debtTransactionMatches: DebtTransactionMatch[];
        debtPaymentHistory: DebtPaymentHistory[];
        userPreferences: UserPreferences[];
    };
    metadata: {
        totalRecords: number;
        exportedBy: string;
        platform: string;
        databaseVersion: number;
    };
}

export class DataExportService {
    private db: MySubClassedDexie;
    private readonly EXPORT_VERSION = '1.0';
    private readonly PLATFORM_NAME = 'MFLOW';

    constructor(database: MySubClassedDexie) {
        this.db = database;
    }

    async exportData(options: ExportOptions = {}): Promise<ExportData> {
        try {
            const exportData: ExportData = {
                version: this.EXPORT_VERSION,
                exportDate: new Date().toISOString(),
                userData: {
                    accounts: [],
                    transactions: [],
                    budgets: [],
                    budgetCategories: [],
                    debts: [],
                    bills: [],
                    debtPayments: [],
                    billPayments: [],
                    budgetTargets: [],
                    creditorMatchingRules: [],
                    debtTransactionMatches: [],
                    debtPaymentHistory: [],
                    userPreferences: []
                },
                metadata: {
                    totalRecords: 0,
                    exportedBy: 'default', // Single user system
                    platform: this.PLATFORM_NAME,
                    databaseVersion: this.db.verno
                }
            };

            // Export accounts
            if (options.includeAccounts !== false) {
                exportData.userData.accounts = await this.exportAccounts(options);
            }

            // Export transactions
            if (options.includeTransactions !== false) {
                exportData.userData.transactions = await this.exportTransactions(options);
            }

            // Export budgets and related data
            if (options.includeBudgets !== false) {
                exportData.userData.budgets = await this.exportBudgets();
                exportData.userData.budgetCategories = await this.exportBudgetCategories();
                exportData.userData.budgetTargets = await this.exportBudgetTargets();
            }

            // Export debts and related data
            if (options.includeDebts !== false) {
                exportData.userData.debts = await this.exportDebts();
                exportData.userData.debtPayments = await this.exportDebtPayments();
                exportData.userData.creditorMatchingRules = await this.exportCreditorMatchingRules();
                exportData.userData.debtTransactionMatches = await this.exportDebtTransactionMatches();
                exportData.userData.debtPaymentHistory = await this.exportDebtPaymentHistory();
            }

            // Export bills and related data
            if (options.includeBills !== false) {
                exportData.userData.bills = await this.exportBills();
                exportData.userData.billPayments = await this.exportBillPayments();
            }

            // Export user preferences
            if (options.includeUserPreferences !== false) {
                exportData.userData.userPreferences = await this.exportUserPreferences();
            }

            // Calculate total records
            exportData.metadata.totalRecords = this.calculateTotalRecords(exportData.userData);

            return exportData;
        } catch (error) {
            console.error('Error exporting data:', error);
            throw new Error('Failed to export data: ' + (error as Error).message);
        }
    }

    private async exportAccounts(options: ExportOptions): Promise<Account[]> {
        const accounts = await this.db.accounts.toArray();
        
        if (options.excludeSensitiveData) {
            return accounts.map(account => ({
                ...account,
                account_number: '****' + account.account_number?.slice(-4) || '****',
                sort_code: '**-**-**'
            }));
        }
        
        return accounts;
    }

    private async exportTransactions(options: ExportOptions): Promise<Transaction[]> {
        let query = this.db.transactions.orderBy('created');
        
        if (options.dateRange) {
            const startDate = options.dateRange.startDate.toISOString();
            const endDate = options.dateRange.endDate.toISOString();
            query = query.filter(transaction => 
                transaction.created >= startDate && transaction.created <= endDate
            );
        }
        
        const transactions = await query.toArray();
        
        return transactions;
    }

    private async exportBudgets(): Promise<Budget[]> {
        return await this.db.budgets.toArray();
    }

    private async exportBudgetCategories(): Promise<BudgetCategory[]> {
        return await this.db.budgetCategories.toArray();
    }

    private async exportBudgetTargets(): Promise<BudgetTarget[]> {
        return await this.db.budgetTargets.toArray();
    }

    private async exportDebts(): Promise<Debt[]> {
        return await this.db.debts.toArray();
    }

    private async exportDebtPayments(): Promise<DebtPayment[]> {
        return await this.db.debtPayments.toArray();
    }

    private async exportCreditorMatchingRules(): Promise<CreditorMatchingRule[]> {
        return await this.db.creditorMatchingRules.toArray();
    }

    private async exportDebtTransactionMatches(): Promise<DebtTransactionMatch[]> {
        return await this.db.debtTransactionMatches.toArray();
    }

    private async exportDebtPaymentHistory(): Promise<DebtPaymentHistory[]> {
        return await this.db.debtPaymentHistory.toArray();
    }

    private async exportBills(): Promise<Bill[]> {
        return await this.db.bills.toArray();
    }

    private async exportBillPayments(): Promise<BillPayment[]> {
        return await this.db.billPayments.toArray();
    }

    private async exportUserPreferences(): Promise<UserPreferences[]> {
        return await this.db.userPreferences.toArray();
    }

    private calculateTotalRecords(userData: ExportData['userData']): number {
        return Object.values(userData).reduce((total, data) => total + data.length, 0);
    }

    async exportToJson(options: ExportOptions = {}): Promise<string> {
        const data = await this.exportData(options);
        return JSON.stringify(data, null, 2);
    }

    async exportToCsv(tableName: keyof ExportData['userData'], options: ExportOptions = {}): Promise<string> {
        const data = await this.exportData(options);
        const tableData = data.userData[tableName];
        
        if (!tableData || tableData.length === 0) {
            return '';
        }

        // Get headers from first object
        const headers = Object.keys(tableData[0]);
        const csvRows = [headers.join(',')];

        // Convert each row to CSV
        for (const row of tableData) {
            const values = headers.map(header => {
                const value = (row as any)[header];
                const stringValue = value === null || value === undefined ? '' : String(value);
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
                    ? '"' + stringValue.replace(/"/g, '""') + '"'
                    : stringValue;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    async downloadExport(format: 'json' | 'csv', options: ExportOptions = {}, tableName?: keyof ExportData['userData']): Promise<void> {
        try {
            let content: string;
            let filename: string;
            let mimeType: string;

            if (format === 'json') {
                content = await this.exportToJson(options);
                filename = `mflow-export-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
            } else if (format === 'csv' && tableName) {
                content = await this.exportToCsv(tableName, options);
                filename = `mflow-${tableName}-export-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
            } else {
                throw new Error('Invalid export format or missing table name for CSV export');
            }

            // Create blob and download
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading export:', error);
            throw new Error('Failed to download export: ' + (error as Error).message);
        }
    }
}