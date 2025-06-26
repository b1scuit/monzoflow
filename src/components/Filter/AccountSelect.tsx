import { Dispatch, FC, SetStateAction } from "react";
import { Listbox } from '@headlessui/react'
import { Account, Owners } from "../../types/Account";

type AccountSelectProps = {
    selectedAccounts: Account[]
    accounts: Account[]
    setAccounts: Dispatch<SetStateAction<Account[]>>
}

// Gives a way to change the name of a variable coming from a hook
export const AccountSelect: FC<AccountSelectProps> = ({selectedAccounts, accounts, setAccounts }) => {

    return <div className="relative">
        <Listbox value={selectedAccounts} onChange={setAccounts} multiple>
            <Listbox.Button className="w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                {selectedAccounts.map((account: Account) => renderName(account)).join(', ')}
            </Listbox.Button>
            <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {accounts && accounts.map((account: Account) => (
                    <Listbox.Option key={account.id} value={account} className='relative cursor-default select-none py-2 pl-10 pr-4 bg-amber-100 text-amber-900'>
                        {({ active, selected }) => (
                            <li className={`${active ? 'bg-blue-500 text-white' : 'bg-white text-black'}`}>
                                {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">X</span>
                                ) : null}
                                {renderName(account)}
                            </li>
                        )}
                    </Listbox.Option>
                ))}
            </Listbox.Options>
        </Listbox>
    </div>
}

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

export default AccountSelect;