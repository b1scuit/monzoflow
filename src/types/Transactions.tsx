
export interface Transaction {
    account_id: string;
    amount: number;
    amount_is_pending: boolean;
    atm_fees_detailed?: null;
    attachments?: null;
    can_add_to_tab: boolean;
    can_be_excluded_from_breakdown: boolean;
    can_be_made_subscription: boolean;
    can_match_transactions_in_categorization: boolean;
    can_split_the_bill: boolean;
    categories: Categories;
    category: string;
    counterparty?: Counterparty;
    created: string;
    currency: string;
    dedupe_id: string;
    description: string;
    fees: CounterpartyOrFees;
    id: string;
    include_in_spending: boolean;
    international?: null;
    is_load: boolean;
    labels?: null;
    local_amount: number;
    local_currency: string;
    merchant?: Merchant;
    merchant_feedback_uri: string;
    metadata: Metadata;
    notes: string;
    originator: boolean;
    parent_account_id: string;
    scheme: string;
    settled: string;
    updated: string;
    user_id: string;
    decline_reason?: string | null;
}
export interface Categories {
    transfers?: number | null;
    general?: number | null;
    transport?: number | null;
    shopping?: number | null;
    bills?: number | null;
    expenses?: number | null;
    entertainment?: number | null;
}
export interface Counterparty {
    account_id?: string | null;
    name?: string | null;
    preferred_name?: string | null;
    user_id?: string | null;
    account_number?: string | null;
    service_user_number?: string | null;
    sort_code?: string | null;
}
export interface CounterpartyOrFees {
}
export interface Metadata {
    external_id?: string | null;
    ledger_committed_timestamp_earliest?: string | null;
    ledger_committed_timestamp_latest?: string | null;
    ledger_insertion_id?: string | null;
    move_money_transfer_id?: string | null;
    pot_account_id?: string | null;
    pot_id?: string | null;
    pot_withdrawal_id?: string | null;
    trigger?: string | null;
    user_id?: string | null;
    outbound_payment_trace_id?: string | null;
    p2p_initiator?: string | null;
    p2p_is_to_self?: string | null;
    p2p_transfer_id?: string | null;
    payee_id?: string | null;
    collection_id?: string | null;
    notes?: string | null;
    overdraft_days_overdrawn?: string | null;
    overdraft_fee?: string | null;
    overdraft_month?: string | null;
    triggered_by?: string | null;
    monzo_flex_id?: string | null;
    exclude_from_breakdown?: string | null;
    flex_transaction_type?: string | null;
    ledger_entry_intent?: string | null;
    repayment_receipt_id?: string | null;
    pot_deposit_id?: string | null;
    auth_account_id?: string | null;
    card_acceptor_contact_number?: string | null;
    hide_amount?: string | null;
    hide_transaction?: string | null;
    mastercard_auth_message_id?: string | null;
    mastercard_card_id?: string | null;
    mastercard_lifecycle_id?: string | null;
    mcc?: string | null;
    standin_correlation_id?: string | null;
    backing_loan_id?: string | null;
    mastercard_approval_type?: string | null;
    mastercard_clearing_message_id?: string | null;
    original_transaction_id?: string | null;
    bacs_direct_debit_instruction_id?: string | null;
    bacs_payment_id?: string | null;
    bacs_record_id?: string | null;
    bills_pot_id?: string | null;
    subscription_id?: string | null;
}

export interface Merchant {
    id: string;
    group_id: string;
    name: string;
    logo: string;
    emoji: string;
    category: string;
    online: boolean;
    atm: boolean;
    address: Address;
    disable_feedback: boolean;
    suggested_tags: string;
    metadata: Metadata;
  }
  export interface Address {
    short_formatted: string;
    city: string;
    latitude: number;
    longitude: number;
    zoom_level: number;
    approximate: boolean;
    formatted: string;
    address: string;
    region: string;
    country: string;
    postcode: string;
  }
  export interface Metadata {
    suggested_tags: string;
    website: string;
  }
  