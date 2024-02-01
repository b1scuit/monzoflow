import { FC } from "react";

export const EnvironmentFlag: FC = () => <>{process.env.NODE_ENV}</>

export default EnvironmentFlag