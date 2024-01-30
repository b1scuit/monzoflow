
export type WhoAmIRequest = {}

export type WhoAmIResponse = {
    authenticated: true,
    client_id: string,
    user_id: string
}

export const useWhoAmI = () => {
    
}