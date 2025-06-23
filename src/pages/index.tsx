import { FC } from "react";
import {  useNavigate } from "react-router-dom";

const clientId = process.env.REACT_APP_MONZO_CLIENT_ID
const redirectUri = process.env.REACT_APP_MONZO_REDIRECT_URI
const monzoAuthUri = `https://auth.monzo.com/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`

export const Index: FC = () => {
    const navigate = useNavigate()
    const authData = localStorage.getItem("auth_data")

        if (authData && authData !== "") {
            navigate("/display")
        }

    const onClick = () => {
        console.log(monzoAuthUri)
        window.location.href = monzoAuthUri as string
    }

    return <div className="flex flex-col content-center">
        <div className="justify-center">
            <button className="button bg-blue-500 p-5 m-5 shadow-gray-300 rounded-xl border text-white" onClick={onClick} >Login With Monzo</button>
        </div>
        <div className="justify-center">
            <p>Worth pointing out i'm not affiliated with Monzo in anyway (beyond being a customer) I don't ship off any of your data, infact the whole source is available on GitHub</p>
        </div>
    </div>
}

export default Index;