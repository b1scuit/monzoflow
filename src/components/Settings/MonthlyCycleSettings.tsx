import { FC, useState, useEffect } from 'react';
import { MonthlyCycleConfig, DEFAULT_MONTHLY_CYCLE } from '../../types/UserPreferences';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { getCurrentMonthlyPeriod } from '../../utils/dateUtils';

interface MonthlyCycleSettingsProps {
    className?: string;
}

const MonthlyCycleSettings: FC<MonthlyCycleSettingsProps> = ({ className = '' }) => {
    const { preferences, updateMonthlyCycleConfig, getMonthlyCycleConfig, loading, error } = useUserPreferences();
    const [localConfig, setLocalConfig] = useState<MonthlyCycleConfig>(DEFAULT_MONTHLY_CYCLE);
    const [isSaving, setIsSaving] = useState(false);
    const [previewPeriod, setPreviewPeriod] = useState<string>('');

    useEffect(() => {
        if (preferences) {
            const config = getMonthlyCycleConfig();
            setLocalConfig(config);
            updatePreview(config);
        }
    }, [preferences, getMonthlyCycleConfig]);

    const updatePreview = (config: MonthlyCycleConfig) => {
        try {
            const period = getCurrentMonthlyPeriod(config);
            const startStr = period.startDate.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            });
            const endStr = period.endDate.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            });
            setPreviewPeriod(`${startStr} - ${endStr}`);
        } catch (err) {
            setPreviewPeriod('Invalid configuration');
        }
    };

    const handleTypeChange = (type: MonthlyCycleConfig['type']) => {
        const newConfig: MonthlyCycleConfig = {
            type,
            date: type === 'last_working_day' ? undefined : (localConfig.date || 1)
        };
        setLocalConfig(newConfig);
        updatePreview(newConfig);
    };

    const handleDateChange = (date: number) => {
        if (date < 1 || date > 31) return;
        
        const newConfig: MonthlyCycleConfig = {
            ...localConfig,
            date
        };
        setLocalConfig(newConfig);
        updatePreview(newConfig);
    };

    const handleSave = async () => {
        if (!isConfigValid(localConfig)) {
            alert('Please provide a valid configuration');
            return;
        }

        setIsSaving(true);
        try {
            await updateMonthlyCycleConfig(localConfig);
            alert('Monthly cycle settings saved successfully!');
        } catch (err) {
            console.error('Error saving monthly cycle config:', err);
            alert('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setLocalConfig(DEFAULT_MONTHLY_CYCLE);
        updatePreview(DEFAULT_MONTHLY_CYCLE);
    };

    const isConfigValid = (config: MonthlyCycleConfig): boolean => {
        if (config.type === 'last_working_day') {
            return true;
        }
        return config.date !== undefined && config.date >= 1 && config.date <= 31;
    };

    const hasChanges = () => {
        const currentConfig = getMonthlyCycleConfig();
        return JSON.stringify(localConfig) !== JSON.stringify(currentConfig);
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📅</span>
                Monthly Cycle Settings
            </h2>
            
            <p className="text-gray-600 mb-6">
                Configure when your monthly budget cycle begins. This affects all budget calculations and metrics.
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Cycle Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Monthly Cycle Type
                    </label>
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <input
                                type="radio"
                                id="specific_date"
                                name="cycleType"
                                value="specific_date"
                                checked={localConfig.type === 'specific_date'}
                                onChange={() => handleTypeChange('specific_date')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="specific_date" className="ml-3 block text-sm text-gray-700">
                                <span className="font-medium">Specific Date</span>
                                <span className="block text-gray-500">Start cycle on a specific day each month (1-31)</span>
                            </label>
                        </div>
                        
                        <div className="flex items-center">
                            <input
                                type="radio"
                                id="last_working_day"
                                name="cycleType"
                                value="last_working_day"
                                checked={localConfig.type === 'last_working_day'}
                                onChange={() => handleTypeChange('last_working_day')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="last_working_day" className="ml-3 block text-sm text-gray-700">
                                <span className="font-medium">Last Working Day</span>
                                <span className="block text-gray-500">Start cycle on the last weekday of each month</span>
                            </label>
                        </div>
                        
                        <div className="flex items-center">
                            <input
                                type="radio"
                                id="closest_workday"
                                name="cycleType"
                                value="closest_workday"
                                checked={localConfig.type === 'closest_workday'}
                                onChange={() => handleTypeChange('closest_workday')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="closest_workday" className="ml-3 block text-sm text-gray-700">
                                <span className="font-medium">Closest Workday to Date</span>
                                <span className="block text-gray-500">Start cycle on the nearest weekday to a specific date</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Date Input */}
                {(localConfig.type === 'specific_date' || localConfig.type === 'closest_workday') && (
                    <div>
                        <label htmlFor="cycleDate" className="block text-sm font-medium text-gray-700 mb-2">
                            {localConfig.type === 'specific_date' ? 'Day of Month' : 'Target Date'}
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                id="cycleDate"
                                min="1"
                                max="31"
                                value={localConfig.date || ''}
                                onChange={(e) => handleDateChange(parseInt(e.target.value) || 1)}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="1"
                            />
                            <span className="text-sm text-gray-500">
                                (1-31, adjusted for months with fewer days)
                            </span>
                        </div>
                    </div>
                )}

                {/* Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Current Period Preview</h3>
                    <p className="text-blue-700 text-sm">
                        With this configuration, your current monthly period would be: <strong>{previewPeriod}</strong>
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4 border-t">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isConfigValid(localConfig) || !hasChanges()}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                    
                    <button
                        onClick={handleReset}
                        disabled={isSaving}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Reset to Default
                    </button>
                </div>

                {/* Help Text */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                    <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
                    <ul className="space-y-1 list-disc list-inside">
                        <li><strong>Specific Date:</strong> Your cycle always starts on the same day each month (e.g., 1st, 15th, 25th)</li>
                        <li><strong>Last Working Day:</strong> Perfect for salary cycles - starts on the last weekday of each month</li>
                        <li><strong>Closest Workday:</strong> Targets a specific date but moves to the nearest weekday if it falls on a weekend</li>
                    </ul>
                    <p className="mt-2">
                        <strong>Note:</strong> Changing this setting will affect all future budget calculations. Historical data remains unchanged.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MonthlyCycleSettings;