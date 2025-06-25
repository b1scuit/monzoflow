import Header from "components/Header/Header";
import { FC, ReactElement } from "react";

export const Default: FC<{ children: ReactElement }> = ({ children }): ReactElement => (
    <div className="min-h-full">
        <Header />
        <main>
            <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
    </div>
)

export default Default;
