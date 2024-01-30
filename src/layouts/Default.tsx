import { FC, ReactElement, ReactNode } from "react";

export const Default: FC<{ children: ReactElement }> = ({ children }): ReactElement => (
    <div className="min-h-full">
        <header className="bg-white shadow">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Monzo Flow</h1>
            </div>
        </header>
        <main>
            <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
    </div>
)

export default Default;
