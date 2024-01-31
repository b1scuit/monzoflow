import { useAccounts } from "components/Monzo/useAccounts";
import { Dispatch, FC, SetStateAction } from "react";
import { Listbox } from '@headlessui/react'
import { Account } from "../../types/Account";

type AccountSelectProps = {
    accounts: Account[]
    setAccounts: Dispatch<SetStateAction<Account[]>>
}

// Gives a way to change the name of a variable coming from a hook
const useAccountData = () => {
    const { accounts } = useAccounts();
    return [accounts]
}

export const AccountSelect: FC<AccountSelectProps> = ({ accounts, setAccounts }) => {
    const [accountData] = useAccountData();
    return <Listbox value={accounts} onChange={setAccounts} multiple>
        <Listbox.Button>
            {accountData.map((account: Account) => account.description).join(', ')}
        </Listbox.Button>
        <Listbox.Options>
            {accountData && accountData.map((account: Account) => (
                <Listbox.Option key={account.id} value={account}>
                    {account.description}
                </Listbox.Option>
            ))}
        </Listbox.Options>
    </Listbox>

}

export default AccountSelect;