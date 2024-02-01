import { FC } from "react";
import { Transaction } from "types/Transactions";


export const TransactionsTable: FC<{ transactions: Transaction[] }> = ({ transactions }) => (
    <table className="table border">
        <thead>
            <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Counterparty</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            {transactions.map((t: Transaction) => (
                <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.settled}</td>
                    <td>{t.counterparty != undefined ? t.counterparty.name : t.merchant}</td>
                    <td>{t.amount / 100}</td>
                    <td>{t.description}</td>
                    <td>{t.notes}</td>
                </tr>
            ))}
        </tbody>
    </table>
)