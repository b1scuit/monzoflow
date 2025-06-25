import { useEffect, useCallback } from 'react';
import { useDatabase } from 'components/DatabaseContext/DatabaseContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { DebtMatchingService } from 'services/DebtMatchingService';
import { Transaction } from 'types/Transactions';
import { Debt, CreditorMatchingRule, DebtTransactionMatch } from 'types/Budget';

export const useAutomaticDebtMatching = () => {
    const db = useDatabase();
    
    const transactions = useLiveQuery(() => db.transactions.toArray());
    const debts = useLiveQuery(() => db.debts.where('status').equals('active').toArray());
    const rules = useLiveQuery(() => 
        db.creditorMatchingRules.toArray().then(rules => rules.filter(rule => rule.enabled))
    );
    const processedMatches = useLiveQuery(() => db.debtTransactionMatches.toArray());

    const processTransactionForMatching = useCallback(async (
        transaction: Transaction,
        activeDebts: Debt[],
        matchingRules: CreditorMatchingRule[],
        existingMatches: DebtTransactionMatch[]
    ) => {
        // Check if transaction has already been processed
        const alreadyProcessed = existingMatches.some(match => match.transactionId === transaction.id);
        if (alreadyProcessed) {
            return;
        }

        // Only process outgoing transactions (payments)
        if (transaction.amount >= 0) {
            return;
        }

        try {
            const result = await DebtMatchingService.processTransactionForDebtMatching(
                transaction,
                activeDebts,
                matchingRules
            );

            // Store matches in database
            for (const match of result.matches) {
                await db.debtTransactionMatches.add(match);
            }

            // Process auto-confirmed matches
            for (const confirmedMatch of result.autoConfirmed) {
                const debt = activeDebts.find(d => d.id === confirmedMatch.debtId);
                if (debt) {
                    // Create payment history entry
                    const paymentEntry = DebtMatchingService.createPaymentHistoryEntry(
                        confirmedMatch,
                        debt,
                        transaction
                    );
                    await db.debtPaymentHistory.add(paymentEntry);

                    // Update debt balance
                    await db.debts.update(debt.id, {
                        currentBalance: paymentEntry.balanceAfter,
                        status: paymentEntry.balanceAfter <= 0 ? 'paid_off' : 'active',
                        updated: new Date().toISOString()
                    });
                }
            }

            console.log(`Processed transaction ${transaction.id}: ${result.matches.length} matches found (${result.autoConfirmed.length} auto-confirmed)`);
        } catch (error) {
            console.error('Error processing transaction for debt matching:', error);
        }
    }, [db]);

    const processAllTransactions = useCallback(async () => {
        if (!transactions || !debts || !rules || !processedMatches) {
            return;
        }

        console.log('Starting automatic debt matching process...');

        // Get recent unprocessed transactions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentTransactions = transactions
            .filter(t => new Date(t.created) >= thirtyDaysAgo)
            .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

        let processedCount = 0;
        for (const transaction of recentTransactions) {
            await processTransactionForMatching(transaction, debts, rules, processedMatches);
            processedCount++;
        }

        console.log(`Automatic debt matching complete. Processed ${processedCount} transactions.`);
    }, [transactions, debts, rules, processedMatches, processTransactionForMatching]);

    const processLatestTransactions = useCallback(async (count: number = 50) => {
        if (!transactions || !debts || !rules || !processedMatches) {
            return;
        }

        console.log(`Processing latest ${count} transactions for debt matching...`);

        const latestTransactions = transactions
            .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
            .slice(0, count);

        let processedCount = 0;
        for (const transaction of latestTransactions) {
            await processTransactionForMatching(transaction, debts, rules, processedMatches);
            processedCount++;
        }

        console.log(`Latest transactions processing complete. Processed ${processedCount} transactions.`);
    }, [transactions, debts, rules, processedMatches, processTransactionForMatching]);

    // Auto-process when data changes (but throttled)
    useEffect(() => {
        if (!transactions || !debts || !rules || !processedMatches) {
            return;
        }

        // Debounce automatic processing to avoid excessive runs
        const timeoutId = setTimeout(() => {
            // Only process if we have recent transactions that might not be processed
            const recentUnprocessed = transactions
                .filter(t => {
                    const isRecent = new Date(t.created) > new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
                    const isUnprocessed = !processedMatches.some(m => m.transactionId === t.id);
                    return isRecent && isUnprocessed;
                })
                .slice(0, 10); // Limit to prevent excessive processing

            if (recentUnprocessed.length > 0) {
                console.log(`Auto-processing ${recentUnprocessed.length} recent unprocessed transactions`);
                recentUnprocessed.forEach(transaction => {
                    processTransactionForMatching(transaction, debts, rules, processedMatches);
                });
            }
        }, 2000); // 2 second delay

        return () => clearTimeout(timeoutId);
    }, [transactions, debts, rules, processedMatches, processTransactionForMatching]);

    return {
        processAllTransactions,
        processLatestTransactions,
        isReady: !!(transactions && debts && rules && processedMatches)
    };
};

export default useAutomaticDebtMatching;