import { FC, useEffect } from "react";
import { useFetch } from "use-http";



export const Index: FC = () => {
    const { get, loading, error, response } = useFetch('/ping/whoami')

    useEffect(() => {
       get().then((res) => {
        console.log(response)
       }) 
    })

    return <>{JSON.stringify(localStorage.getItem("auth_data"))}</>
}

export default Index