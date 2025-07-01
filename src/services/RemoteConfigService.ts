import { RemoteConfig, getValue } from 'firebase/remote-config';

export class RemoteConfigService {
    private remoteConfig: RemoteConfig;

    constructor(remoteConfig: RemoteConfig) {
        this.remoteConfig = remoteConfig;
    }

    getExportEnabled(): boolean {
        try {
            return getValue(this.remoteConfig, 'export_enabled').asBoolean();
        } catch (error) {
            console.warn('Failed to get export_enabled config, using default:', error);
            return true; // Default to enabled for fail-safe behavior
        }
    }

    getBooleanValue(key: string, defaultValue: boolean = false): boolean {
        try {
            return getValue(this.remoteConfig, key).asBoolean();
        } catch (error) {
            console.warn(`Failed to get config value for ${key}, using default:`, error);
            return defaultValue;
        }
    }

    getStringValue(key: string, defaultValue: string = ''): string {
        try {
            return getValue(this.remoteConfig, key).asString();
        } catch (error) {
            console.warn(`Failed to get config value for ${key}, using default:`, error);
            return defaultValue;
        }
    }

    getNumberValue(key: string, defaultValue: number = 0): number {
        try {
            return getValue(this.remoteConfig, key).asNumber();
        } catch (error) {
            console.warn(`Failed to get config value for ${key}, using default:`, error);
            return defaultValue;
        }
    }
}