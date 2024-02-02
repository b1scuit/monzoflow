import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import { Transaction } from "../../types/Transactions"
import { useFetch } from "use-http";

type TransactionsResponse = {
    transactions: Transaction[]
}

export const useTransactions = () => {
    const { get } = useFetch<TransactionsResponse | undefined>('/transactions')
    const db = useDatabase()

    const retrieveTransactions = (account_id: string) => {
        return get("?expand[]=merchant&limit=100&since=2023-07-01T00:00:00Z&before=2024-02-01T00:00:00Z&account_id=" + account_id).then((response) => {
            if (response && response.transactions) {
            return db.transactions.bulkPut(response.transactions)
            }
        })
    }

    return {
        retrieveTransactions    
    }
}