import { Debt, DebtPaymentHistory, DebtTransactionMatch } from 'types/Budget';
import { Transaction } from 'types/Transactions';

export interface DebtBalanceInfo {
    originalAmount: number;
    currentBalance: number;
    totalPaid: number;
    progressPercentage: number;
    automaticPayments: number;
    manualPayments: number;
    lastPaymentDate?: string;
    isFullyPaid: boolean;
}

export class DebtBalanceCalculationService {
    /**
     * Calculate the actual current balance for a debt based on matched transactions
     */
    static calculateActualDebtBalance(
        debt: Debt,
        confirmedMatches: DebtTransactionMatch[],
        transactions: Transaction[],
        paymentHistory: DebtPaymentHistory[]
    ): DebtBalanceInfo {
        let currentBalance = debt.originalAmount;
        let totalPaid = 0;
        let automaticPayments = 0;
        let manualPayments = 0;
        let lastPaymentDate: string | undefined;

        // Process confirmed automatic payments from transaction matches
        const debtConfirmedMatches = confirmedMatches.filter(match => match.debtId === debt.id);
        
        for (const match of debtConfirmedMatches) {
            const transaction = transactions.find(t => t.id === match.transactionId);
            if (transaction && transaction.amount < 0) { // Outgoing payment
                const paymentAmount = Math.abs(transaction.amount) / 100; // Convert from pence
                totalPaid += paymentAmount;
                automaticPayments += paymentAmount;
                
                if (!lastPaymentDate || transaction.created > lastPaymentDate) {
                    lastPaymentDate = transaction.created;
                }
            }
        }

        // Process payment history for confirmed matches (to avoid double counting)
        const debtPaymentHistory = paymentHistory.filter(payment => payment.debtId === debt.id);
        for (const payment of debtPaymentHistory) {
            const paymentAmount = payment.amount / 100; // Convert from pence
            
            // Check if this payment is already counted in automatic payments
            const isAlreadyCounted = debtConfirmedMatches.some(match => 
                match.transactionId === payment.transactionId
            );
            
            if (!isAlreadyCounted) {
                totalPaid += paymentAmount;
                if (payment.isAutomatic) {
                    automaticPayments += paymentAmount;
                } else {
                    manualPayments += paymentAmount;
                }
                
                if (!lastPaymentDate || payment.paymentDate > lastPaymentDate) {
                    lastPaymentDate = payment.paymentDate;
                }
            }
        }

        // Calculate current balance
        currentBalance = Math.max(0, debt.originalAmount - totalPaid);
        
        // Calculate progress percentage
        const progressPercentage = debt.originalAmount > 0 
            ? (totalPaid / debt.originalAmount) * 100 
            : 0;

        return {
            originalAmount: debt.originalAmount,
            currentBalance,
            totalPaid,
            progressPercentage: Math.min(100, progressPercentage),
            automaticPayments,
            manualPayments,
            lastPaymentDate,
            isFullyPaid: currentBalance === 0
        };
    }

    /**
     * Calculate balance info for multiple debts efficiently
     */
    static calculateMultipleDebtBalances(
        debts: Debt[],
        confirmedMatches: DebtTransactionMatch[],
        transactions: Transaction[],
        paymentHistory: DebtPaymentHistory[]
    ): Map<string, DebtBalanceInfo> {
        const balanceMap = new Map<string, DebtBalanceInfo>();

        debts.forEach(debt => {
            const balanceInfo = this.calculateActualDebtBalance(
                debt,
                confirmedMatches,
                transactions,
                paymentHistory
            );
            balanceMap.set(debt.id, balanceInfo);
        });

        return balanceMap;
    }

    /**
     * Get summary statistics for all debts
     */
    static calculateDebtSummary(
        debts: Debt[],
        confirmedMatches: DebtTransactionMatch[],
        transactions: Transaction[],
        paymentHistory: DebtPaymentHistory[]
    ): {
        totalOriginalDebt: number;
        totalCurrentDebt: number;
        totalPaid: number;
        totalAutomaticPayments: number;
        totalManualPayments: number;
        activeDebts: number;
        paidOffDebts: number;
        overallProgressPercentage: number;
    } {
        const balanceMap = this.calculateMultipleDebtBalances(
            debts,
            confirmedMatches,
            transactions,
            paymentHistory
        );

        let totalOriginalDebt = 0;
        let totalCurrentDebt = 0;
        let totalPaid = 0;
        let totalAutomaticPayments = 0;
        let totalManualPayments = 0;
        let activeDebts = 0;
        let paidOffDebts = 0;

        debts.forEach(debt => {
            const balanceInfo = balanceMap.get(debt.id);
            if (balanceInfo) {
                totalOriginalDebt += balanceInfo.originalAmount;
                totalCurrentDebt += balanceInfo.currentBalance;
                totalPaid += balanceInfo.totalPaid;
                totalAutomaticPayments += balanceInfo.automaticPayments;
                totalManualPayments += balanceInfo.manualPayments;

                if (balanceInfo.isFullyPaid) {
                    paidOffDebts++;
                } else {
                    activeDebts++;
                }
            }
        });

        const overallProgressPercentage = totalOriginalDebt > 0 
            ? (totalPaid / totalOriginalDebt) * 100 
            : 0;

        return {
            totalOriginalDebt,
            totalCurrentDebt,
            totalPaid,
            totalAutomaticPayments,
            totalManualPayments,
            activeDebts,
            paidOffDebts,
            overallProgressPercentage: Math.min(100, overallProgressPercentage)
        };
    }

    /**
     * Check if debt balance needs to be updated in database
     */
    static shouldUpdateDebtBalance(debt: Debt, calculatedBalance: DebtBalanceInfo): boolean {
        const currentStoredBalance = debt.currentBalance;
        const calculatedCurrentBalance = calculatedBalance.currentBalance;
        
        // Update if there's a significant difference (more than £0.01)
        const difference = Math.abs(currentStoredBalance - calculatedCurrentBalance);
        return difference > 0.01;
    }

    /**
     * Get potential payment transactions that haven't been matched yet
     */
    static findPotentialPayments(
        debt: Debt,
        transactions: Transaction[],
        existingMatches: DebtTransactionMatch[]
    ): Transaction[] {
        const matchedTransactionIds = new Set(
            existingMatches
                .filter(match => match.debtId === debt.id)
                .map(match => match.transactionId)
        );

        return transactions.filter(transaction => {
            // Only consider outgoing transactions (payments)
            if (transaction.amount >= 0) return false;
            
            // Skip already matched transactions
            if (matchedTransactionIds.has(transaction.id)) return false;
            
            // Look for potential creditor matches in description or merchant
            const creditorName = debt.creditor.toLowerCase();
            const description = transaction.description?.toLowerCase() || '';
            const merchantName = transaction.merchant?.name?.toLowerCase() || '';
            const counterpartyName = transaction.counterparty?.name?.toLowerCase() || '';
            
            // Simple heuristic matching
            return description.includes(creditorName) || 
                   merchantName.includes(creditorName) || 
                   counterpartyName.includes(creditorName) ||
                   creditorName.includes(merchantName) ||
                   creditorName.includes(counterpartyName);
        });
    }

    /**
     * Auto-sync debt balances by updating the debt records with calculated balances
     */
    static async syncDebtBalances(
        debts: Debt[],
        confirmedMatches: DebtTransactionMatch[],
        transactions: Transaction[],
        paymentHistory: DebtPaymentHistory[],
        updateDebtCallback: (debtId: string, updates: Partial<Debt>) => Promise<void>
    ): Promise<{ updated: number; unchanged: number }> {
        let updated = 0;
        let unchanged = 0;

        const balanceMap = this.calculateMultipleDebtBalances(
            debts,
            confirmedMatches,
            transactions,
            paymentHistory
        );

        for (const debt of debts) {
            const balanceInfo = balanceMap.get(debt.id);
            if (balanceInfo && this.shouldUpdateDebtBalance(debt, balanceInfo)) {
                await updateDebtCallback(debt.id, {
                    currentBalance: balanceInfo.currentBalance,
                    status: balanceInfo.isFullyPaid ? 'paid_off' : 'active',
                    updated: new Date().toISOString()
                });
                updated++;
            } else {
                unchanged++;
            }
        }

        return { updated, unchanged };
    }

    /**
     * Calculate payment velocity (average payment per month)
     */
    static calculatePaymentVelocity(
        debt: Debt,
        confirmedMatches: DebtTransactionMatch[],
        transactions: Transaction[],
        paymentHistory: DebtPaymentHistory[]
    ): {
        averageMonthlyPayment: number;
        paymentFrequency: number; // payments per month
        estimatedPayoffMonths: number;
    } {
        const balanceInfo = this.calculateActualDebtBalance(
            debt,
            confirmedMatches,
            transactions,
            paymentHistory
        );

        // Get all payment dates
        const paymentDates: Date[] = [];
        
        // From confirmed matches
        confirmedMatches
            .filter(match => match.debtId === debt.id && match.matchStatus === 'confirmed')
            .forEach(match => {
                const transaction = transactions.find(t => t.id === match.transactionId);
                if (transaction) {
                    paymentDates.push(new Date(transaction.created));
                }
            });

        // From payment history
        paymentHistory
            .filter(payment => payment.debtId === debt.id)
            .forEach(payment => {
                paymentDates.push(new Date(payment.paymentDate));
            });

        if (paymentDates.length === 0) {
            return {
                averageMonthlyPayment: 0,
                paymentFrequency: 0,
                estimatedPayoffMonths: Infinity
            };
        }

        // Sort dates
        paymentDates.sort((a, b) => a.getTime() - b.getTime());
        
        // Calculate time span in months
        const firstPayment = paymentDates[0];
        const lastPayment = paymentDates[paymentDates.length - 1];
        const monthsSpan = Math.max(1, 
            (lastPayment.getTime() - firstPayment.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        );

        const averageMonthlyPayment = balanceInfo.totalPaid / monthsSpan;
        const paymentFrequency = paymentDates.length / monthsSpan;
        
        const estimatedPayoffMonths = averageMonthlyPayment > 0 
            ? balanceInfo.currentBalance / averageMonthlyPayment 
            : Infinity;

        return {
            averageMonthlyPayment,
            paymentFrequency,
            estimatedPayoffMonths
        };
    }
}