export interface Account {
    id: string;
    closed: boolean;
    created: string;
    description: string;
    type: string;
    currency: string;
    country_code: string;
    owners: Owners[]
    account_number?: string;
    sort_code?: string;
    payment_details?: PaymentDetails;
    business_id?: string;
}
export interface Owners {
    user_id: string;
    preferred_name: string;
    preferred_first_name: string;
}
export interface PaymentDetails {
    locale_uk: LocaleUk;
    iban: Iban;
}
export interface LocaleUk {
    account_number: string;
    sort_code: string;
}
export interface Iban {
    unformatted: string;
    formatted: string;
    usage_description: string;
    usage_description_web: string;
}
