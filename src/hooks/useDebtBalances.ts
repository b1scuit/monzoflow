import { useMemo, useCallback } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { DebtBalanceCalculationService, DebtBalanceInfo } from 'services/DebtBalanceCalculationService';
import { Debt } from 'types/Budget';

export const useDebtBalances = () => {
    const db = useDatabase();
    
    const debts = useLiveQuery(() => db.debts.toArray());
    const transactions = useLiveQuery(() => db.transactions.toArray());
    const confirmedMatches = useLiveQuery(() => 
        db.debtTransactionMatches.where('matchStatus').equals('confirmed').toArray()
    );
    const paymentHistory = useLiveQuery(() => db.debtPaymentHistory.toArray());

    // Calculate real-time balance info for all debts
    const debtBalances = useMemo(() => {
        if (!debts || !transactions || !confirmedMatches || !paymentHistory) {
            return new Map<string, DebtBalanceInfo>();
        }

        return DebtBalanceCalculationService.calculateMultipleDebtBalances(
            debts,
            confirmedMatches,
            transactions,
            paymentHistory
        );
    }, [debts, transactions, confirmedMatches, paymentHistory]);

    // Calculate summary statistics
    const debtSummary = useMemo(() => {
        if (!debts || !transactions || !confirmedMatches || !paymentHistory) {
            return {
                totalOriginalDebt: 0,
                totalCurrentDebt: 0,
                totalPaid: 0,
                totalAutomaticPayments: 0,
                totalManualPayments: 0,
                activeDebts: 0,
                paidOffDebts: 0,
                overallProgressPercentage: 0
            };
        }

        return DebtBalanceCalculationService.calculateDebtSummary(
            debts,
            confirmedMatches,
            transactions,
            paymentHistory
        );
    }, [debts, transactions, confirmedMatches, paymentHistory]);

    // Get balance info for a specific debt
    const getDebtBalance = useCallback((debtId: string): DebtBalanceInfo | null => {
        return debtBalances.get(debtId) || null;
    }, [debtBalances]);

    // Get potential unmatched payments for a debt
    const getPotentialPayments = useCallback((debt: Debt) => {
        if (!transactions || !confirmedMatches) return [];
        
        const existingMatches = confirmedMatches.concat(
            // Include pending matches to avoid suggesting them again
            []
        );
        
        return DebtBalanceCalculationService.findPotentialPayments(
            debt,
            transactions,
            existingMatches
        );
    }, [transactions, confirmedMatches]);

    // Calculate payment velocity for a debt
    const getPaymentVelocity = useCallback((debt: Debt) => {
        if (!transactions || !confirmedMatches || !paymentHistory) {
            return {
                averageMonthlyPayment: 0,
                paymentFrequency: 0,
                estimatedPayoffMonths: Infinity
            };
        }

        return DebtBalanceCalculationService.calculatePaymentVelocity(
            debt,
            confirmedMatches,
            transactions,
            paymentHistory
        );
    }, [transactions, confirmedMatches, paymentHistory]);

    // Sync debt balances to database
    const syncDebtBalances = useCallback(async () => {
        if (!debts || !transactions || !confirmedMatches || !paymentHistory) {
            return { updated: 0, unchanged: 0 };
        }

        const updateDebtCallback = async (debtId: string, updates: Partial<Debt>) => {
            await db.debts.update(debtId, updates);
        };

        return DebtBalanceCalculationService.syncDebtBalances(
            debts,
            confirmedMatches,
            transactions,
            paymentHistory,
            updateDebtCallback
        );
    }, [db, debts, transactions, confirmedMatches, paymentHistory]);

    // Check if specific debt needs balance update
    const needsBalanceUpdate = useCallback((debt: Debt): boolean => {
        const balanceInfo = getDebtBalance(debt.id);
        if (!balanceInfo) return false;
        
        return DebtBalanceCalculationService.shouldUpdateDebtBalance(debt, balanceInfo);
    }, [getDebtBalance]);

    return {
        // Balance data
        debtBalances,
        debtSummary,
        getDebtBalance,
        
        // Analysis functions
        getPotentialPayments,
        getPaymentVelocity,
        needsBalanceUpdate,
        
        // Actions
        syncDebtBalances,
        
        // Status
        isReady: !!(debts && transactions && confirmedMatches && paymentHistory)
    };
};

export default useDebtBalances;