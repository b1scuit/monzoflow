import { Account } from "../../types/Account";
import AccountSelect from "components/Filter/AccountSelect";
import { FC, useEffect, useState } from "react";
import { useDatabase } from "components/DatabaseContext/DatabaseContext";
import { useLiveQuery } from "dexie-react-hooks";

export type Props = {}

const FilterBar: FC<Props> = () => {
    const db = useDatabase()
    const accountsDb = useLiveQuery(() => db.accounts.toArray())
    const [a, setA] = useState<Account[]>([]);

    useEffect(() => {
        if (accountsDb) setA(accountsDb)
    }, [accountsDb])

    return <AccountSelect accounts={accountsDb as Account[]} setAccounts={setA} selectedAccounts={a} />
}

export default FilterBar;