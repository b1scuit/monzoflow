import { 
    getClosestWorkday, 
    getLastWorkingDayOfMonth, 
    getMonthlyCycleStartDate, 
    getCurrentMonthlyPeriod, 
    getPastMonthlyPeriods,
    getMonthlyPeriodForDate,
    isDateInPeriod
} from './dateUtils';
import { MonthlyCycleConfig } from '../types/UserPreferences';

describe('dateUtils', () => {
    describe('getClosestWorkday', () => {
        it('should return the same date for weekdays', () => {
            const monday = new Date(2024, 0, 1); // Monday, January 1, 2024
            expect(getClosestWorkday(monday)).toEqual(monday);

            const friday = new Date(2024, 0, 5); // Friday, January 5, 2024
            expect(getClosestWorkday(friday)).toEqual(friday);
        });

        it('should return Friday for Saturday', () => {
            const saturday = new Date(2024, 0, 6); // Saturday, January 6, 2024
            const friday = new Date(2024, 0, 5); // Friday, January 5, 2024
            expect(getClosestWorkday(saturday)).toEqual(friday);
        });

        it('should return Monday for Sunday', () => {
            const sunday = new Date(2024, 0, 7); // Sunday, January 7, 2024
            const monday = new Date(2024, 0, 8); // Monday, January 8, 2024
            expect(getClosestWorkday(sunday)).toEqual(monday);
        });
    });

    describe('getLastWorkingDayOfMonth', () => {
        it('should return the last weekday of the month', () => {
            // January 2024 ends on Wednesday (31st)
            const jan2024 = new Date(2024, 0, 15);
            const result = getLastWorkingDayOfMonth(jan2024);
            expect(result.getDate()).toBe(31);
            expect(result.getDay()).toBe(3); // Wednesday
        });

        it('should skip weekends at month end', () => {
            // February 2025 ends on Friday (28th), but if it ended on Saturday, should return Friday
            const march2025 = new Date(2025, 2, 15); // March 2025 ends on Monday (31st)
            const result = getLastWorkingDayOfMonth(march2025);
            expect(result.getDay()).not.toBe(0); // Not Sunday
            expect(result.getDay()).not.toBe(6); // Not Saturday
        });
    });

    describe('getMonthlyCycleStartDate', () => {
        it('should handle specific_date type', () => {
            const config: MonthlyCycleConfig = { type: 'specific_date', date: 15 };
            const referenceDate = new Date(2024, 0, 20); // January 20, 2024
            const result = getMonthlyCycleStartDate(config, referenceDate);
            
            expect(result.getDate()).toBe(15);
            expect(result.getMonth()).toBe(0); // January
            expect(result.getFullYear()).toBe(2024);
        });

        it('should handle months with fewer days for specific_date', () => {
            const config: MonthlyCycleConfig = { type: 'specific_date', date: 31 };
            const referenceDate = new Date(2024, 1, 15); // February 2024 (leap year, 29 days)
            const result = getMonthlyCycleStartDate(config, referenceDate);
            
            expect(result.getDate()).toBe(29); // Should cap at 29 for February 2024
            expect(result.getMonth()).toBe(1); // February
        });

        it('should handle last_working_day type', () => {
            const config: MonthlyCycleConfig = { type: 'last_working_day' };
            const referenceDate = new Date(2024, 0, 15); // January 2024
            const result = getMonthlyCycleStartDate(config, referenceDate);
            
            expect(result.getDay()).not.toBe(0); // Not Sunday
            expect(result.getDay()).not.toBe(6); // Not Saturday
            expect(result.getMonth()).toBe(0); // January
        });

        it('should handle closest_workday type', () => {
            const config: MonthlyCycleConfig = { type: 'closest_workday', date: 15 };
            const referenceDate = new Date(2024, 0, 20); // January 2024
            const result = getMonthlyCycleStartDate(config, referenceDate);
            
            expect(result.getDay()).not.toBe(0); // Not Sunday
            expect(result.getDay()).not.toBe(6); // Not Saturday
            expect(result.getMonth()).toBe(0); // January
        });

        it('should throw error for invalid config', () => {
            const config: MonthlyCycleConfig = { type: 'specific_date', date: 0 };
            expect(() => getMonthlyCycleStartDate(config)).toThrow('Invalid date for specific_date cycle type');
        });
    });

    describe('getCurrentMonthlyPeriod', () => {
        it('should return current period for specific_date config', () => {
            const config: MonthlyCycleConfig = { type: 'specific_date', date: 1 };
            const referenceDate = new Date(2024, 0, 15); // January 15, 2024
            const period = getCurrentMonthlyPeriod(config, referenceDate);
            
            expect(period.startDate.getDate()).toBe(1);
            expect(period.startDate.getMonth()).toBe(0); // January
            expect(period.endDate.getMonth()).toBe(0); // Should end in January (31st)
            expect(period.displayName).toContain('Jan');
        });

        it('should handle cross-month periods', () => {
            const config: MonthlyCycleConfig = { type: 'specific_date', date: 25 };
            const referenceDate = new Date(2024, 0, 15); // January 15, 2024 (before 25th)
            const period = getCurrentMonthlyPeriod(config, referenceDate);
            
            // Should start from December 25th since we're before January 25th
            expect(period.startDate.getMonth()).toBe(11); // December
            expect(period.startDate.getDate()).toBe(25);
            expect(period.endDate.getMonth()).toBe(0); // January
            expect(period.endDate.getDate()).toBe(24);
        });
    });

    describe('getPastMonthlyPeriods', () => {
        it('should return specified number of periods', () => {
            const config: MonthlyCycleConfig = { type: 'specific_date', date: 1 };
            const periods = getPastMonthlyPeriods(config, 3);
            
            expect(periods).toHaveLength(3);
            expect(periods[0].startDate.getTime()).toBeLessThan(periods[1].startDate.getTime());
            expect(periods[1].startDate.getTime()).toBeLessThan(periods[2].startDate.getTime());
        });

        it('should include current period in results', () => {
            const config: MonthlyCycleConfig = { type: 'specific_date', date: 1 };
            const referenceDate = new Date(2024, 0, 15);
            const periods = getPastMonthlyPeriods(config, 2, referenceDate);
            const currentPeriod = getCurrentMonthlyPeriod(config, referenceDate);
            
            expect(periods).toHaveLength(2);
            expect(periods[periods.length - 1].startDate).toEqual(currentPeriod.startDate);
        });
    });

    describe('getMonthlyPeriodForDate', () => {
        it('should return period containing the given date', () => {
            const config: MonthlyCycleConfig = { type: 'specific_date', date: 15 };
            const targetDate = new Date(2024, 0, 20); // January 20, 2024
            const period = getMonthlyPeriodForDate(config, targetDate);
            
            expect(period.startDate.getDate()).toBe(15);
            expect(period.startDate.getMonth()).toBe(0); // January
            expect(targetDate >= period.startDate && targetDate <= period.endDate).toBe(true);
        });
    });

    describe('isDateInPeriod', () => {
        it('should return true for dates within period', () => {
            const period = {
                startDate: new Date(2024, 0, 1),
                endDate: new Date(2024, 0, 31),
                displayName: 'Test Period'
            };
            
            const dateInPeriod = new Date(2024, 0, 15);
            expect(isDateInPeriod(dateInPeriod, period)).toBe(true);
        });

        it('should return false for dates outside period', () => {
            const period = {
                startDate: new Date(2024, 0, 1),
                endDate: new Date(2024, 0, 31),
                displayName: 'Test Period'
            };
            
            const dateOutsidePeriod = new Date(2024, 1, 15); // February
            expect(isDateInPeriod(dateOutsidePeriod, period)).toBe(false);
        });

        it('should return true for boundary dates', () => {
            const period = {
                startDate: new Date(2024, 0, 1),
                endDate: new Date(2024, 0, 31),
                displayName: 'Test Period'
            };
            
            expect(isDateInPeriod(period.startDate, period)).toBe(true);
            expect(isDateInPeriod(period.endDate, period)).toBe(true);
        });
    });
});