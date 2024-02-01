import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import FilterBar from "components/FilterBar/FilterBar";
import { useAccounts } from "components/Monzo/useAccounts";
import { useTransactions } from "components/Monzo/useTransactions";
import { TransactionsTable } from "components/TransactionsTable/TransactionsTable";
import { FC, useEffect, useState } from "react";
import { Transaction } from "types/Transactions";

export const Index: FC = () => {
    const [loading, setLoading] = useState<boolean>(true)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const db = useDatabase();
    const { retrieveAccounts } = useAccounts();
    const { retrieveTransactions } = useTransactions();


    // Logic: 
    // Count transactions,if more than zero just return those
    // if not, retrieve accounts from the Monzo API and populate the table, then return them
    // From there use the accounts to get and store transactions
    // from there set the transactions into the current state
    // Resolve loading
    const runCode = () => {
        db.transactions.count().then((c: number) => {
            console.debug("transaction count", c)
            if (c === 0) {
                return db.accounts.count().then((count) => {
                    if (count === 0) {
                        return retrieveAccounts().then(() => db.accounts.toArray())
                    }

                    return db.accounts.toArray()
                }).then((accounts) => {
                    if (accounts) return Promise.all(accounts.map<Promise<any>>((account) => retrieveTransactions(account.id)))
                })
            }
        }).then(() => db.transactions.toArray())
            .then((t) => setTransactions(t))
            .then(() => setLoading(false))
    }

    useEffect(() => {
        runCode()
        // eslint-disable-next-line
    }, [])


    return (loading) ? <h1>Loading</h1> : <div className="flex flex-col">
        <div><FilterBar /></div>
        <div>
            <TransactionsTable transactions={transactions} />
        </div>
    </div>
}

export default Index