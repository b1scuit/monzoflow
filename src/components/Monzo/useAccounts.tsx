import { useEffect, useState } from "react"
import { useFetch } from "use-http";
import type { Account } from "../../types/Account";
import { access } from "fs";

export type AccountsResponse = {
    accounts: Account[]
}

export const useAccounts = () => {
    const { get, response } = useFetch<AccountsResponse | undefined>('/accounts')
    const [accounts, setAccounts] = useState<Account[]>([])

    useEffect(() => {
        let accountString = localStorage.getItem("accounts")
        if (accountString != null) {
            setAccounts(JSON.parse(accountString))
        }

        if (accounts?.length == 0) {
            get().then(() => {
                if (response.data) {
                    setAccounts(response.data?.accounts)
                }
            })
        }
    })

    useEffect(() => localStorage.setItem("accounts", JSON.stringify(accounts)), [ accounts ] )

    return {
        accounts
    }
}