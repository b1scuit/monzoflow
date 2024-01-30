import { FC } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import App from "./App";

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />
    }
])

const Router: FC = () => <RouterProvider router={router}/>

export default Router;