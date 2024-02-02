import { Chart, Data, Node, Link } from "components/Chart/Chart";
import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import FilterBar from "components/FilterBar/FilterBar";
import { useAccounts } from "components/Monzo/useAccounts";
import { useTransactions } from "components/Monzo/useTransactions";
import { FC, useEffect, useState } from "react";
import { Account } from "types/Account";
import { Transaction } from "types/Transactions";

export const Index: FC = () => {
    const [loading, setLoading] = useState<boolean>(true)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const db = useDatabase();
    const { retrieveAccounts } = useAccounts();
    const { retrieveTransactions } = useTransactions();
    const [ nodes, setNodes ] = useState<Node[]>([
        { id: "bob", description:"Bob"},
        { id: "alice", description: "Alice"},
        { id: "carol", description: "Carol" },
        { id: "mel", description: "Mel" },
        { id: "yan", description: "Yan" }
    ])
    const [ links, setLinks ] = useState<Link[]>([
        { source: "bob", target: "carol", value: 4 },
        { source: "alice", target: "carol", value: 3 },
        { source: "alice", target: "yan", value: 1 },
        { source: "carol", target: "mel", value: 6 },
        { source: "carol", target: "yan", value: 1 },
    ])

    // Logic: 
    // Count transactions,if more than zero just return those
    // if not, retrieve accounts from the Monzo API and populate the table, then return them
    // From there use the accounts to get and store transactions
    // from there set the transactions into the current state
    // Resolve loading
    const runCode = () => {
        // Count and get accounts
        db.accounts.count().then((count: number) => {
            if (count === 0 ) {
                return retrieveAccounts().then(() => db.accounts.toArray())
            }

            return db.accounts.toArray()
        })
        // Add accounts to the node graph
        .then((accounts: Account[]) => {
            setNodes([...nodes,  ...accounts])
            return accounts
        })
        // Count transactions and if there are none, go get them
        .then((accounts: Account[]) => {
            return db.transactions.count().then((count) => {
                if (count === 0 ) return Promise.all(accounts.map<Promise<Transaction[]>>((account: Account) =>retrieveTransactions(account.id) ))
            })
        })
        // Retrieve transactions from DB
        .then(() => db.transactions.toArray())
        // Process them into state
        .then((transactions : Transaction[]) => setTransactions(transactions))
        // Finish loading
        .finally(() => setLoading(false))
    }

    useEffect(() => {
        runCode()
        // eslint-disable-next-line
    }, [])

    useEffect(() => console.log(nodes), [nodes])

    return (loading) ? <h1>Loading</h1> : <div className="flex flex-col">
        <div>
            <FilterBar />
        </div>
        <div className="block m-auto">
            <Chart width={600} height={600} data={{nodes: nodes, links: links}} />
        </div>
    </div>
}

export default Index