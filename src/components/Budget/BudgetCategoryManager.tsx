import { FC, useState, useEffect } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { Budget, BudgetCategory } from 'types/Budget';
import { useLiveQuery } from 'dexie-react-hooks';
import { BudgetCalculationService } from 'services/BudgetCalculationService';
import { useBudgetCalculation } from 'hooks/useBudgetCalculation';

interface BudgetCategoryManagerProps {
    budget: Budget;
    onCategoryAdded?: (category: BudgetCategory) => void;
    onCategoryUpdated?: (category: BudgetCategory) => void;
    onCategoryDeleted?: (categoryId: string) => void;
}

interface NewCategoryForm {
    name: string;
    category: string;
    allocatedAmount: number;
    color: string;
}

const DEFAULT_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
];

export const BudgetCategoryManager: FC<BudgetCategoryManagerProps> = ({
    budget,
    onCategoryAdded,
    onCategoryUpdated,
    onCategoryDeleted
}) => {
    const db = useDatabase();
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
    const [newCategoryForm, setNewCategoryForm] = useState<NewCategoryForm>({
        name: '',
        category: '',
        allocatedAmount: 0,
        color: DEFAULT_COLORS[0]
    });
    const [editCategoryForm, setEditCategoryForm] = useState<NewCategoryForm>({
        name: '',
        category: '',
        allocatedAmount: 0,
        color: DEFAULT_COLORS[0]
    });

    const transactions = useLiveQuery(() => db.transactions.toArray(), []);
    const availableCategories = BudgetCalculationService.getAvailableCategories(transactions || []);

    const {
        budgetCategories,
        getSuggestedAmount,
        updateBudgetCategory
    } = useBudgetCalculation({ budget });

    const handleAddCategory = async () => {
        if (!newCategoryForm.name || !newCategoryForm.category || !transactions) {
            return;
        }

        try {
            const period = BudgetCalculationService.getBudgetPeriod(budget);
            const newCategory = BudgetCalculationService.createBudgetCategory(
                budget.id,
                newCategoryForm.name,
                newCategoryForm.category,
                newCategoryForm.allocatedAmount,
                transactions,
                period,
                newCategoryForm.color
            );

            await db.budgetCategories.add(newCategory);
            
            setNewCategoryForm({
                name: '',
                category: '',
                allocatedAmount: 0,
                color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
            });
            setIsAddingCategory(false);
            
            onCategoryAdded?.(newCategory);
        } catch (error) {
            console.error('Error adding budget category:', error);
        }
    };

    const handleUpdateCategory = async () => {
        if (!editingCategory || !editCategoryForm.name || !editCategoryForm.category) {
            return;
        }

        try {
            const updates = {
                name: editCategoryForm.name,
                category: editCategoryForm.category,
                allocatedAmount: editCategoryForm.allocatedAmount,
                color: editCategoryForm.color,
                updated: new Date().toISOString()
            };

            await updateBudgetCategory(editingCategory.id, updates);
            onCategoryUpdated?.({ ...editingCategory, ...updates });
            
            // Reset form and close modal
            setEditingCategory(null);
            setEditCategoryForm({
                name: '',
                category: '',
                allocatedAmount: 0,
                color: DEFAULT_COLORS[0]
            });
        } catch (error) {
            console.error('Error updating budget category:', error);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        try {
            await db.budgetCategories.delete(categoryId);
            onCategoryDeleted?.(categoryId);
        } catch (error) {
            console.error('Error deleting budget category:', error);
        }
    };

    const getSuggestionForCategory = (category: string) => {
        if (!transactions) return null;
        const suggestion = getSuggestedAmount(category);
        return suggestion.suggested > 0 ? suggestion : null;
    };

    const handleCategorySelect = (category: string) => {
        setNewCategoryForm(prev => ({ ...prev, category }));
        
        // Auto-fill name based on category
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        if (!newCategoryForm.name) {
            setNewCategoryForm(prev => ({ ...prev, name: categoryName }));
        }

        // Set suggested amount
        const suggestion = getSuggestionForCategory(category);
        if (suggestion && suggestion.suggested > 0) {
            setNewCategoryForm(prev => ({ 
                ...prev, 
                allocatedAmount: Math.round(suggestion.suggested / 100) * 100 // Round to nearest £100
            }));
        }
    };

    // Populate edit form when editing category changes
    useEffect(() => {
        if (editingCategory) {
            setEditCategoryForm({
                name: editingCategory.name,
                category: editingCategory.category,
                allocatedAmount: editingCategory.allocatedAmount,
                color: editingCategory.color
            });
        }
    }, [editingCategory]);

    return (
        <div className="space-y-6">
            {/* Existing Categories */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Budget Categories</h3>
                    <button
                        onClick={() => setIsAddingCategory(true)}
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                    >
                        Add Category
                    </button>
                </div>

                {budgetCategories.length > 0 ? (
                    <div className="space-y-4">
                        {budgetCategories.map(category => {
                            const percentage = category.allocatedAmount > 0 
                                ? (category.spentAmount / category.allocatedAmount) * 100 
                                : 0;
                            const isOverBudget = percentage > 100;

                            return (
                                <div key={category.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div 
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: category.color }}
                                                ></div>
                                                <h4 className="font-medium text-gray-900">{category.name}</h4>
                                                <span className="text-sm text-gray-500">({category.category})</span>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Budgeted: £{category.allocatedAmount.toLocaleString()} | 
                                                Spent: £{category.spentAmount.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingCategory(category)}
                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(category.id)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                isOverBudget ? 'bg-red-500' : 'bg-blue-500'
                                            }`}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>{percentage.toFixed(1)}% used</span>
                                        <span>
                                            {isOverBudget 
                                                ? `£${(category.spentAmount - category.allocatedAmount).toLocaleString()} over budget`
                                                : `£${(category.allocatedAmount - category.spentAmount).toLocaleString()} remaining`
                                            }
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">
                        No budget categories set up. Add your first category to start tracking spending.
                    </p>
                )}
            </div>

            {/* Add Category Modal */}
            {isAddingCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Budget Category</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    value={newCategoryForm.name}
                                    onChange={(e) => setNewCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="e.g., Groceries, Entertainment"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Transaction Category
                                </label>
                                <select
                                    value={newCategoryForm.category}
                                    onChange={(e) => handleCategorySelect(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="">Select a category</option>
                                    {availableCategories.map(category => (
                                        <option key={category} value={category}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Budget Amount (£)
                                </label>
                                <input
                                    type="number"
                                    value={newCategoryForm.allocatedAmount}
                                    onChange={(e) => setNewCategoryForm(prev => ({ 
                                        ...prev, 
                                        allocatedAmount: parseFloat(e.target.value) || 0 
                                    }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    min="0"
                                    step="0.01"
                                />
                                {newCategoryForm.category && getSuggestionForCategory(newCategoryForm.category) && (
                                    <p className="text-sm text-blue-600 mt-1">
                                        Suggested: £{getSuggestionForCategory(newCategoryForm.category)!.suggested.toLocaleString()} 
                                        (based on recent spending)
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Color
                                </label>
                                <div className="flex gap-2">
                                    {DEFAULT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewCategoryForm(prev => ({ ...prev, color }))}
                                            className={`w-8 h-8 rounded-full border-2 ${
                                                newCategoryForm.color === color ? 'border-gray-900' : 'border-gray-300'
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsAddingCategory(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCategory}
                                disabled={!newCategoryForm.name || !newCategoryForm.category}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                            >
                                Add Category
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Category Modal */}
            {editingCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Budget Category</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    value={editCategoryForm.name}
                                    onChange={(e) => setEditCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="e.g., Groceries, Entertainment"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Transaction Category
                                </label>
                                <select
                                    value={editCategoryForm.category}
                                    onChange={(e) => setEditCategoryForm(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="">Select a category</option>
                                    {availableCategories.map(category => (
                                        <option key={category} value={category}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Budget Amount (£)
                                </label>
                                <input
                                    type="number"
                                    value={editCategoryForm.allocatedAmount}
                                    onChange={(e) => setEditCategoryForm(prev => ({ 
                                        ...prev, 
                                        allocatedAmount: parseFloat(e.target.value) || 0 
                                    }))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    min="0"
                                    step="0.01"
                                />
                                {editCategoryForm.category && getSuggestionForCategory(editCategoryForm.category) && (
                                    <p className="text-sm text-blue-600 mt-1">
                                        Suggested: £{getSuggestionForCategory(editCategoryForm.category)!.suggested.toLocaleString()} 
                                        (based on recent spending)
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Color
                                </label>
                                <div className="flex gap-2">
                                    {DEFAULT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setEditCategoryForm(prev => ({ ...prev, color }))}
                                            className={`w-8 h-8 rounded-full border-2 ${
                                                editCategoryForm.color === color ? 'border-gray-900' : 'border-gray-300'
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setEditingCategory(null);
                                    setEditCategoryForm({
                                        name: '',
                                        category: '',
                                        allocatedAmount: 0,
                                        color: DEFAULT_COLORS[0]
                                    });
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateCategory}
                                disabled={!editCategoryForm.name || !editCategoryForm.category}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                            >
                                Update Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};