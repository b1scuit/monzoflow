import { FC, useState } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { Bill, BillPayment } from 'types/Budget';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, addWeeks, addMonths, addYears, isAfter, isBefore } from 'date-fns';

export const BillsManager: FC = () => {
    const db = useDatabase();
    const [showAddBill, setShowAddBill] = useState(false);
    // const [selectedMonth, setSelectedMonth] = useState(new Date()); // TODO: Implement month selection
    const [newBill, setNewBill] = useState<Partial<Bill>>({
        name: '',
        payee: '',
        amount: 0,
        frequency: 'monthly',
        status: 'active',
        autopay: false,
        category: 'bills'
    });

    const bills = useLiveQuery(() => db.bills.orderBy('nextDueDate').toArray());
    // const billPayments = useLiveQuery(() => db.billPayments.orderBy('paymentDate').reverse().toArray()); // TODO: Implement bill payments history

    const getUpcomingBills = () => {
        const today = new Date();
        const upcoming = new Date();
        upcoming.setDate(today.getDate() + 30); // Next 30 days
        
        return bills?.filter(bill => {
            const dueDate = new Date(bill.nextDueDate);
            return isAfter(dueDate, today) && isBefore(dueDate, upcoming) && bill.status === 'active';
        }) || [];
    };

    const getOverdueBills = () => {
        const today = new Date();
        return bills?.filter(bill => {
            const dueDate = new Date(bill.nextDueDate);
            return isBefore(dueDate, today) && bill.status === 'active';
        }) || [];
    };

    // const getBillsForMonth = (month: Date) => {
    //     const start = startOfMonth(month);
    //     const end = endOfMonth(month);
    //     
    //     return bills?.filter(bill => {
    //         const dueDate = new Date(bill.nextDueDate);
    //         return dueDate >= start && dueDate <= end && bill.status === 'active';
    //     }) || [];
    // }; // TODO: Implement monthly bill filtering

    const calculateNextDueDate = (frequency: string, dueDay?: number) => {
        const today = new Date();
        
        switch (frequency) {
            case 'weekly':
                return addWeeks(today, 1);
            case 'monthly':
                const nextMonth = addMonths(today, 1);
                if (dueDay) {
                    nextMonth.setDate(dueDay);
                }
                return nextMonth;
            case 'quarterly':
                return addMonths(today, 3);
            case 'yearly':
                return addYears(today, 1);
            default:
                return today;
        }
    };

    const getTotalMonthlyBills = () => {
        return bills?.reduce((sum, bill) => {
            if (bill.status !== 'active') return sum;
            
            switch (bill.frequency) {
                case 'weekly': return sum + (bill.amount * 4.33);
                case 'monthly': return sum + bill.amount;
                case 'quarterly': return sum + (bill.amount / 3);
                case 'yearly': return sum + (bill.amount / 12);
                default: return sum;
            }
        }, 0) || 0;
    };

    const handleAddBill = async () => {
        if (!newBill.name || !newBill.payee || !newBill.amount) return;

        const nextDueDate = calculateNextDueDate(newBill.frequency!, newBill.dueDay);
        
        const bill: Bill = {
            id: crypto.randomUUID(),
            name: newBill.name,
            payee: newBill.payee,
            amount: newBill.amount,
            frequency: newBill.frequency!,
            dueDay: newBill.dueDay,
            nextDueDate: nextDueDate.toISOString(),
            category: newBill.category || 'bills',
            status: 'active',
            autopay: newBill.autopay || false,
            remindDays: newBill.remindDays,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            description: newBill.description
        };

        await db.bills.add(bill);
        setNewBill({
            name: '',
            payee: '',
            amount: 0,
            frequency: 'monthly',
            status: 'active',
            autopay: false,
            category: 'bills'
        });
        setShowAddBill(false);
    };

    const handlePayBill = async (billId: string, amount?: number) => {
        const bill = bills?.find(b => b.id === billId);
        if (!bill) return;

        const payment: BillPayment = {
            id: crypto.randomUUID(),
            billId,
            amount: amount || bill.amount,
            paymentDate: new Date().toISOString(),
            dueDate: bill.nextDueDate,
            status: 'paid',
            created: new Date().toISOString()
        };

        await db.billPayments.add(payment);

        // Update next due date
        const nextDue = calculateNextDueDate(bill.frequency, bill.dueDay);
        await db.bills.update(billId, {
            nextDueDate: nextDue.toISOString(),
            updated: new Date().toISOString()
        });
    };

    const getStatusColor = (bill: Bill) => {
        const dueDate = new Date(bill.nextDueDate);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        if (daysDiff < 0) return 'bg-red-100 text-red-800'; // Overdue
        if (daysDiff <= 3) return 'bg-yellow-100 text-yellow-800'; // Due soon
        return 'bg-green-100 text-green-800'; // On time
    };

    const upcomingBills = getUpcomingBills();
    const overdueBills = getOverdueBills();
    const monthlyTotal = getTotalMonthlyBills();

    return (
        <div className="space-y-6">
            {/* Header with Summary */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Bills Manager</h2>
                    <button
                        onClick={() => setShowAddBill(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                        Add Bill
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">£{monthlyTotal.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Monthly Total</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-yellow-600">{upcomingBills.length}</p>
                        <p className="text-sm text-gray-600">Due Soon</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-red-600">{overdueBills.length}</p>
                        <p className="text-sm text-gray-600">Overdue</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">
                            {bills?.filter(b => b.autopay && b.status === 'active').length || 0}
                        </p>
                        <p className="text-sm text-gray-600">Autopay</p>
                    </div>
                </div>
            </div>

            {/* Overdue Bills Alert */}
            {overdueBills.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Overdue Bills</h3>
                    <div className="space-y-2">
                        {overdueBills.map(bill => (
                            <div key={bill.id} className="flex justify-between items-center">
                                <div>
                                    <span className="font-medium text-red-900">{bill.name}</span>
                                    <span className="text-red-700 ml-2">
                                        Due: {format(new Date(bill.nextDueDate), 'MMM dd, yyyy')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handlePayBill(bill.id)}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                >
                                    Pay £{bill.amount.toLocaleString()}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Bills */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Bills (Next 30 Days)</h3>
                
                {upcomingBills.length > 0 ? (
                    <div className="space-y-3">
                        {upcomingBills.map(bill => {
                            const dueDate = new Date(bill.nextDueDate);
                            const today = new Date();
                            const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

                            return (
                                <div key={bill.id} className="flex justify-between items-center p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <h4 className="font-medium text-gray-900">{bill.name}</h4>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill)}`}>
                                                {daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Tomorrow' : `${daysDiff} days`}
                                            </span>
                                            {bill.autopay && (
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                    Auto
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">{bill.payee}</p>
                                        <p className="text-sm text-gray-500">
                                            Due: {format(dueDate, 'MMM dd, yyyy')} • {bill.frequency}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-semibold text-gray-900">£{bill.amount.toLocaleString()}</p>
                                        {!bill.autopay && (
                                            <button
                                                onClick={() => handlePayBill(bill.id)}
                                                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 mt-1"
                                            >
                                                Pay
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No bills due in the next 30 days</p>
                )}
            </div>

            {/* All Bills */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Bills</h3>
                
                {bills && bills.length > 0 ? (
                    <div className="space-y-3">
                        {bills.map(bill => (
                            <div key={bill.id} className="flex justify-between items-center p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <h4 className="font-medium text-gray-900">{bill.name}</h4>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            bill.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {bill.status.toUpperCase()}
                                        </span>
                                        {bill.autopay && (
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                AUTOPAY
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">{bill.payee} • {bill.category}</p>
                                    <p className="text-sm text-gray-500">
                                        {bill.frequency} • Next due: {format(new Date(bill.nextDueDate), 'MMM dd, yyyy')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-semibold text-gray-900">£{bill.amount.toLocaleString()}</p>
                                    <div className="space-x-2 mt-1">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                        <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No bills set up yet</p>
                        <button
                            onClick={() => setShowAddBill(true)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        >
                            Add Your First Bill
                        </button>
                    </div>
                )}
            </div>

            {/* Add Bill Modal */}
            {showAddBill && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Bill</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Name</label>
                                <input
                                    type="text"
                                    value={newBill.name || ''}
                                    onChange={(e) => setNewBill({...newBill, name: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="e.g., Electric Bill, Rent"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payee</label>
                                <input
                                    type="text"
                                    value={newBill.payee || ''}
                                    onChange={(e) => setNewBill({...newBill, payee: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Company or person you pay"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                    <input
                                        type="number"
                                        value={newBill.amount || ''}
                                        onChange={(e) => setNewBill({...newBill, amount: parseFloat(e.target.value) || 0})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="0.00"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                                    <select
                                        value={newBill.frequency || 'monthly'}
                                        onChange={(e) => setNewBill({...newBill, frequency: e.target.value as any})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="yearly">Yearly</option>
                                        <option value="one_time">One Time</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={newBill.category || 'bills'}
                                    onChange={(e) => setNewBill({...newBill, category: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="bills">Bills</option>
                                    <option value="utilities">Utilities</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="subscriptions">Subscriptions</option>
                                    <option value="rent">Rent/Mortgage</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            
                            {newBill.frequency === 'monthly' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Due Day of Month (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={newBill.dueDay || ''}
                                        onChange={(e) => setNewBill({...newBill, dueDay: parseInt(e.target.value) || undefined})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="e.g., 15 for 15th of each month"
                                    />
                                </div>
                            )}
                            
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="autopay"
                                    checked={newBill.autopay || false}
                                    onChange={(e) => setNewBill({...newBill, autopay: e.target.checked})}
                                    className="mr-2"
                                />
                                <label htmlFor="autopay" className="text-sm text-gray-700">
                                    This bill is automatically paid
                                </label>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowAddBill(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddBill}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            >
                                Add Bill
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillsManager;