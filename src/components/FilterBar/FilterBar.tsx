import { FC, useState } from "react";
import { Listbox } from '@headlessui/react'
import { Account } from "../../types/Account";
import { useAccounts } from "components/Monzo/useAccounts";

export type Props = {}

const FilterBar: FC<Props> = () => {
    const { accounts } = useAccounts();    
    const [selectedAccounts, setSelectedAccounts] = useState<Account[]>(accounts)

    return <div>
        <div>
        </div>
    </div>
}

export default FilterBar;