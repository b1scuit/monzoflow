import { Account } from "../../types/Account";
import AccountSelect from "components/Filter/AccountSelect";
import { FC, useState } from "react";

export type Props = {}

const FilterBar: FC<Props> = () => {
    const [a, setA ] = useState<Account[]>([]);
    return <div className="flex">
        <div>
            <AccountSelect accounts={a} setAccounts={setA}/>
        </div>
    </div>
}

export default FilterBar;