import React, { useState, useEffect, useRef } from 'react';
import './chat.css';

function Chat({ socket, roomData }) {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState(roomData.messages || []);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        setMessages(roomData.messages || []);
    }, [roomData.messages]);

    useEffect(() => {
        socket.on('chatMessage', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => {
            socket.off('chatMessage');
        };
    }, [socket]);

    useEffect(() => {
        // Auto scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('chatMessage', { message: message.trim() });
            setMessage('');
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h4>💬 Sohbet</h4>
            </div>

            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message message-${msg.type}`}>
                        {msg.type === 'user' && (
                            <div className="message-user">
                                <span className="message-sender">{msg.sender}</span>
                                <span className="message-time">{formatTime(msg.timestamp)}</span>
                            </div>
                        )}
                        <div className="message-text">
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSend}>
                <input
                    type="text"
                    className="chat-input"
                    placeholder="Mesaj yaz..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={200}
                />
                <button type="submit" className="chat-send-btn" disabled={!message.trim()}>
                    Gönder
                </button>
            </form>
        </div>
    );
}

export default Chat;
