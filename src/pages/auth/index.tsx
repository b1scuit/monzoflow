import { useApp } from "components/AppContext/context";
import { FC, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Functions, httpsCallable } from 'firebase/functions';
import type { AuthenticationData } from "../../types/AuthenticationData";

// Used for receiving the monzo auth request and authenticating the user
export const Index: FC = () => {
    const [searchParams] = useSearchParams();
    const { functions } = useApp();
    const navigate = useNavigate();

    const swapToken = httpsCallable<{ code: string | null }, AuthenticationData>(functions as Functions, "tokenExchange")

    useEffect(() => {
        swapToken({
            code: searchParams.get("code"),
        }).then((r) => {
            console.log("Authentication data received:", r.data);
            localStorage.setItem("auth_data", JSON.stringify(r.data))
            // Set fresh token timestamp
            localStorage.setItem("tokenTimestamp", Date.now().toString())
            console.log("Fresh token timestamp set during authentication")
        }).then(() => {
            navigate("/allow-access")
        })
    })

    return <>Doing busy things</>
}


export default Index;