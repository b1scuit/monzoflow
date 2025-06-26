import { FC, useState } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { Debt, DebtPayment } from 'types/Budget';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { CreditorMatchingManager } from './CreditorMatchingManager';
import { DebtMatchingService } from 'services/DebtMatchingService';
import { useAutomaticDebtMatching } from 'hooks/useAutomaticDebtMatching';
import { useDebtBalances } from 'hooks/useDebtBalances';

export const DebtTracker: FC = () => {
    const db = useDatabase();
    const [showAddDebt, setShowAddDebt] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
    const [showMatchingManager, setShowMatchingManager] = useState<string | null>(null);
    const [newDebt, setNewDebt] = useState<Partial<Debt>>({
        name: '',
        creditor: '',
        originalAmount: 0,
        currentBalance: 0,
        interestRate: 0,
        minimumPayment: 0,
        status: 'active',
        priority: 'medium'
    });

    const debts = useLiveQuery(() => db.debts.orderBy('priority').reverse().toArray());
    const debtPayments = useLiveQuery(() => db.debtPayments.orderBy('paymentDate').reverse().toArray());
    const pendingMatches = useLiveQuery(() => db.debtTransactionMatches.where('matchStatus').equals('pending').toArray());
    const paymentHistory = useLiveQuery(() => db.debtPaymentHistory.orderBy('paymentDate').reverse().toArray());
    
    const { processLatestTransactions, isReady } = useAutomaticDebtMatching();
    const { debtSummary, getDebtBalance, syncDebtBalances, isReady: balancesReady } = useDebtBalances();

    const getDebtPayments = (debtId: string) => {
        return debtPayments?.filter(payment => payment.debtId === debtId) || [];
    };

    const getDebtPaymentHistory = (debtId: string) => {
        return paymentHistory?.filter(payment => payment.debtId === debtId) || [];
    };

    const getDebtPendingMatches = (debtId: string) => {
        return pendingMatches?.filter(match => match.debtId === debtId) || [];
    };

    const calculatePayoffTime = (debt: Debt) => {
        if (!debt.minimumPayment || debt.minimumPayment <= 0) return null;
        if (!debt.interestRate) {
            return Math.ceil(debt.currentBalance / debt.minimumPayment);
        }
        
        const monthlyRate = debt.interestRate / 100 / 12;
        const months = Math.log(1 + (debt.currentBalance * monthlyRate) / debt.minimumPayment) / Math.log(1 + monthlyRate);
        return Math.ceil(months);
    };

    const getTotalDebt = () => {
        return debtSummary.totalCurrentDebt;
    };

    // const getDebtByPriority = (priority: string) => {
    //     return debts?.filter(debt => {
    //         const balanceInfo = getDebtBalance(debt.id);
    //         const isActive = balanceInfo ? !balanceInfo.isFullyPaid : debt.status === 'active';
    //         return debt.priority === priority && isActive;
    //     }) || [];
    // }; // TODO: Implement debt priority filtering

    const handleAddDebt = async () => {
        if (!newDebt.name || !newDebt.creditor || !newDebt.currentBalance) return;

        const debt: Debt = {
            id: crypto.randomUUID(),
            name: newDebt.name,
            creditor: newDebt.creditor,
            originalAmount: newDebt.originalAmount || newDebt.currentBalance,
            currentBalance: newDebt.currentBalance,
            interestRate: newDebt.interestRate,
            minimumPayment: newDebt.minimumPayment,
            dueDate: newDebt.dueDate,
            status: 'active',
            priority: newDebt.priority || 'medium',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            description: newDebt.description
        };

        await db.debts.add(debt);
        
        // Create default matching rules for the new debt
        const defaultRules = DebtMatchingService.createDefaultMatchingRules(debt);
        for (const rule of defaultRules) {
            await db.creditorMatchingRules.add(rule);
        }
        
        setNewDebt({
            name: '',
            creditor: '',
            originalAmount: 0,
            currentBalance: 0,
            interestRate: 0,
            minimumPayment: 0,
            status: 'active',
            priority: 'medium'
        });
        setShowAddDebt(false);
    };

    const handlePayment = async (debtId: string, amount: number, principal: number, interest: number) => {
        const debt = debts?.find(d => d.id === debtId);
        if (!debt) return;

        const payment: DebtPayment = {
            id: crypto.randomUUID(),
            debtId,
            amount,
            paymentDate: new Date().toISOString(),
            principal,
            interest,
            created: new Date().toISOString()
        };

        await db.debtPayments.add(payment);
        
        const newBalance = debt.currentBalance - principal;
        await db.debts.update(debtId, {
            currentBalance: Math.max(0, newBalance),
            status: newBalance <= 0 ? 'paid_off' : 'active',
            updated: new Date().toISOString()
        });

        setShowPaymentModal(null);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Summary */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Debt Tracker</h2>
                    <div className="flex space-x-3">
                        <button
                            onClick={syncDebtBalances}
                            disabled={!balancesReady}
                            className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            Sync Balances
                        </button>
                        <button
                            onClick={() => processLatestTransactions(100)}
                            disabled={!isReady}
                            className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Scan Transactions
                        </button>
                        <button
                            onClick={() => setShowAddDebt(true)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        >
                            Add Debt
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-red-600">£{getTotalDebt().toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Current Debt</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">£{debtSummary.totalPaid.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Total Paid</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">{debtSummary.overallProgressPercentage.toFixed(1)}%</p>
                        <p className="text-sm text-gray-600">Overall Progress</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-orange-600">{debtSummary.activeDebts}</p>
                        <p className="text-sm text-gray-600">Active Debts</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-purple-600">{pendingMatches?.length || 0}</p>
                        <p className="text-sm text-gray-600">Pending Matches</p>
                    </div>
                </div>
            </div>

            {/* Debts List */}
            <div className="space-y-4">
                {debts && debts.length > 0 ? (
                    debts.map(debt => {
                        const payments = getDebtPayments(debt.id);
                        const balanceInfo = getDebtBalance(debt.id);
                        const payoffMonths = calculatePayoffTime(debt);
                        
                        // Use calculated balance info if available, otherwise fall back to stored values
                        const currentBalance = balanceInfo?.currentBalance ?? debt.currentBalance;
                        const progressPercentage = balanceInfo?.progressPercentage ?? (
                            debt.originalAmount > 0 
                                ? ((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100 
                                : 0
                        );
                        const totalPaid = balanceInfo?.totalPaid ?? (debt.originalAmount - debt.currentBalance);
                        const isFullyPaid = balanceInfo?.isFullyPaid ?? (debt.status === 'paid_off');

                        const debtPendingMatches = getDebtPendingMatches(debt.id);
                        const debtPaymentHistory = getDebtPaymentHistory(debt.id);

                        return (
                            <div key={debt.id} className="bg-white shadow rounded-lg p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{debt.name}</h3>
                                        <p className="text-sm text-gray-600">{debt.creditor}</p>
                                        {debt.description && (
                                            <p className="text-sm text-gray-500 mt-1">{debt.description}</p>
                                        )}
                                        {debtPendingMatches.length > 0 && (
                                            <div className="mt-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    {debtPendingMatches.length} pending match{debtPendingMatches.length > 1 ? 'es' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(debt.priority)}`}>
                                            {debt.priority.toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            isFullyPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {isFullyPaid ? 'PAID OFF' : 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Current Balance</p>
                                        <p className="text-xl font-bold text-red-600">£{currentBalance.toLocaleString()}</p>
                                        {balanceInfo && Math.abs(currentBalance - debt.currentBalance) > 0.01 && (
                                            <p className="text-xs text-orange-600">
                                                (Stored: £{debt.currentBalance.toLocaleString()})
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Total Paid</p>
                                        <p className="text-lg font-medium text-green-600">£{totalPaid.toLocaleString()}</p>
                                        {balanceInfo && (
                                            <p className="text-xs text-gray-500">
                                                Auto: £{balanceInfo.automaticPayments.toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Original Amount</p>
                                        <p className="text-lg font-medium text-gray-900">£{debt.originalAmount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Interest Rate</p>
                                        <p className="text-lg font-medium text-gray-900">{debt.interestRate?.toFixed(2) || 0}%</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Progress</span>
                                        <span>{progressPercentage.toFixed(1)}% paid off</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progressPercentage}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-600">
                                        {debt.minimumPayment && (
                                            <p>Minimum Payment: £{debt.minimumPayment.toLocaleString()}</p>
                                        )}
                                        {payoffMonths && (
                                            <p>Estimated Payoff: {payoffMonths} months</p>
                                        )}
                                        {debt.dueDate && (
                                            <p>Next Due: {format(new Date(debt.dueDate), 'MMM dd, yyyy')}</p>
                                        )}
                                    </div>
                                    
                                    {!isFullyPaid && (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setShowMatchingManager(debt.id)}
                                                className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 text-sm"
                                            >
                                                Auto Match
                                            </button>
                                            <button
                                                onClick={() => setShowPaymentModal(debt.id)}
                                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                                            >
                                                Make Payment
                                            </button>
                                        </div>
                                    )}
                                    {isFullyPaid && (
                                        <div className="flex items-center text-green-600">
                                            <span className="text-sm font-medium">🎉 Debt Paid Off!</span>
                                        </div>
                                    )}
                                </div>

                                {/* Recent Payments */}
                                {(payments.length > 0 || debtPaymentHistory.length > 0) && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Payments</h4>
                                        <div className="space-y-1">
                                            {/* Show automatic payments first */}
                                            {debtPaymentHistory.slice(0, 2).map(payment => (
                                                <div key={payment.id} className="flex justify-between text-sm text-gray-600">
                                                    <div className="flex items-center space-x-2">
                                                        <span>{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</span>
                                                        <span className="px-1 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                                            Auto
                                                        </span>
                                                    </div>
                                                    <span>£{(payment.amount / 100).toFixed(2)}</span>
                                                </div>
                                            ))}
                                            {/* Show manual payments */}
                                            {payments.slice(0, Math.max(1, 3 - debtPaymentHistory.length)).map(payment => (
                                                <div key={payment.id} className="flex justify-between text-sm text-gray-600">
                                                    <div className="flex items-center space-x-2">
                                                        <span>{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</span>
                                                        <span className="px-1 py-0.5 text-xs bg-gray-100 text-gray-800 rounded">
                                                            Manual
                                                        </span>
                                                    </div>
                                                    <span>£{payment.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white shadow rounded-lg p-8 text-center">
                        <p className="text-gray-500 mb-4">No debts tracked yet</p>
                        <button
                            onClick={() => setShowAddDebt(true)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        >
                            Add Your First Debt
                        </button>
                    </div>
                )}
            </div>

            {/* Add Debt Modal */}
            {showAddDebt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Debt</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Debt Name</label>
                                <input
                                    type="text"
                                    value={newDebt.name || ''}
                                    onChange={(e) => setNewDebt({...newDebt, name: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="e.g., Credit Card, Student Loan"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Creditor</label>
                                <input
                                    type="text"
                                    value={newDebt.creditor || ''}
                                    onChange={(e) => setNewDebt({...newDebt, creditor: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    placeholder="Bank or lender name"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
                                    <input
                                        type="number"
                                        value={newDebt.currentBalance || ''}
                                        onChange={(e) => setNewDebt({...newDebt, currentBalance: parseFloat(e.target.value) || 0})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="0.00"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newDebt.interestRate || ''}
                                        onChange={(e) => setNewDebt({...newDebt, interestRate: parseFloat(e.target.value) || 0})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    value={newDebt.priority || 'medium'}
                                    onChange={(e) => setNewDebt({...newDebt, priority: e.target.value as 'high' | 'medium' | 'low'})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowAddDebt(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddDebt}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            >
                                Add Debt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModal
                    debt={debts?.find(d => d.id === showPaymentModal)!}
                    onPayment={handlePayment}
                    onClose={() => setShowPaymentModal(null)}
                />
            )}

            {/* Creditor Matching Manager */}
            {showMatchingManager && (
                <CreditorMatchingManager
                    debt={debts?.find(d => d.id === showMatchingManager)!}
                    onClose={() => setShowMatchingManager(null)}
                />
            )}

        </div>
    );
};

const PaymentModal: FC<{
    debt: Debt;
    onPayment: (debtId: string, amount: number, principal: number, interest: number) => void;
    onClose: () => void;
}> = ({ debt, onPayment, onClose }) => {
    const [amount, setAmount] = useState(debt.minimumPayment || 0);
    const [notes, setNotes] = useState('');

    const calculateSplit = (paymentAmount: number) => {
        const monthlyInterest = debt.interestRate ? (debt.currentBalance * (debt.interestRate / 100) / 12) : 0;
        const principal = Math.max(0, paymentAmount - monthlyInterest);
        return { principal, interest: monthlyInterest };
    };

    const { principal, interest } = calculateSplit(amount);

    const handleSubmit = () => {
        if (amount > 0) {
            onPayment(debt.id, amount, principal, interest);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Make Payment - {debt.name}
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder="0.00"
                        />
                        {debt.minimumPayment && (
                            <p className="text-xs text-gray-500 mt-1">
                                Minimum payment: £{debt.minimumPayment.toLocaleString()}
                            </p>
                        )}
                    </div>
                    
                    {debt.interestRate && debt.interestRate > 0 && (
                        <div className="bg-gray-50 rounded-md p-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Breakdown</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                    <span>Principal:</span>
                                    <span>£{principal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Interest:</span>
                                    <span>£{interest.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-medium text-gray-900 border-t pt-1">
                                    <span>New Balance:</span>
                                    <span>£{(debt.currentBalance - principal).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            rows={2}
                            placeholder="Payment notes..."
                        />
                    </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={amount <= 0}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Record Payment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DebtTracker;