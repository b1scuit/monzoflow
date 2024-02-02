import { ReactElement, createContext, FC, useContext } from "react"
import Dexie, { Table } from 'dexie';
import { Account } from "types/Account";
import { Transaction } from "types/Transactions";

export class MySubClassedDexie extends Dexie {
    accounts!: Table<Account>;
    transactions!: Table<Transaction>;

    constructor() {
        super('monzoflow');
        this.version(1).stores({
            accounts: '++id', // Primary key and indexed props
            transactions: '++id, account_id, include_in_spending, amount'
        });
    }
}

export const DatabaseContext = createContext<MySubClassedDexie>(new MySubClassedDexie())
export const DatabaseProvider: FC<{ children: ReactElement }> = ({ children }) => <DatabaseContext.Provider value={new MySubClassedDexie()}>{children}</DatabaseContext.Provider>

export const useDatabase = () => useContext(DatabaseContext);