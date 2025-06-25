import { FC, useState, useEffect } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { Debt, CreditorMatchingRule, DebtTransactionMatch } from 'types/Budget';
import { Transaction } from 'types/Transactions';
import { useLiveQuery } from 'dexie-react-hooks';
import { DebtMatchingService } from 'services/DebtMatchingService';
import { format } from 'date-fns';

interface CreditorMatchingManagerProps {
    debt: Debt;
    onClose: () => void;
}

export const CreditorMatchingManager: FC<CreditorMatchingManagerProps> = ({ debt, onClose }) => {
    const db = useDatabase();
    const [activeTab, setActiveTab] = useState<'rules' | 'matches' | 'history'>('rules');
    const [showAddRule, setShowAddRule] = useState(false);
    const [newRule, setNewRule] = useState<Partial<CreditorMatchingRule>>({
        type: 'exact',
        field: 'merchant_name',
        value: '',
        confidenceThreshold: 85,
        enabled: true
    });

    const rules = useLiveQuery(() => 
        db.creditorMatchingRules.where('debtId').equals(debt.id).toArray()
    );

    const pendingMatches = useLiveQuery(() => 
        db.debtTransactionMatches
            .where('debtId').equals(debt.id)
            .and(match => match.matchStatus === 'pending')
            .toArray()
    );

    const confirmedMatches = useLiveQuery(() => 
        db.debtTransactionMatches
            .where('debtId').equals(debt.id)
            .and(match => match.matchStatus === 'confirmed')
            .toArray()
    );

    const transactions = useLiveQuery(() => db.transactions.toArray());

    // Auto-create default rules if none exist
    useEffect(() => {
        if (rules && rules.length === 0 && debt.creditor) {
            const defaultRules = DebtMatchingService.createDefaultMatchingRules(debt);
            defaultRules.forEach(rule => {
                db.creditorMatchingRules.add(rule);
            });
        }
    }, [rules, debt, db]);

    const handleAddRule = async () => {
        if (!newRule.value?.trim()) return;

        const rule: CreditorMatchingRule = {
            id: crypto.randomUUID(),
            debtId: debt.id,
            type: newRule.type || 'exact',
            field: newRule.field || 'merchant_name',
            value: newRule.value.trim(),
            pattern: newRule.type === 'pattern' ? newRule.value.trim() : undefined,
            confidenceThreshold: newRule.confidenceThreshold || 85,
            enabled: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        await db.creditorMatchingRules.add(rule);
        setNewRule({
            type: 'exact',
            field: 'merchant_name',
            value: '',
            confidenceThreshold: 85,
            enabled: true
        });
        setShowAddRule(false);
    };

    const handleToggleRule = async (ruleId: string, enabled: boolean) => {
        await db.creditorMatchingRules.update(ruleId, { 
            enabled,
            updated: new Date().toISOString()
        });
    };

    const handleDeleteRule = async (ruleId: string) => {
        await db.creditorMatchingRules.delete(ruleId);
    };

    const handleConfirmMatch = async (match: DebtTransactionMatch) => {
        await db.debtTransactionMatches.update(match.id, {
            matchStatus: 'confirmed',
            reviewedAt: new Date().toISOString(),
            updated: new Date().toISOString()
        });

        // Create payment history entry and update debt balance
        const transaction = transactions?.find(t => t.id === match.transactionId);
        if (transaction) {
            const paymentEntry = DebtMatchingService.createPaymentHistoryEntry(match, debt, transaction);
            await db.debtPaymentHistory.add(paymentEntry);

            // Update debt balance
            await db.debts.update(debt.id, {
                currentBalance: paymentEntry.balanceAfter,
                status: paymentEntry.balanceAfter <= 0 ? 'paid_off' : 'active',
                updated: new Date().toISOString()
            });
        }
    };

    const handleRejectMatch = async (matchId: string) => {
        await db.debtTransactionMatches.update(matchId, {
            matchStatus: 'rejected',
            reviewedAt: new Date().toISOString(),
            updated: new Date().toISOString()
        });
    };

    const getTransactionForMatch = (transactionId: string) => {
        return transactions?.find(t => t.id === transactionId);
    };

    const testRulesAgainstTransactions = async () => {
        if (!transactions || !rules) return;

        const recentTransactions = transactions
            .filter(t => t.amount < 0) // Only outgoing transactions
            .slice(0, 100); // Last 100 transactions

        for (const transaction of recentTransactions) {
            const matches = DebtMatchingService.findDebtMatches(
                transaction,
                [debt],
                rules
            );

            for (const match of matches) {
                // Check if match already exists
                const existingMatch = await db.debtTransactionMatches
                    .where('transactionId').equals(transaction.id)
                    .and(m => m.debtId === debt.id)
                    .first();

                if (!existingMatch) {
                    const transactionMatch: DebtTransactionMatch = {
                        id: crypto.randomUUID(),
                        transactionId: transaction.id,
                        debtId: match.debtId,
                        ruleId: match.ruleId,
                        matchConfidence: match.confidence,
                        matchStatus: match.confidence >= 90 ? 'confirmed' : 'pending',
                        matchType: 'automatic',
                        matchedField: match.matchedField,
                        matchedValue: match.matchedValue,
                        created: new Date().toISOString(),
                        updated: new Date().toISOString()
                    };

                    await db.debtTransactionMatches.add(transactionMatch);
                }
            }
        }
    };

    const getRuleTypeLabel = (type: string) => {
        switch (type) {
            case 'exact': return 'Exact Match';
            case 'fuzzy': return 'Fuzzy Match';
            case 'pattern': return 'Pattern Match';
            case 'account': return 'Account Match';
            default: return type;
        }
    };

    const getFieldLabel = (field: string) => {
        switch (field) {
            case 'merchant_name': return 'Merchant Name';
            case 'counterparty_name': return 'Counterparty Name';
            case 'description': return 'Description';
            case 'account_number': return 'Account Number';
            default: return field;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Automatic Payment Matching - {debt.name}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="mt-4 flex space-x-4">
                        <button
                            onClick={() => setActiveTab('rules')}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                                activeTab === 'rules' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Matching Rules ({rules?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('matches')}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                                activeTab === 'matches' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Pending Matches ({pendingMatches?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                                activeTab === 'history' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Payment History ({confirmedMatches?.length || 0})
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {activeTab === 'rules' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600">
                                    Configure rules to automatically detect payments to {debt.creditor}
                                </p>
                                <div className="space-x-2">
                                    <button
                                        onClick={testRulesAgainstTransactions}
                                        className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                                    >
                                        Test Rules
                                    </button>
                                    <button
                                        onClick={() => setShowAddRule(true)}
                                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                                    >
                                        Add Rule
                                    </button>
                                </div>
                            </div>

                            {rules && rules.length > 0 ? (
                                <div className="space-y-3">
                                    {rules.map(rule => (
                                        <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {getRuleTypeLabel(rule.type)}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            on {getFieldLabel(rule.field)}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                            rule.enabled 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            {rule.enabled ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded">
                                                        {rule.value}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Confidence threshold: {rule.confidenceThreshold}%
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2 ml-4">
                                                    <button
                                                        onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                                                        className={`px-2 py-1 rounded text-xs ${
                                                            rule.enabled 
                                                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                        }`}
                                                    >
                                                        {rule.enabled ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    No matching rules configured. Add a rule to get started.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'matches' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Review potential payment matches that require confirmation
                            </p>

                            {pendingMatches && pendingMatches.length > 0 ? (
                                <div className="space-y-3">
                                    {pendingMatches.map(match => {
                                        const transaction = getTransactionForMatch(match.transactionId);
                                        if (!transaction) return null;

                                        return (
                                            <div key={match.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-2">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                £{Math.abs(transaction.amount / 100).toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {format(new Date(transaction.created), 'MMM dd, yyyy')}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                                match.matchConfidence >= 90 
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : match.matchConfidence >= 70
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {match.matchConfidence}% confidence
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700">
                                                            <strong>Description:</strong> {transaction.description}
                                                        </p>
                                                        {transaction.merchant?.name && (
                                                            <p className="text-sm text-gray-700">
                                                                <strong>Merchant:</strong> {transaction.merchant.name}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Matched on: {getFieldLabel(match.matchedField)} = "{match.matchedValue}"
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-2 ml-4">
                                                        <button
                                                            onClick={() => handleConfirmMatch(match)}
                                                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectMatch(match.id)}
                                                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    No pending matches. Check back after new transactions are imported.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Automatically confirmed payment matches
                            </p>

                            {confirmedMatches && confirmedMatches.length > 0 ? (
                                <div className="space-y-3">
                                    {confirmedMatches.map(match => {
                                        const transaction = getTransactionForMatch(match.transactionId);
                                        if (!transaction) return null;

                                        return (
                                            <div key={match.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-2">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                £{Math.abs(transaction.amount / 100).toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {format(new Date(transaction.created), 'MMM dd, yyyy')}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                                                {match.matchType === 'automatic' ? 'Auto' : 'Manual'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700">{transaction.description}</p>
                                                        {transaction.merchant?.name && (
                                                            <p className="text-xs text-gray-500">
                                                                Merchant: {transaction.merchant.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    No confirmed matches yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Rule Modal */}
                {showAddRule && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Matching Rule</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Match Type</label>
                                    <select
                                        value={newRule.type}
                                        onChange={(e) => setNewRule({...newRule, type: e.target.value as any})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="exact">Exact Match</option>
                                        <option value="fuzzy">Fuzzy Match</option>
                                        <option value="pattern">Pattern Match (Regex)</option>
                                        <option value="account">Account Number</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Field to Match</label>
                                    <select
                                        value={newRule.field}
                                        onChange={(e) => setNewRule({...newRule, field: e.target.value as any})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="merchant_name">Merchant Name</option>
                                        <option value="counterparty_name">Counterparty Name</option>
                                        <option value="description">Transaction Description</option>
                                        <option value="account_number">Account Number</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {newRule.type === 'pattern' ? 'Pattern (Regex)' : 'Value to Match'}
                                    </label>
                                    <input
                                        type="text"
                                        value={newRule.value || ''}
                                        onChange={(e) => setNewRule({...newRule, value: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder={
                                            newRule.type === 'pattern' 
                                                ? '.*payment.*|.*card.*'
                                                : debt.creditor
                                        }
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Confidence Threshold (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newRule.confidenceThreshold || 85}
                                        onChange={(e) => setNewRule({...newRule, confidenceThreshold: parseInt(e.target.value) || 85})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowAddRule(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddRule}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                >
                                    Add Rule
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};