import { Account } from "../../types/Account";
import AccountSelect from "components/Filter/AccountSelect";
import { FC, useEffect, useState } from "react";
import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import { useLiveQuery } from "dexie-react-hooks";

export type FilterOptions = {
    selectedAccounts: Account[];
    excludedCategories: string[];
    dateRange: { start: Date | null; end: Date | null };
    payeeLimit: number | 'all';
    excludeFromSpending: boolean;
};

export type Props = {
    onFiltersChange: (filters: FilterOptions) => void;
}

const FilterBar: FC<Props> = ({ onFiltersChange }) => {
    const db = useDatabase()
    const accountsDb = useLiveQuery(() => db.accounts.toArray())
    const [selectedAccounts, setSelectedAccounts] = useState<Account[]>([]);
    const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
    const [payeeLimit, setPayeeLimit] = useState<number | 'all'>('all');
    const [excludeFromSpending, setExcludeFromSpending] = useState<boolean>(false);

    const categories = ['general', 'transport', 'shopping', 'bills', 'expenses', 'entertainment', 'transfers'];
    const payeeLimits = [10, 20, 50, 'all'] as const;

    useEffect(() => {
        if (accountsDb) setSelectedAccounts(accountsDb)
    }, [accountsDb])

    useEffect(() => {
        onFiltersChange({
            selectedAccounts,
            excludedCategories,
            dateRange,
            payeeLimit,
            excludeFromSpending
        });
    }, [selectedAccounts, excludedCategories, dateRange, payeeLimit, excludeFromSpending, onFiltersChange]);

    const handleCategoryToggle = (category: string) => {
        setExcludedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    return (
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
            <div className="flex flex-wrap gap-4 items-center">
                {/* Account Selection */}
                <div className="flex-1 min-w-64">
                    <AccountSelect 
                        accounts={accountsDb as Account[]} 
                        setAccounts={setSelectedAccounts} 
                        selectedAccounts={selectedAccounts} 
                    />
                </div>

                {/* Date Range */}
                <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium text-gray-700">Date Range:</label>
                    <input
                        type="date"
                        value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : null }))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                        type="date"
                        value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : null }))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                </div>

                {/* Payee Limit */}
                <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium text-gray-700">Top Payees:</label>
                    <select
                        value={payeeLimit}
                        onChange={(e) => setPayeeLimit(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                        {payeeLimits.map(limit => (
                            <option key={limit} value={limit}>
                                {limit === 'all' ? 'All' : `Top ${limit}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Exclude from Spending Toggle */}
                <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={excludeFromSpending}
                            onChange={(e) => setExcludeFromSpending(e.target.checked)}
                            className="mr-2"
                        />
                        Exclude from Spending Summary Only
                    </label>
                </div>
            </div>

            {/* Category Filters */}
            <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">Exclude Categories:</label>
                <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => handleCategoryToggle(category)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                excludedCategories.includes(category)
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                            {excludedCategories.includes(category) && ' ✕'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default FilterBar;