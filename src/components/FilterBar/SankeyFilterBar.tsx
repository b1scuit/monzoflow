import { FC, useState } from 'react';
import { Account } from '../../types/Account';
import AccountSelect from '../Filter/AccountSelect';
import { CalendarIcon, FunnelIcon, CurrencyPoundIcon } from '@heroicons/react/24/outline';

export interface SankeyFilters {
    selectedAccounts: Account[];
    dateRange: {
        startDate: string;
        endDate: string;
    };
    minimumAmount: number;
    transactionTypes: string[];
    searchQuery: string;
}

interface SankeyFilterBarProps {
    accounts: Account[];
    filters: SankeyFilters;
    onFiltersChange: (filters: SankeyFilters) => void;
    availableCategories?: string[];
    selectedCategories?: Set<string>;
    onCategoriesChange?: (categories: Set<string>) => void;
}

const SankeyFilterBar: FC<SankeyFilterBarProps> = ({
    accounts,
    filters,
    onFiltersChange,
    availableCategories = [],
    selectedCategories = new Set(),
    onCategoriesChange
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleFilterChange = (key: keyof SankeyFilters, value: any) => {
        onFiltersChange({
            ...filters,
            [key]: value
        });
    };

    const transactionTypeOptions = [
        { value: 'debit', label: 'Spending (Debit)' },
        { value: 'credit', label: 'Income (Credit)' },
        { value: 'transfer', label: 'Transfers' }
    ];

    const handleCategoryToggle = (category: string) => {
        if (!onCategoriesChange) return;
        
        const newCategories = new Set(selectedCategories);
        if (newCategories.has(category)) {
            newCategories.delete(category);
        } else {
            newCategories.add(category);
        }
        onCategoriesChange(newCategories);
    };

    const clearAllFilters = () => {
        onFiltersChange({
            selectedAccounts: accounts,
            dateRange: {
                startDate: '',
                endDate: ''
            },
            minimumAmount: 0,
            transactionTypes: ['debit'],
            searchQuery: ''
        });
        if (onCategoriesChange) {
            onCategoriesChange(new Set(availableCategories));
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FunnelIcon className="h-5 w-5 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
                        <span className="text-xs text-gray-500">
                            ({filters.selectedAccounts.length} accounts selected)
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={clearAllFilters}
                            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            {isExpanded ? 'Less' : 'More'} Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Account Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Accounts
                    </label>
                    <AccountSelect
                        accounts={accounts}
                        selectedAccounts={filters.selectedAccounts}
                        setAccounts={(newAccounts) => handleFilterChange('selectedAccounts', newAccounts)}
                    />
                </div>

                {/* Search Query */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Merchants/Categories
                    </label>
                    <input
                        type="text"
                        value={filters.searchQuery}
                        onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                        placeholder="Search for specific merchants or categories..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {isExpanded && (
                    <>
                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.dateRange.startDate}
                                    onChange={(e) => handleFilterChange('dateRange', {
                                        ...filters.dateRange,
                                        startDate: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.dateRange.endDate}
                                    onChange={(e) => handleFilterChange('dateRange', {
                                        ...filters.dateRange,
                                        endDate: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Minimum Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <CurrencyPoundIcon className="h-4 w-4 inline mr-1" />
                                Minimum Amount (£{filters.minimumAmount})
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1000"
                                step="10"
                                value={filters.minimumAmount}
                                onChange={(e) => handleFilterChange('minimumAmount', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>£0</span>
                                <span>£1000+</span>
                            </div>
                        </div>

                        {/* Transaction Types */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Transaction Types
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {transactionTypeOptions.map(option => (
                                    <label key={option.value} className="inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={filters.transactionTypes.includes(option.value)}
                                            onChange={(e) => {
                                                const newTypes = e.target.checked
                                                    ? [...filters.transactionTypes, option.value]
                                                    : filters.transactionTypes.filter(t => t !== option.value);
                                                handleFilterChange('transactionTypes', newTypes);
                                            }}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Category Selection */}
                        {availableCategories.length > 0 && onCategoriesChange && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Categories ({selectedCategories.size}/{availableCategories.length} selected)
                                </label>
                                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                                    <div className="flex flex-wrap gap-1">
                                        {availableCategories.map(category => (
                                            <button
                                                key={category}
                                                onClick={() => handleCategoryToggle(category)}
                                                className={`px-2 py-1 rounded-full text-xs transition-colors ${
                                                    selectedCategories.has(category)
                                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                                }`}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SankeyFilterBar;