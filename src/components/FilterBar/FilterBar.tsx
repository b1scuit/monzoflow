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
            <Listbox value={selectedAccounts} onChange={setSelectedAccounts} multiple>
                <Listbox.Button>
                    {selectedAccounts.map((account) => account.description).join(', ')}
                </Listbox.Button>
                <Listbox.Options>
                    {accounts && accounts.map((account) => (
                        <Listbox.Option key={account.id} value={account.id}>
                            {account.description}
                        </Listbox.Option>
                    ))}
                </Listbox.Options>
            </Listbox>
        </div>
    </div>
}

export default FilterBar;