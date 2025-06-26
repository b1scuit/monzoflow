import { MySubClassedDexie } from '../components/DatabaseContext/DatabaseContext';
import { ExportData } from './DataExportService';

export interface ImportOptions {
    mergeStrategy: 'replace' | 'merge' | 'skip_existing';
    validateData?: boolean;
    skipInvalidRecords?: boolean;
    includeAccounts?: boolean;
    includeTransactions?: boolean;
    includeBudgets?: boolean;
    includeDebts?: boolean;
    includeBills?: boolean;
    includeUserPreferences?: boolean;
}

export interface ImportResult {
    success: boolean;
    totalRecords: number;
    importedRecords: number;
    skippedRecords: number;
    errorRecords: number;
    errors: string[];
    warnings: string[];
}

export interface ImportProgress {
    stage: string;
    progress: number;
    total: number;
    currentItem?: string;
}

export class DataImportService {
    private db: MySubClassedDexie;
    private readonly SUPPORTED_VERSIONS = ['1.0'];
    private onProgress?: (progress: ImportProgress) => void;

    constructor(database: MySubClassedDexie) {
        this.db = database;
    }

    setProgressCallback(callback: (progress: ImportProgress) => void): void {
        this.onProgress = callback;
    }

    async importData(data: ExportData, options: ImportOptions): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            totalRecords: 0,
            importedRecords: 0,
            skippedRecords: 0,
            errorRecords: 0,
            errors: [],
            warnings: []
        };

        try {
            // Validate export data format
            const validationResult = await this.validateExportData(data);
            if (!validationResult.isValid) {
                result.errors.push(...validationResult.errors);
                return result;
            }

            result.totalRecords = data.metadata.totalRecords;

            this.reportProgress({
                stage: 'Starting import',
                progress: 0,
                total: result.totalRecords
            });

            // Begin transaction for atomic import
            await this.db.transaction('rw', [
                this.db.accounts,
                this.db.transactions,
                this.db.budgets,
                this.db.budgetCategories,
                this.db.debts,
                this.db.bills,
                this.db.debtPayments,
                this.db.billPayments,
                this.db.budgetTargets,
                this.db.creditorMatchingRules,
                this.db.debtTransactionMatches,
                this.db.debtPaymentHistory,
                this.db.userPreferences
            ], async () => {
                    let importedCount = 0;

                    // Import in dependency order
                    if (options.includeUserPreferences !== false && data.userData.userPreferences.length > 0) {
                        const imported = await this.importUserPreferences(data.userData.userPreferences, options);
                        importedCount += imported.imported;
                        result.errors.push(...imported.errors);
                        result.warnings.push(...imported.warnings);
                    }

                    if (options.includeAccounts !== false && data.userData.accounts.length > 0) {
                        const imported = await this.importAccounts(data.userData.accounts, options);
                        importedCount += imported.imported;
                        result.errors.push(...imported.errors);
                        result.warnings.push(...imported.warnings);
                    }

                    if (options.includeTransactions !== false && data.userData.transactions.length > 0) {
                        const imported = await this.importTransactions(data.userData.transactions, options);
                        importedCount += imported.imported;
                        result.errors.push(...imported.errors);
                        result.warnings.push(...imported.warnings);
                    }

                    if (options.includeBudgets !== false) {
                        if (data.userData.budgets.length > 0) {
                            const imported = await this.importBudgets(data.userData.budgets, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }

                        if (data.userData.budgetCategories.length > 0) {
                            const imported = await this.importBudgetCategories(data.userData.budgetCategories, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }

                        if (data.userData.budgetTargets.length > 0) {
                            const imported = await this.importBudgetTargets(data.userData.budgetTargets, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }
                    }

                    if (options.includeDebts !== false) {
                        if (data.userData.debts.length > 0) {
                            const imported = await this.importDebts(data.userData.debts, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }

                        if (data.userData.debtPayments.length > 0) {
                            const imported = await this.importDebtPayments(data.userData.debtPayments, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }

                        if (data.userData.creditorMatchingRules.length > 0) {
                            const imported = await this.importCreditorMatchingRules(data.userData.creditorMatchingRules, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }

                        if (data.userData.debtTransactionMatches.length > 0) {
                            const imported = await this.importDebtTransactionMatches(data.userData.debtTransactionMatches, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }

                        if (data.userData.debtPaymentHistory.length > 0) {
                            const imported = await this.importDebtPaymentHistory(data.userData.debtPaymentHistory, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }
                    }

                    if (options.includeBills !== false) {
                        if (data.userData.bills.length > 0) {
                            const imported = await this.importBills(data.userData.bills, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }

                        if (data.userData.billPayments.length > 0) {
                            const imported = await this.importBillPayments(data.userData.billPayments, options);
                            importedCount += imported.imported;
                            result.errors.push(...imported.errors);
                            result.warnings.push(...imported.warnings);
                        }
                    }

                    result.importedRecords = importedCount;
                    result.errorRecords = result.errors.length;
                    result.skippedRecords = result.totalRecords - importedCount - result.errorRecords;
                }
            );

            result.success = result.errorRecords === 0;

            this.reportProgress({
                stage: 'Import completed',
                progress: result.totalRecords,
                total: result.totalRecords
            });

            return result;
        } catch (error) {
            console.error('Error during import:', error);
            result.errors.push('Import failed: ' + (error as Error).message);
            return result;
        }
    }

    private async validateExportData(data: ExportData): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        // Check version compatibility
        if (!this.SUPPORTED_VERSIONS.includes(data.version)) {
            errors.push(`Unsupported export version: ${data.version}. Supported versions: ${this.SUPPORTED_VERSIONS.join(', ')}`);
        }

        // Check required fields
        if (!data.metadata || !data.userData) {
            errors.push('Invalid export format: missing metadata or userData');
        }

        // Check data integrity
        if (data.metadata && data.metadata.totalRecords !== this.calculateTotalRecords(data.userData)) {
            errors.push('Data integrity check failed: record count mismatch');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private calculateTotalRecords(userData: ExportData['userData']): number {
        return Object.values(userData).reduce((total, data) => total + (data?.length || 0), 0);
    }

    private async importTableData<T extends { id?: any }>(
        tableName: string,
        data: T[],
        options: ImportOptions,
        idField: keyof T = 'id' as keyof T
    ): Promise<{ imported: number; errors: string[]; warnings: string[] }> {
        const result = { imported: 0, errors: [] as string[], warnings: [] as string[] };
        const table = (this.db as any)[tableName];

        for (const item of data) {
            try {
                if (options.mergeStrategy === 'replace') {
                    // Delete existing record if it exists
                    if (item[idField]) {
                        await table.where(idField).equals(item[idField]).delete();
                    }
                    await table.add(item);
                    result.imported++;
                } else if (options.mergeStrategy === 'merge') {
                    // Update if exists, add if not
                    if (item[idField]) {
                        const existing = await table.where(idField).equals(item[idField]).first();
                        if (existing) {
                            await table.where(idField).equals(item[idField]).modify(item);
                        } else {
                            await table.add(item);
                        }
                    } else {
                        await table.add(item);
                    }
                    result.imported++;
                } else if (options.mergeStrategy === 'skip_existing') {
                    // Only add if doesn't exist
                    if (item[idField]) {
                        const existing = await table.where(idField).equals(item[idField]).first();
                        if (!existing) {
                            await table.add(item);
                            result.imported++;
                        } else {
                            result.warnings.push(`Skipped existing record: ${tableName} ${String(item[idField])}`);
                        }
                    } else {
                        await table.add(item);
                        result.imported++;
                    }
                }
            } catch (error) {
                result.errors.push(`Failed to import ${tableName} record: ${(error as Error).message}`);
            }
        }

        return result;
    }

    private async importUserPreferences(data: any[], options: ImportOptions) {
        return this.importTableData('userPreferences', data, options);
    }

    private async importAccounts(data: any[], options: ImportOptions) {
        return this.importTableData('accounts', data, options);
    }

    private async importTransactions(data: any[], options: ImportOptions) {
        return this.importTableData('transactions', data, options);
    }

    private async importBudgets(data: any[], options: ImportOptions) {
        return this.importTableData('budgets', data, options);
    }

    private async importBudgetCategories(data: any[], options: ImportOptions) {
        return this.importTableData('budgetCategories', data, options);
    }

    private async importBudgetTargets(data: any[], options: ImportOptions) {
        return this.importTableData('budgetTargets', data, options);
    }

    private async importDebts(data: any[], options: ImportOptions) {
        return this.importTableData('debts', data, options);
    }

    private async importDebtPayments(data: any[], options: ImportOptions) {
        return this.importTableData('debtPayments', data, options);
    }

    private async importCreditorMatchingRules(data: any[], options: ImportOptions) {
        return this.importTableData('creditorMatchingRules', data, options);
    }

    private async importDebtTransactionMatches(data: any[], options: ImportOptions) {
        return this.importTableData('debtTransactionMatches', data, options);
    }

    private async importDebtPaymentHistory(data: any[], options: ImportOptions) {
        return this.importTableData('debtPaymentHistory', data, options);
    }

    private async importBills(data: any[], options: ImportOptions) {
        return this.importTableData('bills', data, options);
    }

    private async importBillPayments(data: any[], options: ImportOptions) {
        return this.importTableData('billPayments', data, options);
    }

    private reportProgress(progress: ImportProgress): void {
        if (this.onProgress) {
            this.onProgress(progress);
        }
    }

    async importFromFile(file: File, options: ImportOptions): Promise<ImportResult> {
        try {
            const text = await file.text();
            const data: ExportData = JSON.parse(text);
            return await this.importData(data, options);
        } catch (error) {
            return {
                success: false,
                totalRecords: 0,
                importedRecords: 0,
                skippedRecords: 0,
                errorRecords: 1,
                errors: ['Failed to parse import file: ' + (error as Error).message],
                warnings: []
            };
        }
    }
}