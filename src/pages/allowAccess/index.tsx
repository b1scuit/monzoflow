import { FC } from "react";
import { useNavigate } from "react-router";


export const Index: FC = () => {
    const navigate = useNavigate()

    const onClick = () => {
        navigate("/display")
    }

    return <div>
        <div>
            <p>Please go into your Monzo app and click the "Allow access to Monzo Flow" and then "Allow"</p>
        </div>
        <div>
            <button onClick={onClick}>I've done that</button>
        </div>
    </div>
}

export default Index;