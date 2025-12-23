import React, { useState, useEffect, ReactNode } from 'react';

interface ResizableSidebarLayoutProps {
    children: ReactNode;
    width: number;
    onResize: (width: number) => void;
    minWidth?: number;
    maxWidth?: number;
    className?: string;
    style?: React.CSSProperties;
    handleStyle?: React.CSSProperties;
}

export const ResizableSidebarLayout: React.FC<ResizableSidebarLayoutProps> = ({
    children,
    width,
    onResize,
    minWidth = 200,
    maxWidth = 800,
    className,
    style,
    handleStyle
}) => {
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = React.useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = mouseMoveEvent.clientX;
                if (newWidth > minWidth && newWidth < maxWidth) {
                    onResize(newWidth);
                }
            }
        },
        [isResizing, minWidth, maxWidth, onResize]
    );

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
            // Prevent text selection while resizing
            document.body.style.userSelect = 'none';
        }

        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
            document.body.style.userSelect = '';
        };
    }, [isResizing, resize, stopResizing]);

    return (
        <div
            className={className}
            style={{
                width,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                ...style
            }}
        >
            <div
                style={{
                    width: '5px',
                    height: '100%',
                    position: 'absolute',
                    right: -2.5, // Center the handle on the border
                    top: 0,
                    cursor: 'col-resize',
                    zIndex: 100,
                    backgroundColor: isResizing ? '#1890ff' : 'transparent',
                    transition: 'background-color 0.2s',
                    ...handleStyle
                }}
                onMouseDown={startResizing}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1890ff'}
                onMouseLeave={(e) => !isResizing && (e.currentTarget.style.backgroundColor = 'transparent')}
            />
            {children}
        </div>
    );
};

