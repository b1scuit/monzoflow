import { AuthenticationData } from "../types/AuthenticationData";
import { FC, ReactElement } from "react";
import { Provider } from "use-http";

export const LoggedIn: FC<{ children: ReactElement }> = ({ children }) => {
    const authData = localStorage.getItem("auth_data")
    const options = {
        headers: {
            Accept: 'application/json',
            Authorization: ""
          }
    }

    if (authData != "") {
        const authDataObj = JSON.parse(authData as string) as AuthenticationData
        options.headers.Authorization = `${authDataObj.token_type} ${authDataObj.access_token}`
    }

    return <Provider url="https://api.monzo.com" options={options}><LoggedInStyled>{children}</LoggedInStyled></Provider>
}

export const LoggedInStyled: FC<{ children: ReactElement }> = ({ children }) => (
    <div className="min-h-full">
        <header className="bg-white shadow">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Monzo Flow (Logged In)</h1>
            </div>
        </header>
        <main>
            <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
    </div>
)

export default LoggedIn;