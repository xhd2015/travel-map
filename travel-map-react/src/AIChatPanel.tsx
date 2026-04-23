import { useState, useRef, useEffect } from 'react';
import { Button, Input, Typography } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, CloseOutlined, MessageOutlined, LoadingOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { api } from './api';
import type { ChatMessage } from './api';
import './AIChatPanel.css';

const { Text } = Typography;

interface DisplayMessage {
    role: string;
    content: string;
}

export default function AIChatPanel({ planId }: { planId: string }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || streaming) return;

        setError(null);
        const userMsg: DisplayMessage = { role: 'user', content: text };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setStreaming(true);

        const assistantMsg: DisplayMessage = { role: 'assistant', content: '' };
        setMessages([...updatedMessages, assistantMsg]);

        const chatMessages: ChatMessage[] = updatedMessages.map(m => ({ role: m.role, content: m.content }));

        const abortController = new AbortController();
        abortRef.current = abortController;

        let accumulated = '';
        try {
            await api.streamAIChat(planId, chatMessages, (chunk) => {
                if (chunk.type === 'content' && chunk.content) {
                    accumulated += chunk.content;
                    setMessages(prev => {
                        const next = [...prev];
                        next[next.length - 1] = { role: 'assistant', content: accumulated };
                        return next;
                    });
                } else if (chunk.type === 'error' && chunk.error) {
                    setError(chunk.error);
                }
            }, abortController.signal);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError(err.message || 'AI request failed');
            }
        } finally {
            setStreaming(false);
            abortRef.current = null;
        }
    };

    const handleStop = () => {
        abortRef.current?.abort();
    };

    if (!open) {
        return (
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<MessageOutlined />}
                    onClick={() => setOpen(true)}
                    style={{ width: 56, height: 56, fontSize: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
            </div>
        );
    }

    return (
        <div className="ai-chat-panel">
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#fafafa', borderRadius: '12px 12px 0 0',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RobotOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                    <Text strong>AI 旅行助手</Text>
                </div>
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setOpen(false)} />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
                        <RobotOutlined style={{ fontSize: 40, marginBottom: 12, color: '#d9d9d9' }} />
                        <div>有什么旅行问题？问我吧！</div>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        display: 'flex', gap: 8,
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: msg.role === 'user' ? '#1677ff' : '#f0f0f0',
                            color: msg.role === 'user' ? '#fff' : '#666',
                            fontSize: 14,
                        }}>
                            {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                        </div>
                        <div style={{
                            maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
                            background: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                            color: msg.role === 'user' ? '#fff' : '#333',
                            lineHeight: 1.6, fontSize: 14, wordBreak: 'break-word',
                        }}>
                            {msg.role === 'assistant' ? (
                                <div className="ai-markdown">
                                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>{msg.content || '...'}</ReactMarkdown>
                                </div>
                            ) : msg.content}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {error && (
                <div style={{ padding: '4px 16px', color: '#ff4d4f', fontSize: 12 }}>{error}</div>
            )}

            <div style={{
                padding: '12px 16px',
                borderTop: '1px solid #f0f0f0',
                display: 'flex', gap: 8,
            }}>
                <Input
                    placeholder="输入消息..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onPressEnter={handleSend}
                    disabled={streaming}
                    style={{ borderRadius: 8 }}
                />
                {streaming ? (
                    <Button
                        icon={<LoadingOutlined />}
                        onClick={handleStop}
                        style={{ borderRadius: 8 }}
                    >
                        停止
                    </Button>
                ) : (
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSend}
                        disabled={!input.trim()}
                        style={{ borderRadius: 8 }}
                    />
                )}
            </div>
        </div>
    );
}
