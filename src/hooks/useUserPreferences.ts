import { useState, useEffect, useCallback } from 'react';
import { UserPreferences, MonthlyCycleConfig, DEFAULT_MONTHLY_CYCLE } from '../types/UserPreferences';
import { UserPreferencesService } from '../services/UserPreferencesService';
import { useDatabase } from '../components/DatabaseContext/DatabaseContext';

export function useUserPreferences() {
    const db = useDatabase();
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [service] = useState(() => new UserPreferencesService(db));

    const loadPreferences = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const prefs = await service.getUserPreferences();
            setPreferences(prefs);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load preferences');
            console.error('Error loading preferences:', err);
        } finally {
            setLoading(false);
        }
    }, [service]);

    const updateMonthlyCycleConfig = useCallback(async (config: MonthlyCycleConfig): Promise<void> => {
        try {
            setError(null);
            const updatedPreferences = await service.updateMonthlyCycleConfig(config);
            setPreferences(updatedPreferences);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update monthly cycle config');
            console.error('Error updating monthly cycle config:', err);
            throw err;
        }
    }, [service]);

    const getMonthlyCycleConfig = useCallback((): MonthlyCycleConfig => {
        if (!preferences) {
            return DEFAULT_MONTHLY_CYCLE;
        }
        
        return {
            type: preferences.monthlyCycleType,
            date: preferences.monthlyCycleDate
        };
    }, [preferences]);

    const resetToDefaults = useCallback(async (): Promise<void> => {
        try {
            setError(null);
            const defaultPreferences = await service.resetToDefaults();
            setPreferences(defaultPreferences);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset preferences');
            console.error('Error resetting preferences:', err);
            throw err;
        }
    }, [service]);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    return {
        preferences,
        loading,
        error,
        updateMonthlyCycleConfig,
        getMonthlyCycleConfig,
        resetToDefaults,
        reload: loadPreferences
    };
}