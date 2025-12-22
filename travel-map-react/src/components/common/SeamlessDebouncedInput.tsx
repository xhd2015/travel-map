import React, { useState, useRef, useEffect } from 'react';
import { Input } from 'antd';

interface SeamlessDebouncedInputProps {
    value: string;
    onChange: (value: string) => void;
    textarea?: boolean;
    autoSize?: boolean | object;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
}

export const SeamlessDebouncedInput = ({ value, onChange, textarea, autoSize, placeholder, className, style }: SeamlessDebouncedInputProps) => {
    const [localValue, setLocalValue] = useState(value);
    const [focused, setFocused] = useState(false);
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value;
        setLocalValue(val);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            onChange(val);
        }, 500);
    };

    const commonStyle: React.CSSProperties = {
        ...style,
        ...(focused ? {} : {
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            resize: 'none',
            cursor: 'pointer',
        })
    };

    const handleFocus = () => setFocused(true);
    const handleBlur = () => setFocused(false);

    if (textarea) {
        return (
            <Input.TextArea
                value={localValue}
                onChange={handleChange}
                autoSize={autoSize}
                placeholder={placeholder}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={commonStyle}
                className={className}
            />
        );
    }
    return (
        <Input
            value={localValue}
            onChange={handleChange}
            placeholder={placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={commonStyle}
            className={className}
        />
    );
};

