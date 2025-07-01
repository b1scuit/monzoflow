import { FirebaseApp, initializeApp } from "firebase/app";
import { Functions, getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { RemoteConfig, getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { FC, ReactElement, createContext, useContext, useState, useEffect } from "react";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

type firebase = {
    app: FirebaseApp | undefined
    functions: Functions | undefined
    remoteConfig: RemoteConfig | undefined
    configValues: Record<string, any>
    isConfigLoaded: boolean
    configError: string | null
    refreshConfig: () => Promise<void>
}

// Initialize Firebase
const defaultContext: firebase = {
    app: undefined,
    functions: undefined,
    remoteConfig: undefined,
    configValues: {},
    isConfigLoaded: false,
    configError: null,
    refreshConfig: async () => {}
};

export const AppContext = createContext<firebase>(defaultContext);

export const AppContextProvider: FC<{ children: ReactElement }> = ({ children }) => {
    const [firebaseState, setFirebaseState] = useState<firebase>(() => initFirebase());

    useEffect(() => {
        loadRemoteConfig(firebaseState, setFirebaseState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <AppContext.Provider value={firebaseState}>{children}</AppContext.Provider>;
};

// Cache configuration
const CACHE_KEY = 'firebase_remote_config_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface ConfigCache {
    values: Record<string, any>;
    timestamp: number;
}

const getCachedConfig = (): ConfigCache | null => {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const parsed: ConfigCache = JSON.parse(cached);
        const isExpired = Date.now() - parsed.timestamp > CACHE_TTL;
        return isExpired ? null : parsed;
    } catch {
        return null;
    }
};

const setCachedConfig = (values: Record<string, any>) => {
    try {
        const cache: ConfigCache = {
            values,
            timestamp: Date.now()
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to cache Remote Config:', error);
    }
};

const initFirebase = (): firebase => {
    const app = initializeApp(firebaseConfig);
    const functions = getFunctions(app);
    const remoteConfig = getRemoteConfig(app);
    
    if (process.env.NODE_ENV !== "production") {
        connectFunctionsEmulator(functions, "localhost", 5001);
    }

    // Configure Remote Config
    remoteConfig.settings = {
        minimumFetchIntervalMillis: process.env.NODE_ENV === "production" ? 43200000 : 60000, // 12 hours prod, 1 minute dev
        fetchTimeoutMillis: 60000
    };

    const refreshConfig = async (): Promise<void> => {
        if (!remoteConfig) return;
        try {
            await fetchAndActivate(remoteConfig);
            const configValues = {
                export_enabled: getValue(remoteConfig, 'export_enabled').asBoolean()
            };
            setCachedConfig(configValues);
        } catch (error) {
            console.warn('Failed to refresh Remote Config:', error);
            throw error;
        }
    };

    return {
        app,
        functions,
        remoteConfig,
        configValues: {},
        isConfigLoaded: false,
        configError: null,
        refreshConfig
    };
};

const loadRemoteConfig = async (
    firebaseState: firebase,
    setFirebaseState: React.Dispatch<React.SetStateAction<firebase>>
) => {
    if (!firebaseState.remoteConfig) return;

    // Try to get cached config first
    const cached = getCachedConfig();
    if (cached) {
        setFirebaseState(prev => ({
            ...prev,
            configValues: cached.values,
            isConfigLoaded: true
        }));
    }

    // Fetch fresh config in background
    try {
        await firebaseState.refreshConfig();
        // Get the fresh values after refresh
        const freshValues = {
            export_enabled: getValue(firebaseState.remoteConfig!, 'export_enabled').asBoolean()
        };
        setFirebaseState(prev => ({
            ...prev,
            configValues: freshValues,
            isConfigLoaded: true,
            configError: null
        }));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Failed to load Remote Config, using cached/default values:', error);
        
        // If no cached config, use defaults
        if (!cached) {
            const defaultValues = {
                export_enabled: true
            };
            setFirebaseState(prev => ({
                ...prev,
                configValues: defaultValues,
                isConfigLoaded: true,
                configError: errorMessage
            }));
        } else {
            setFirebaseState(prev => ({
                ...prev,
                configError: errorMessage
            }));
        }
    }
};

export const useApp = () => useContext(AppContext) 