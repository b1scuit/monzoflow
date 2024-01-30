import { useEffect, useState } from "react";
import { useFetch } from "use-http";

export type WhoAmIRequest = {}

export type WhoAmIResponse = {
    authenticated: true,
    client_id: string,
    user_id: string
}

export const useWhoAmI = () => {
    const { get, response } = useFetch<WhoAmIResponse>('/ping/whoami')
    const [whoami, setWhoAmI] = useState<WhoAmIResponse | undefined>()

    useEffect(() => {
        if (whoami == null) {
            get().then(() => setWhoAmI(response.data))
        }
    })

    const reset = () => setWhoAmI(undefined)

    return {
        whoami,
        reset
    }
}