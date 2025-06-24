import { DatabaseProvider } from "components/DatabaseContext/DatabaseContext";
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

    if (authData && authData !== "") {
        const authDataObj = JSON.parse(authData as string) as AuthenticationData
        options.headers.Authorization = `${authDataObj.token_type} ${authDataObj.access_token}`
    }

    return <DatabaseProvider>
        <Provider url="https://api.monzo.com" options={options}>
            <LoggedInStyled>{children}</LoggedInStyled>
        </Provider>
    </DatabaseProvider>
}

export const LoggedInStyled: FC<{ children: ReactElement }> = ({ children }) => (
    <div className="min-h-full">
        {/* Removed duplicate header - pages handle their own headers */}
        <main>
            {children}
        </main>
    </div>
)

export default LoggedIn;