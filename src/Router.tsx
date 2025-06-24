import { FC } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

// Import layout
import Default from "./layouts/Default";
import  LoggedIn  from "./layouts/LoggedIn";

// Import pages
import Index from "./pages";
import Auth from "./pages/auth/index";
import Display from "./pages/display/index";
import Budget from "./pages/budget/index";
import Settings from "./pages/settings/index";
import PrivacyPolicy from './pages/privacy-policy/index'
import AllowAcces from './pages/allowAccess/index';

const router = createBrowserRouter([
    {
        path: "/",
        element: <Default><Index /></Default>
    },
    {
        path: "privacy-policy",
        element: <Default><PrivacyPolicy /></Default>
    },
    {
        path: "/auth",
        element: <Default><Auth /></Default>
    },
    {
        path: "/allow-access",
        element: <Default><AllowAcces /></Default>
    },
    {
        path: "/display",
        element: <LoggedIn><Display /></LoggedIn>
    },
    {
        path: "/budget",
        element: <LoggedIn><Budget /></LoggedIn>
    },
    {
        path: "/settings",
        element: <LoggedIn><Settings /></LoggedIn>
    }
])

const Router: FC = () => <RouterProvider router={router}/>

export default Router;
