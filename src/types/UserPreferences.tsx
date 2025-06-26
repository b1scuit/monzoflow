export interface UserPreferences {
    id: string;
    userId: string;
    monthlyCycleType: 'specific_date' | 'last_working_day' | 'closest_workday';
    monthlyCycleDate?: number; // 1-31 for specific_date, target date for closest_workday
    created: string;
    updated: string;
}

export interface MonthlyCycleConfig {
    type: 'specific_date' | 'last_working_day' | 'closest_workday';
    date?: number; // 1-31 for specific_date, target date for closest_workday
}

export interface MonthlyPeriod {
    startDate: Date;
    endDate: Date;
    displayName: string;
}

export const DEFAULT_MONTHLY_CYCLE: MonthlyCycleConfig = {
    type: 'specific_date',
    date: 1
};