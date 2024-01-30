import { FirebaseApp, initializeApp } from "firebase/app";
import { Functions, getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { FC, ReactElement, createContext, useContext } from "react";

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
}

// Initialize Firebase
export const AppContext = createContext<firebase>({ app: undefined, functions: undefined })
export const AppContextProvider: FC<{ children: ReactElement }> = ({ children }) => <AppContext.Provider value={initFirebase()}>{children}</AppContext.Provider>

const initFirebase = (): firebase => {
    const app = initializeApp(firebaseConfig);
    const functions = getFunctions(app)
    
    connectFunctionsEmulator(functions, "localhost", 5001);

    return {
        app,
        functions,
    }
}

export const useApp = () => useContext(AppContext) 