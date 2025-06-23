import { ReactElement, createContext, FC, useContext } from "react"
import Dexie, { Table } from 'dexie';
import { Account } from "types/Account";
import { Transaction } from "types/Transactions";
import { Budget, BudgetCategory, Debt, Bill, DebtPayment, BillPayment, BudgetTarget } from "types/Budget";

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
    }
}

export const DatabaseContext = createContext<MySubClassedDexie>(new MySubClassedDexie())
export const DatabaseProvider: FC<{ children: ReactElement }> = ({ children }) => <DatabaseContext.Provider value={new MySubClassedDexie()}>{children}</DatabaseContext.Provider>

export const useDatabase = () => useContext(DatabaseContext);