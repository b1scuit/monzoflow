import { FC, useState } from 'react';
import BudgetOverview from 'components/Budget/BudgetOverview';
import DebtTracker from 'components/Budget/DebtTracker';
import BillsManager from 'components/Budget/BillsManager';
import YearlyOverview from 'components/Budget/YearlyOverview';
import { BudgetCategoryManager } from 'components/Budget/BudgetCategoryManager';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { Budget } from 'types/Budget';

const BudgetPage: FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'debt' | 'bills' | 'yearly'>('overview');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
    const [newBudgetForm, setNewBudgetForm] = useState({
        name: '',
        description: ''
    });
    const db = useDatabase();

    // Get the first budget for the selected year to pass to category manager
    const selectedBudget = useLiveQuery(
        () => db.budgets.where('year').equals(selectedYear).first(),
        [selectedYear]
    );

    const tabs = [
        { key: 'overview', label: 'Budget Overview', icon: '📊' },
        { key: 'categories', label: 'Categories', icon: '🏷️' },
        { key: 'debt', label: 'Debt Tracker', icon: '🏦' },
        { key: 'bills', label: 'Bills Manager', icon: '💳' },
        { key: 'yearly', label: 'Yearly Review', icon: '📈' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <BudgetOverview year={selectedYear} onCreateBudget={() => setShowCreateBudgetModal(true)} />;
            case 'categories':
                return selectedBudget ? (
                    <BudgetCategoryManager budget={selectedBudget} />
                ) : (
                    <div className="bg-white shadow rounded-lg p-6 text-center">
                        <p className="text-gray-500 mb-4">No budget found for {selectedYear}</p>
                        <button 
                            onClick={() => setShowCreateBudgetModal(true)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        >
                            Create Budget for {selectedYear}
                        </button>
                    </div>
                );
            case 'debt':
                return <DebtTracker />;
            case 'bills':
                return <BillsManager />;
            case 'yearly':
                return <YearlyOverview year={selectedYear} />;
            default:
                return <BudgetOverview year={selectedYear} />;
        }
    };

    const generateYearOptions = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            years.push(i);
        }
        return years;
    };

    const handleCreateBudget = async () => {
        if (!newBudgetForm.name.trim()) {
            return;
        }

        try {
            const newBudget: Budget = {
                id: crypto.randomUUID(),
                name: newBudgetForm.name.trim(),
                description: newBudgetForm.description.trim(),
                year: selectedYear,
                categories: [],
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };

            await db.budgets.add(newBudget);
            
            // Reset form and close modal
            setNewBudgetForm({ name: '', description: '' });
            setShowCreateBudgetModal(false);
            
            // Switch to categories tab to start adding categories
            setActiveTab('categories');
        } catch (error) {
            console.error('Error creating budget:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-gray-900">Budget & Finance Tracker</h1>
                            
                            {/* Year Selector */}
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">Year:</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {generateYearOptions().map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => window.location.href = '/settings'}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors flex items-center space-x-2"
                                title="Settings"
                            >
                                <span>⚙️</span>
                                <span>Settings</span>
                            </button>
                            <button 
                                onClick={() => setShowCreateBudgetModal(true)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                            >
                                Create Budget
                            </button>
                            <button className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">
                                Add Transaction
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex space-x-8 border-b border-gray-200">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {renderContent()}
            </div>

            {/* Help/Info Section */}
            <div className="bg-blue-50 border-t border-blue-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-sm">💡</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-blue-900 mb-1">Budget Tracking Tips</h3>
                            <div className="text-sm text-blue-700 space-y-1">
                                <p>• Set up budget categories that match your Monzo transaction categories for automatic tracking</p>
                                <p>• Add all recurring bills to get accurate monthly expense forecasts</p>
                                <p>• Track high-interest debts as high priority for optimal payoff strategies</p>
                                <p>• Review your yearly overview regularly to identify spending patterns and opportunities</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Budget Modal */}
            {showCreateBudgetModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Budget</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Budget Name
                                </label>
                                <input
                                    type="text"
                                    value={newBudgetForm.name}
                                    onChange={(e) => setNewBudgetForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder={`${selectedYear} Budget`}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={newBudgetForm.description}
                                    onChange={(e) => setNewBudgetForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 h-20 resize-none"
                                    placeholder="Describe your budget goals..."
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-sm text-blue-700">
                                    <strong>Year:</strong> {selectedYear}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    After creating the budget, you can add categories to track your spending.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateBudgetModal(false);
                                    setNewBudgetForm({ name: '', description: '' });
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBudget}
                                disabled={!newBudgetForm.name.trim()}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                            >
                                Create Budget
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetPage;