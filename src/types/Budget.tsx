export interface Budget {
    id: string;
    name: string;
    description?: string;
    year: number;
    categories: BudgetCategory[];
    created: string;
    updated: string;
}

export interface BudgetCategory {
    id: string;
    name: string;
    budgetId: string;
    allocatedAmount: number;
    spentAmount: number;
    category: string; // Maps to transaction categories
    color: string;
    created: string;
    updated: string;
}

export interface Debt {
    id: string;
    name: string;
    description?: string;
    creditor: string;
    originalAmount: number;
    currentBalance: number;
    interestRate?: number;
    minimumPayment?: number;
    dueDate?: string;
    status: 'active' | 'paid_off' | 'deferred';
    priority: 'high' | 'medium' | 'low';
    created: string;
    updated: string;
}

export interface Bill {
    id: string;
    name: string;
    description?: string;
    payee: string;
    amount: number;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time';
    dueDay?: number; // Day of month/week for recurring bills
    nextDueDate: string;
    category: string;
    status: 'active' | 'paused' | 'cancelled';
    autopay: boolean;
    remindDays?: number; // Days before due date to remind
    created: string;
    updated: string;
}

export interface DebtPayment {
    id: string;
    debtId: string;
    amount: number;
    paymentDate: string;
    principal: number;
    interest: number;
    transactionId?: string; // Link to actual transaction if available
    notes?: string;
    created: string;
}

export interface BillPayment {
    id: string;
    billId: string;
    amount: number;
    paymentDate: string;
    dueDate: string;
    status: 'paid' | 'overdue' | 'scheduled';
    transactionId?: string; // Link to actual transaction if available
    lateFee?: number;
    notes?: string;
    created: string;
}

export interface BudgetTarget {
    id: string;
    budgetId: string;
    targetType: 'debt_payoff' | 'savings' | 'category_limit';
    targetName: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    priority: 'high' | 'medium' | 'low';
    status: 'active' | 'achieved' | 'paused';
    created: string;
    updated: string;
}