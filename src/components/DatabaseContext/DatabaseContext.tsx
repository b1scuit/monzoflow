import { ReactElement, createContext, FC, useContext } from "react"
import Dexie, { Table } from 'dexie';
import { Account } from "types/Account";
import { Transaction } from "types/Transactions";
import { Budget, BudgetCategory, Debt, Bill, DebtPayment, BillPayment, BudgetTarget, CreditorMatchingRule, DebtTransactionMatch, DebtPaymentHistory } from "types/Budget";
import { UserPreferences } from "types/UserPreferences";

export class MySubClassedDexie extends Dexie {
    accounts!: Table<Account>;
    transactions!: Table<Transaction>;
    budgets!: Table<Budget>;
    budgetCategories!: Table<BudgetCategory>;
    debts!: Table<Debt>;
    bills!: Table<Bill>;
    debtPayments!: Table<DebtPayment>;
    billPayments!: Table<BillPayment>;
    budgetTargets!: Table<BudgetTarget>;
    creditorMatchingRules!: Table<CreditorMatchingRule>;
    debtTransactionMatches!: Table<DebtTransactionMatch>;
    debtPaymentHistory!: Table<DebtPaymentHistory>;
    userPreferences!: Table<UserPreferences>;

    constructor() {
        super('monzoflow');
        this.version(1).stores({
            accounts: '++id',
            transactions: '++id, account_id, include_in_spending, amount'
        });
        
        this.version(2).stores({
            accounts: '++id',
            transactions: '++id, account_id, include_in_spending, amount',
            budgets: '++id, year, name',
            budgetCategories: '++id, budgetId, category, name',
            debts: '++id, status, priority, dueDate',
            bills: '++id, status, frequency, nextDueDate, category',
            debtPayments: '++id, debtId, paymentDate',
            billPayments: '++id, billId, paymentDate, status',
            budgetTargets: '++id, budgetId, targetType, status, targetDate'
        });

        this.version(3).stores({
            accounts: '++id',
            transactions: '++id, account_id, include_in_spending, amount',
            budgets: '++id, year, name',
            budgetCategories: '++id, budgetId, category, name',
            debts: '++id, status, priority, dueDate',
            bills: '++id, status, frequency, nextDueDate, category',
            debtPayments: '++id, debtId, paymentDate',
            billPayments: '++id, billId, paymentDate, status',
            budgetTargets: '++id, budgetId, targetType, status, targetDate',
            creditorMatchingRules: '++id, debtId, type, enabled',
            debtTransactionMatches: '++id, transactionId, debtId, matchStatus, matchType',
            debtPaymentHistory: '++id, debtId, transactionId, paymentDate, isAutomatic'
        });

        this.version(4).stores({
            accounts: '++id',
            transactions: '++id, account_id, include_in_spending, amount',
            budgets: '++id, year, name',
            budgetCategories: '++id, budgetId, category, name',
            debts: '++id, status, priority, dueDate',
            bills: '++id, status, frequency, nextDueDate, category',
            debtPayments: '++id, debtId, paymentDate',
            billPayments: '++id, billId, paymentDate, status',
            budgetTargets: '++id, budgetId, targetType, status, targetDate',
            creditorMatchingRules: '++id, debtId, type, enabled',
            debtTransactionMatches: '++id, transactionId, debtId, matchStatus, matchType',
            debtPaymentHistory: '++id, debtId, transactionId, paymentDate, isAutomatic',
            userPreferences: '++id, userId, monthlyCycleType'
        });

        // Add error handling for database version conflicts
        this.on('versionchange', () => {
            console.log('Database version changed, closing connection');
            this.close();
        });

        this.on('blocked', () => {
            console.warn('Database blocked by another connection');
        });

        // Handle database errors more gracefully
        this.on('ready', () => {
            console.log('Database ready, version:', this.verno);
        });
    }

    // Add method to handle database reset if needed
    async resetDatabase() {
        try {
            await this.delete();
            console.log('Database deleted successfully');
            // Re-open the database
            await this.open();
            console.log('Database reopened successfully');
        } catch (error) {
            console.error('Failed to reset database:', error);
            throw error;
        }
    }
}

export const DatabaseContext = createContext<MySubClassedDexie>(new MySubClassedDexie())
export const DatabaseProvider: FC<{ children: ReactElement }> = ({ children }) => <DatabaseContext.Provider value={new MySubClassedDexie()}>{children}</DatabaseContext.Provider>

export const useDatabase = () => useContext(DatabaseContext);