import { FC, useEffect } from "react";
import { redirect, useNavigate } from "react-router-dom";

const clientId = process.env.REACT_APP_MONZO_CLIENT_ID
const redirectUri = process.env.REACT_APP_MONZO_REDIRECT_URI
const monzoAuthUri = `https://auth.monzo.com/?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`

export const Index: FC = () => {
    const navigate = useNavigate()

        if (localStorage.getItem("auth_data") != "") {
            navigate("/display")
        }

    const onClick = () => {
        window.location.href = monzoAuthUri as string
    }

    return <div className="flex justify-center">
        <div>
            <button className="button background-500-blue rounded border" onClick={onClick} >Login With Monzo</button>
        </div>
    </div>
}

export default Index;