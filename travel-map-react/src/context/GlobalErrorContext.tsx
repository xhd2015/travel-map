import React, { createContext, useState, useContext, type ReactNode, useCallback, useEffect } from 'react';
import { message as antdMessage } from 'antd';

export interface ErrorItem {
    id: string;
    message: string;
}

interface GlobalErrorContextType {
    errors: ErrorItem[];
    showError: (message: string) => void;
    removeError: (id: string) => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

export const GlobalErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [errors, setErrors] = useState<ErrorItem[]>([]);

    const showError = useCallback((msg: string) => {
        // Show antd message
        antdMessage.error(msg);

        // Add to global list
        setErrors((prev) => {
            const newItem = { id: Date.now().toString() + Math.random().toString().slice(2), message: msg };
            const newErrors = [...prev, newItem];
            if (newErrors.length > 3) {
                return newErrors.slice(newErrors.length - 3);
            }
            return newErrors;
        });
    }, []);

    const removeError = useCallback((id: string) => {
        setErrors((prev) => prev.filter((e) => e.id !== id));
    }, []);

    useEffect(() => {
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            // Extract useful message
            let msg = 'Unknown Error';
            if (reason instanceof Error) {
                msg = reason.message;
            } else if (typeof reason === 'string') {
                msg = reason;
            } else {
                try {
                    msg = JSON.stringify(reason);
                } catch (e) {
                    msg = String(reason);
                }
            }
            showError(msg);
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [showError]);

    return (
        <GlobalErrorContext.Provider value={{ errors, showError, removeError }}>
            {children}
        </GlobalErrorContext.Provider>
    );
};

export const useGlobalError = (): GlobalErrorContextType => {
    const context = useContext(GlobalErrorContext);
    if (!context) {
        throw new Error('useGlobalError must be used within a GlobalErrorProvider');
    }
    return context;
};
