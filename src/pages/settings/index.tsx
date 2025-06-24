import { FC, useState, useEffect } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { useTransactions } from 'components/Monzo/useTransactions';
import { useLiveQuery } from 'dexie-react-hooks';

interface StorageInfo {
    totalSize: number;
    accounts: number;
    transactions: number;
    budgets: number;
    debts: number;
    bills: number;
}

interface TokenInfo {
    hasToken: boolean;
    isStale: boolean;
    lastSignIn: string | null;
    tokenAge: string;
}

const Settings: FC = () => {
    const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [isResetting, setIsResetting] = useState(false);
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [resetType, setResetType] = useState<'database' | 'all' | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    
    const db = useDatabase();
    const { isTokenStale } = useTransactions();
    
    // Live queries to get current data counts
    const accounts = useLiveQuery(() => db.accounts.toArray());
    const transactions = useLiveQuery(() => db.transactions.toArray());
    const budgets = useLiveQuery(() => db.budgets.toArray());
    const debts = useLiveQuery(() => db.debts.toArray());
    const bills = useLiveQuery(() => db.bills.toArray());

    // Calculate storage information
    useEffect(() => {
        if (accounts && transactions && budgets && debts && bills) {
            const accountsSize = accounts.length * 500; // Rough estimate
            const transactionsSize = transactions.length * 800;
            const budgetsSize = budgets.length * 300;
            const debtsSize = debts.length * 400;
            const billsSize = bills.length * 350;
            
            setStorageInfo({
                totalSize: accountsSize + transactionsSize + budgetsSize + debtsSize + billsSize,
                accounts: accounts.length,
                transactions: transactions.length,
                budgets: budgets.length,
                debts: debts.length,
                bills: bills.length
            });
            
            setLastUpdated(new Date().toLocaleString());
        }
    }, [accounts, transactions, budgets, debts, bills]);

    // Get token information
    useEffect(() => {
        const authData = localStorage.getItem('authData');
        const lastSignIn = localStorage.getItem('lastSignIn');
        const tokenTimestamp = localStorage.getItem('tokenTimestamp');
        
        let tokenAge = 'Unknown';
        if (tokenTimestamp) {
            const age = Date.now() - parseInt(tokenTimestamp);
            const minutes = Math.floor(age / (1000 * 60));
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) {
                tokenAge = `${days} day${days > 1 ? 's' : ''} ago`;
            } else if (hours > 0) {
                tokenAge = `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else {
                tokenAge = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            }
        }
        
        setTokenInfo({
            hasToken: !!authData,
            isStale: isTokenStale(),
            lastSignIn: lastSignIn ? new Date(parseInt(lastSignIn)).toLocaleString() : null,
            tokenAge
        });
    }, [isTokenStale]);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDatabaseReset = async () => {
        setIsResetting(true);
        try {
            await db.resetDatabase();
            
            // Clear transaction pull timestamps
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('lastTransactionPull_')) {
                    localStorage.removeItem(key);
                }
            });
            
            setShowConfirmReset(false);
            setResetType(null);
            alert('Database reset successfully! Your data will be refetched from Monzo.');
        } catch (error) {
            console.error('Failed to reset database:', error);
            alert('Failed to reset database. Please try again.');
        }
        setIsResetting(false);
    };

    const handleFullReset = async () => {
        setIsResetting(true);
        try {
            // Reset database
            await db.resetDatabase();
            
            // Clear all localStorage
            localStorage.clear();
            
            setShowConfirmReset(false);
            setResetType(null);
            alert('Full reset completed! You will need to re-authenticate with Monzo.');
            
            // Redirect to home page
            window.location.href = '/';
        } catch (error) {
            console.error('Failed to perform full reset:', error);
            alert('Failed to perform full reset. Please try again.');
        }
        setIsResetting(false);
    };

    const handleClearCache = () => {
        // Clear transaction pull timestamps
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('lastTransactionPull_')) {
                localStorage.removeItem(key);
            }
        });
        
        // Clear sign-in timestamp
        localStorage.removeItem('lastSignIn');
        localStorage.removeItem('tokenTimestamp');
        
        alert('Cache cleared! Next data fetch will pull fresh data.');
        setTokenInfo(prev => prev ? { ...prev, lastSignIn: null, tokenAge: 'Unknown' } : null);
    };

    const confirmReset = (type: 'database' | 'all') => {
        setResetType(type);
        setShowConfirmReset(true);
    };

    const executeReset = () => {
        if (resetType === 'database') {
            handleDatabaseReset();
        } else if (resetType === 'all') {
            handleFullReset();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Settings & Management</h1>
                    <p className="text-gray-600 mt-2">Manage your data, authentication, and application settings</p>
                    <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdated}</p>
                </div>

                {/* Storage Information */}
                <div className="bg-white rounded-lg shadow mb-6 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">💾</span>
                        Storage Information
                    </h2>
                    
                    {storageInfo ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{storageInfo.accounts}</div>
                                <div className="text-sm text-gray-600">Accounts</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{storageInfo.transactions.toLocaleString()}</div>
                                <div className="text-sm text-gray-600">Transactions</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">{storageInfo.budgets}</div>
                                <div className="text-sm text-gray-600">Budgets</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{storageInfo.debts}</div>
                                <div className="text-sm text-gray-600">Debts</div>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600">{storageInfo.bills}</div>
                                <div className="text-sm text-gray-600">Bills</div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-gray-600">{formatBytes(storageInfo.totalSize)}</div>
                                <div className="text-sm text-gray-600">Estimated Size</div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-pulse">
                            <div className="h-20 bg-gray-200 rounded"></div>
                        </div>
                    )}
                </div>

                {/* Authentication & Token Information */}
                <div className="bg-white rounded-lg shadow mb-6 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">🔐</span>
                        Authentication Status
                    </h2>
                    
                    {tokenInfo ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b">
                                <span className="text-gray-600">Token Status</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    tokenInfo.hasToken 
                                        ? tokenInfo.isStale 
                                            ? 'bg-yellow-100 text-yellow-800' 
                                            : 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {tokenInfo.hasToken 
                                        ? tokenInfo.isStale ? 'Stale' : 'Valid'
                                        : 'No Token'
                                    }
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b">
                                <span className="text-gray-600">Token Age</span>
                                <span className="text-gray-900">{tokenInfo.tokenAge}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-gray-600">Last Sign In</span>
                                <span className="text-gray-900">{tokenInfo.lastSignIn || 'Never'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-pulse">
                            <div className="h-16 bg-gray-200 rounded"></div>
                        </div>
                    )}
                </div>

                {/* Data Management Actions */}
                <div className="bg-white rounded-lg shadow mb-6 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">🛠️</span>
                        Data Management
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <h3 className="font-medium text-gray-900">Clear Cache</h3>
                                <p className="text-sm text-gray-600">Clear transaction pull timestamps and force fresh data fetch</p>
                            </div>
                            <button
                                onClick={handleClearCache}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                Clear Cache
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg border-yellow-200 bg-yellow-50">
                            <div>
                                <h3 className="font-medium text-gray-900">Reset Database</h3>
                                <p className="text-sm text-gray-600">Clear all local data and refetch from Monzo (keeps authentication)</p>
                            </div>
                            <button
                                onClick={() => confirmReset('database')}
                                disabled={isResetting}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isResetting ? 'Resetting...' : 'Reset Database'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                            <div>
                                <h3 className="font-medium text-gray-900">Full Reset</h3>
                                <p className="text-sm text-gray-600">Clear all data and authentication - you'll need to sign in again</p>
                            </div>
                            <button
                                onClick={() => confirmReset('all')}
                                disabled={isResetting}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isResetting ? 'Resetting...' : 'Full Reset'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* App Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">ℹ️</span>
                        Application Information
                    </h2>
                    
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Version</span>
                            <span className="text-gray-900">0.1.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Database Version</span>
                            <span className="text-gray-900">2</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Environment</span>
                            <span className="text-gray-900">{process.env.NODE_ENV}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">User Agent</span>
                            <span className="text-gray-900 truncate max-w-xs">{navigator.userAgent.split(' ')[0]}</span>
                        </div>
                    </div>
                </div>

                {/* Back to App */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => window.history.back()}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        ← Back to App
                    </button>
                </div>

                {/* Confirmation Modal */}
                {showConfirmReset && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Confirm {resetType === 'database' ? 'Database' : 'Full'} Reset
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {resetType === 'database' 
                                    ? 'This will clear all local data but keep your authentication. You\'ll need to refetch data from Monzo.'
                                    : 'This will clear ALL data including authentication. You\'ll need to sign in again.'
                                }
                            </p>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setShowConfirmReset(false)}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeReset}
                                    disabled={isResetting}
                                    className={`flex-1 px-4 py-2 rounded-lg transition-colors text-white ${
                                        resetType === 'database' 
                                            ? 'bg-yellow-500 hover:bg-yellow-600' 
                                            : 'bg-red-500 hover:bg-red-600'
                                    } disabled:opacity-50`}
                                >
                                    {isResetting ? 'Resetting...' : 'Confirm Reset'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;