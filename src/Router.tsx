import { FC } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

// Import layout
import Default from "./layouts/Default";

// Import pages
import Index from "./pages";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Default><Index /></Default>
    }
])

const Router: FC = () => <RouterProvider router={router}/>

export default Router;