import { useFetch } from "use-http";
import type { Account } from "../../types/Account";
import { useDatabase } from "components/DatabaseContext/DatabaseContext";

export type AccountsResponse = {
    accounts: Account[]
}

export const useAccounts = () => {
    const { get, response } = useFetch<AccountsResponse | undefined>('/accounts')
    const db = useDatabase()

    const retrieveAccounts = () => {
        return get().then(() => {
            if (response.data) {
                return db.accounts.bulkPut(response.data.accounts)
            }
        })
    }

    return {
        retrieveAccounts,
    }
}