import React from 'react';
import { Outlet } from 'react-router-dom';
import { Alert } from 'antd';
import { useGlobalError } from '../context/GlobalErrorContext';

const RootLayout: React.FC = () => {
    const { errors, removeError } = useGlobalError();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
            {errors.length > 0 && (
                <div style={{ padding: '8px 16px', background: '#fff0f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {errors.map((err) => (
                        <Alert
                            key={err.id}
                            message="Error"
                            description={err.message}
                            type="error"
                            showIcon
                            closable
                            onClose={() => removeError(err.id)}
                        />
                    ))}
                </div>
            )}
            <div style={{ flex: 1 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default RootLayout;
