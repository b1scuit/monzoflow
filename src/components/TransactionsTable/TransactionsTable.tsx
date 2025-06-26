import { FC } from "react";
import { Transaction } from "types/Transactions";
import { format, parseJSON } from 'date-fns'


export const TransactionsTable: FC<{ transactions: Transaction[] }> = ({ transactions }) => (
    <table className="table-auto border">
        <thead>
            <tr>
                {/*<th>ID</th> */}
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
                    {/*<td>{t.id}</td> */}
                    <td>{t.settled && format(parseJSON(t.settled), "dd/MM/yyyy")}</td>
                    <td>{t.counterparty !== undefined ? t.counterparty.name : t.merchant?.name}</td>
                    <td>{t.amount / 100}</td>
                    <td>{t.description}</td>
                    <td>{t.notes}</td>
                </tr>
            ))}
        </tbody>
    </table>
)