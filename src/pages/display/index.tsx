import { Chart, Data, Node, Link } from "components/Chart/Chart";
import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import AccountSelect from "components/Filter/AccountSelect";
import FilterBar from "components/FilterBar/FilterBar";
import { useAccounts } from "components/Monzo/useAccounts";
import { useTransactions } from "components/Monzo/useTransactions";
import { TransactionsTable } from "components/TransactionsTable/TransactionsTable";
import { FC, useEffect, useState } from "react";
import { Account, Owners } from "types/Account";
import { Transaction } from "types/Transactions";

const renderName = (account: Account): string => {
    const types = (type: string): string => {
        switch (type) {
            case "uk_retail":
                return "UK Retail"
            case "uk_retail_joint":
                return "UK retail Joint"
            case "uk_monzo_flex":
                return "Monzo Flex"
            case "uk_loan":
                return "UK_Loan"
            case "uk_business":
                return "UK Business account"
            default:
                return "Other"
        }
    }

    const owner = (account: Account): string => {
        if (account.type === "uk_business") {
            return account.description
        }

        return retailOwner(account.owners)
    }

    const retailOwner = (owners: Owners[]): string => {
        if (owners.length !== 0) {
            return owners[0].preferred_name
        }

        return "Unknown"
    } 

    return types(account.type) +":"+ owner(account)
}

export const Index: FC = () => {
    let nodes = new Map<string, Node>()
    let links = new Map<string, Link>()
    let [ chartnodes, setChartNodes] = useState<Node[]>([])
    let [chartLinks, setChartLinks] = useState<Link[]>([])

    const [loading, setLoading] = useState<boolean>(true)
    const db = useDatabase();
    const { retrieveAccounts } = useAccounts();
    const { retrieveTransactions } = useTransactions();


    // Logic: 
    // Count transactions,if more than zero just return those
    // if not, retrieve accounts from the Monzo API and populate the table, then return them
    // From there use the accounts to get and store transactions
    // from there set the transactions into the current state
    // Resolve loading
    const setupFunction = () => {
        db.accounts.count()
        .then((count: number) => {
            return count
        })
        .then((count: number) =>{
            if (count == 0) {
                return retrieveAccounts().then(() => db.accounts.toArray())
            }

            return db.accounts.toArray()
        })
        .then((accounts: Account[]) => {
            accounts.forEach((acc: Account) => nodes.set(acc.id, {id: acc.id, description:renderName(acc)}))
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
        // Process the nodes
        // Process them into state
        .then((transactions: Transaction[]) => {
            console.table(transactions)
            nodes.set("other", {id: "other",description: "Other"})
            transactions.forEach((value: Transaction) => {
                if (value.merchant) {
                    nodes.set(value.merchant.id, {id: value.merchant.id, description: value.merchant.name})

                    if (value.amount > 0) {
                        links.set(`${value.merchant.id}:${value.account_id}`, {
                            source: value.merchant.id,
                            target: value.account_id,
                            value: value.amount 
                        })
                    }

                    if (value.amount < 0 ) {
                        links.set(`${value.merchant.id}:${value.account_id}`, {
                            target: value.merchant.id,
                            source: value.account_id,
                            value: value.amount 
                        })
                    }
                }
            })
        })
        // Add to state
        .then(() => {
            setChartNodes([...nodes.values()])
            setChartLinks([...links.values()])
        }).finally(() => setLoading(false))
    }

    useEffect(() => {
        setupFunction()
        // eslint-disable-next-line
    }, [])


    return (loading) ? <h1>Loading</h1> : <div className="flex flex-col">
        <div className="block m-auto">
            <Chart width={900} height={900} data={{nodes: chartnodes, links: chartLinks}} />
        </div>
    </div>
}

export default Index