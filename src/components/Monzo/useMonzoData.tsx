import { Account } from "../../types/Account";
import { FC, ReactElement, createContext, useEffect, useState } from "react";


export type MonzoData = {
    accounts: Account[]
}

export const MonzoContext = createContext<MonzoData>({accounts:[]})

export const MonzoProvider: FC<{children: ReactElement}> = ({children}) => {
    const [monzoData, setMonzoData] = useState<MonzoData>({accounts:[]})

    useEffect(() => {}, [])


    return <MonzoContext.Provider value={monzoData}>{children}</MonzoContext.Provider>
}