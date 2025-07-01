import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../components/AppContext/context';
import { RemoteConfigService } from '../services/RemoteConfigService';

interface RemoteConfigHookResult {
    exportEnabled: boolean;
    isLoading: boolean;
    error: string | null;
    refreshConfig: () => Promise<void>;
    getConfigValue: (key: string, fallback?: any) => any;
}

export const useRemoteConfig = (): RemoteConfigHookResult => {
    const { remoteConfig, configValues, isConfigLoaded, configError, refreshConfig } = useApp();
    const [service, setService] = useState<RemoteConfigService | null>(null);

    useEffect(() => {
        if (remoteConfig) {
            setService(new RemoteConfigService(remoteConfig));
        }
    }, [remoteConfig]);

    const getConfigValue = useCallback((key: string, fallback?: any) => {
        // If config is loaded, use cached values from context
        if (isConfigLoaded && configValues[key] !== undefined) {
            return configValues[key];
        }
        
        // Fallback to service if available
        if (service) {
            switch (typeof fallback) {
                case 'boolean':
                    return service.getBooleanValue(key, fallback);
                case 'string':
                    return service.getStringValue(key, fallback);
                case 'number':
                    return service.getNumberValue(key, fallback);
                default:
                    return service.getStringValue(key, fallback?.toString() || '');
            }
        }
        
        // Ultimate fallback
        return fallback;
    }, [service, configValues, isConfigLoaded]);

    return {
        exportEnabled: getConfigValue('export_enabled', true),
        isLoading: !isConfigLoaded,
        error: configError,
        refreshConfig,
        getConfigValue
    };
};