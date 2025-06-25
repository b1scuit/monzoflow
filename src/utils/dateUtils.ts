import { isWeekend, addDays, subDays, endOfMonth, lastDayOfMonth } from 'date-fns';
import { MonthlyCycleConfig, MonthlyPeriod } from '../types/UserPreferences';

export function getClosestWorkday(date: Date): Date {
    if (!isWeekend(date)) {
        return date;
    }
    
    // If it's a weekend, find the closest weekday
    const previousDay = subDays(date, 1);
    const nextDay = addDays(date, 1);
    
    if (!isWeekend(previousDay)) {
        return previousDay;
    }
    
    if (!isWeekend(nextDay)) {
        return nextDay;
    }
    
    // If both previous and next are weekends (shouldn't happen), default to Monday
    return addDays(date, date.getDay() === 6 ? 2 : 1);
}

export function getLastWorkingDayOfMonth(date: Date): Date {
    const lastDay = lastDayOfMonth(date);
    let currentDay = lastDay;
    
    // Go backwards until we find a weekday
    while (isWeekend(currentDay)) {
        currentDay = subDays(currentDay, 1);
    }
    
    return currentDay;
}

export function getMonthlyCycleStartDate(config: MonthlyCycleConfig, referenceDate: Date = new Date()): Date {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    
    switch (config.type) {
        case 'specific_date': {
            if (!config.date || config.date < 1 || config.date > 31) {
                throw new Error('Invalid date for specific_date cycle type');
            }
            
            // Handle months with fewer days
            const monthStart = new Date(year, month, 1);
            const daysInMonth = endOfMonth(monthStart).getDate();
            const targetDate = Math.min(config.date, daysInMonth);
            
            return new Date(year, month, targetDate);
        }
        
        case 'last_working_day': {
            return getLastWorkingDayOfMonth(new Date(year, month, 1));
        }
        
        case 'closest_workday': {
            if (!config.date || config.date < 1 || config.date > 31) {
                throw new Error('Invalid date for closest_workday cycle type');
            }
            
            // Handle months with fewer days
            const monthStart = new Date(year, month, 1);
            const daysInMonth = endOfMonth(monthStart).getDate();
            const targetDate = Math.min(config.date, daysInMonth);
            const targetDateObj = new Date(year, month, targetDate);
            
            return getClosestWorkday(targetDateObj);
        }
        
        default:
            throw new Error(`Unknown monthly cycle type: ${config.type}`);
    }
}

export function getCurrentMonthlyPeriod(config: MonthlyCycleConfig, referenceDate: Date = new Date()): MonthlyPeriod {
    const cycleStartThisMonth = getMonthlyCycleStartDate(config, referenceDate);
    
    // If the reference date is before this month's cycle start, use previous month's cycle
    let periodStart: Date;
    let periodEnd: Date;
    
    if (referenceDate < cycleStartThisMonth) {
        // Use previous month's cycle
        const prevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
        periodStart = getMonthlyCycleStartDate(config, prevMonth);
        periodEnd = subDays(cycleStartThisMonth, 1);
    } else {
        // Use current month's cycle
        const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
        periodStart = cycleStartThisMonth;
        periodEnd = subDays(getMonthlyCycleStartDate(config, nextMonth), 1);
    }
    
    return {
        startDate: periodStart,
        endDate: periodEnd,
        displayName: formatMonthlyPeriodName(periodStart, periodEnd)
    };
}

export function getPastMonthlyPeriods(config: MonthlyCycleConfig, count: number = 12, referenceDate: Date = new Date()): MonthlyPeriod[] {
    const periods: MonthlyPeriod[] = [];
    const currentPeriod = getCurrentMonthlyPeriod(config, referenceDate);
    
    periods.push(currentPeriod);
    
    // Generate previous periods
    let currentDate = subDays(currentPeriod.startDate, 1);
    
    for (let i = 1; i < count; i++) {
        const period = getCurrentMonthlyPeriod(config, currentDate);
        periods.unshift(period);
        currentDate = subDays(period.startDate, 1);
    }
    
    return periods;
}

function formatMonthlyPeriodName(startDate: Date, endDate: Date): string {
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    if (startMonth === endMonth && startYear === endYear) {
        return `${startMonth} ${startYear}`;
    } else if (startYear === endYear) {
        return `${startMonth} - ${endMonth} ${startYear}`;
    } else {
        return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }
}

export function isDateInPeriod(date: Date, period: MonthlyPeriod): boolean {
    return date >= period.startDate && date <= period.endDate;
}

export function getMonthlyPeriodForDate(config: MonthlyCycleConfig, date: Date): MonthlyPeriod {
    return getCurrentMonthlyPeriod(config, date);
}