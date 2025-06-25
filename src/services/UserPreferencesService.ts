import { UserPreferences, MonthlyCycleConfig, DEFAULT_MONTHLY_CYCLE } from '../types/UserPreferences';
import { MySubClassedDexie } from '../components/DatabaseContext/DatabaseContext';

export class UserPreferencesService {
    private db: MySubClassedDexie;
    private readonly DEFAULT_USER_ID = 'default'; // Single user system for now

    constructor(database: MySubClassedDexie) {
        this.db = database;
    }

    async getUserPreferences(): Promise<UserPreferences> {
        try {
            const preferences = await this.db.userPreferences
                .where('userId')
                .equals(this.DEFAULT_USER_ID)
                .first();

            if (preferences) {
                return preferences;
            } else {
                // Create default preferences if none exist
                return await this.createDefaultPreferences();
            }
        } catch (error) {
            console.error('Error fetching user preferences:', error);
            throw error;
        }
    }

    async updateMonthlyCycleConfig(config: MonthlyCycleConfig): Promise<UserPreferences> {
        try {
            const existingPreferences = await this.getUserPreferences();
            
            const updatedPreferences: UserPreferences = {
                ...existingPreferences,
                monthlyCycleType: config.type,
                monthlyCycleDate: config.date,
                updated: new Date().toISOString()
            };

            await this.db.userPreferences.put(updatedPreferences);
            return updatedPreferences;
        } catch (error) {
            console.error('Error updating monthly cycle config:', error);
            throw error;
        }
    }

    async getMonthlyCycleConfig(): Promise<MonthlyCycleConfig> {
        try {
            const preferences = await this.getUserPreferences();
            return {
                type: preferences.monthlyCycleType,
                date: preferences.monthlyCycleDate
            };
        } catch (error) {
            console.error('Error getting monthly cycle config:', error);
            return DEFAULT_MONTHLY_CYCLE;
        }
    }

    private async createDefaultPreferences(): Promise<UserPreferences> {
        const defaultPreferences: UserPreferences = {
            id: crypto.randomUUID(),
            userId: this.DEFAULT_USER_ID,
            monthlyCycleType: DEFAULT_MONTHLY_CYCLE.type,
            monthlyCycleDate: DEFAULT_MONTHLY_CYCLE.date,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        await this.db.userPreferences.add(defaultPreferences);
        return defaultPreferences;
    }

    async resetToDefaults(): Promise<UserPreferences> {
        try {
            await this.db.userPreferences
                .where('userId')
                .equals(this.DEFAULT_USER_ID)
                .delete();
            
            return await this.createDefaultPreferences();
        } catch (error) {
            console.error('Error resetting preferences to defaults:', error);
            throw error;
        }
    }
}