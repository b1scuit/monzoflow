import { FC, useState, useRef } from 'react';
import { useDatabase } from '../DatabaseContext/DatabaseContext';
import { DataExportService, ExportOptions } from '../../services/DataExportService';
import { DataImportService, ImportOptions, ImportResult, ImportProgress } from '../../services/DataImportService';

interface Props {
    className?: string;
}

const DataExportImport: FC<Props> = ({ className = '' }) => {
    const db = useDatabase();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Export state
    const [isExporting, setIsExporting] = useState(false);
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        includeAccounts: true,
        includeTransactions: true,
        includeBudgets: true,
        includeDebts: true,
        includeBills: true,
        includeUserPreferences: true,
        excludeSensitiveData: false
    });
    const [showExportOptions, setShowExportOptions] = useState(false);
    
    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [importOptions, setImportOptions] = useState<ImportOptions>({
        mergeStrategy: 'merge',
        validateData: true,
        skipInvalidRecords: true,
        includeAccounts: true,
        includeTransactions: true,
        includeBudgets: true,
        includeDebts: true,
        includeBills: true,
        includeUserPreferences: true
    });

    const handleExport = async (format: 'json' | 'csv') => {
        if (isExporting) return;
        
        setIsExporting(true);
        try {
            const exportService = new DataExportService(db);
            
            if (format === 'json') {
                await exportService.downloadExport('json', exportOptions);
            } else {
                // For CSV, export transactions by default
                await exportService.downloadExport('csv', exportOptions, 'transactions');
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            alert('Please select a JSON file exported from MFLOW.');
            return;
        }
        
        handleImport(file);
    };

    const handleImport = async (file: File) => {
        if (isImporting) return;
        
        setIsImporting(true);
        setImportProgress(null);
        setImportResult(null);
        
        try {
            const importService = new DataImportService(db);
            importService.setProgressCallback(setImportProgress);
            
            const result = await importService.importFromFile(file, importOptions);
            setImportResult(result);
            
            if (result.success) {
                alert(`Import completed successfully! Imported ${result.importedRecords} records.`);
            } else {
                alert(`Import completed with errors. ${result.importedRecords} records imported, ${result.errorRecords} errors.`);
            }
        } catch (error) {
            console.error('Import failed:', error);
            alert('Import failed: ' + (error as Error).message);
        } finally {
            setIsImporting(false);
            setImportProgress(null);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📦</span>
                Data Export & Import
            </h2>
            
            <div className="space-y-6">
                {/* Export Section */}
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h3 className="font-medium text-gray-900 mb-3">Export Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Export your data for backup, analysis, or migration. Choose between complete JSON export or CSV transaction export.
                    </p>
                    
                    <div className="flex flex-wrap gap-3 mb-4">
                        <button
                            onClick={() => handleExport('json')}
                            disabled={isExporting}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                        >
                            {isExporting ? 'Exporting...' : 'Export JSON (Complete)'}
                        </button>
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={isExporting}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                        >
                            {isExporting ? 'Exporting...' : 'Export CSV (Transactions)'}
                        </button>
                        <button
                            onClick={() => setShowExportOptions(!showExportOptions)}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                            Options
                        </button>
                    </div>

                    {/* Export Options */}
                    {showExportOptions && (
                        <div className="bg-white rounded border p-4 space-y-3">
                            <h4 className="font-medium text-gray-900">Export Options</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeAccounts}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeAccounts: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm">Include Accounts</span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeTransactions}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeTransactions: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm">Include Transactions</span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeBudgets}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeBudgets: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm">Include Budgets</span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeDebts}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeDebts: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm">Include Debts</span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeBills}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeBills: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm">Include Bills</span>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.includeUserPreferences}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeUserPreferences: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm">Include Settings</span>
                                </label>
                                
                                <label className="flex items-center col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={exportOptions.excludeSensitiveData}
                                        onChange={(e) => setExportOptions(prev => ({ ...prev, excludeSensitiveData: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm">Exclude sensitive data (account numbers)</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Import Section */}
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <h3 className="font-medium text-gray-900 mb-3">Import Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Import data from a previously exported JSON file. You can merge with existing data or replace it entirely.
                    </p>
                    
                    <div className="flex flex-wrap gap-3 mb-4">
                        <button
                            onClick={triggerFileSelect}
                            disabled={isImporting}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
                        >
                            {isImporting ? 'Importing...' : 'Select File to Import'}
                        </button>
                        <button
                            onClick={() => setShowImportOptions(!showImportOptions)}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        >
                            Options
                        </button>
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* Import Options */}
                    {showImportOptions && (
                        <div className="bg-white rounded border p-4 space-y-3">
                            <h4 className="font-medium text-gray-900">Import Options</h4>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Merge Strategy
                                    </label>
                                    <select
                                        value={importOptions.mergeStrategy}
                                        onChange={(e) => setImportOptions(prev => ({ ...prev, mergeStrategy: e.target.value as any }))}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="merge">Merge with existing data</option>
                                        <option value="replace">Replace existing data</option>
                                        <option value="skip_existing">Skip existing records</option>
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={importOptions.validateData}
                                            onChange={(e) => setImportOptions(prev => ({ ...prev, validateData: e.target.checked }))}
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="ml-2 text-sm">Validate data</span>
                                    </label>
                                    
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={importOptions.skipInvalidRecords}
                                            onChange={(e) => setImportOptions(prev => ({ ...prev, skipInvalidRecords: e.target.checked }))}
                                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="ml-2 text-sm">Skip invalid records</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Import Progress */}
                    {importProgress && (
                        <div className="bg-white rounded border p-4 mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Import Progress</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>{importProgress.stage}</span>
                                    <span>{importProgress.progress}/{importProgress.total}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(importProgress.progress / importProgress.total) * 100}%` }}
                                    ></div>
                                </div>
                                {importProgress.currentItem && (
                                    <div className="text-xs text-gray-600">
                                        Current: {importProgress.currentItem}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Import Result */}
                    {importResult && (
                        <div className={`rounded border p-4 mt-4 ${
                            importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                            <h4 className="font-medium text-gray-900 mb-2">Import Results</h4>
                            <div className="space-y-1 text-sm">
                                <div>Total Records: {importResult.totalRecords}</div>
                                <div>Imported: {importResult.importedRecords}</div>
                                <div>Skipped: {importResult.skippedRecords}</div>
                                <div>Errors: {importResult.errorRecords}</div>
                                
                                {importResult.errors.length > 0 && (
                                    <div className="mt-2">
                                        <div className="font-medium text-red-700">Errors:</div>
                                        <ul className="text-xs text-red-600 list-disc list-inside">
                                            {importResult.errors.slice(0, 5).map((error, index) => (
                                                <li key={index}>{error}</li>
                                            ))}
                                            {importResult.errors.length > 5 && (
                                                <li>... and {importResult.errors.length - 5} more errors</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                                
                                {importResult.warnings.length > 0 && (
                                    <div className="mt-2">
                                        <div className="font-medium text-yellow-700">Warnings:</div>
                                        <ul className="text-xs text-yellow-600 list-disc list-inside">
                                            {importResult.warnings.slice(0, 3).map((warning, index) => (
                                                <li key={index}>{warning}</li>
                                            ))}
                                            {importResult.warnings.length > 3 && (
                                                <li>... and {importResult.warnings.length - 3} more warnings</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Information */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
                    <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                        <li>JSON exports contain all your data and can be used for complete backups</li>
                        <li>CSV exports contain only transaction data for analysis in external tools</li>
                        <li>Import operations can be undone by using the database reset function</li>
                        <li>Large imports may take several minutes to complete</li>
                        <li>Always backup your data before performing imports</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DataExportImport;