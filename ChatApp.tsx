import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from './types';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import LockIcon from './components/LockIcon';
import { v4 as uuidv4 } from 'uuid';
import mqtt from 'mqtt';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC = 'pro-react-chat-app/persistent-general-chat-v2';
const HISTORY_API = '/.netlify/functions/chat-history';

// A simple debounce utility
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

type ActionType = 'new_message' | 'delete_message' | 'toggle_reaction';

interface ActionPayload {
  type: ActionType;
  payload: any;
}

interface ChatAppProps {
    onLock: () => void;
}

const ChatApp: React.FC<ChatAppProps> = ({ onLock }) => {
  const [clientId] = useState(() => `chat-client-${uuidv4()}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const isInitialLoad = useRef(true);

  const debouncedSave = useCallback(debounce(async (msgs: Message[]) => {
    const persistentMessages = msgs.filter(m => m.senderId !== 'system' && !m.isError);
    if (persistentMessages.length === 0 && msgs.length > 0) return;

    try {
      await fetch(HISTORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persistentMessages)
      });
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, 1000), []);

  useEffect(() => {
    if (isInitialLoad.current || isLoadingHistory) {
      return;
    }
    debouncedSave(messages);
  }, [messages, isLoadingHistory, debouncedSave]);
  
  useEffect(() => {
    fetch(HISTORY_API)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch history');
        return res.json();
      })
      .then((history: Message[]) => {
        setMessages(history || []);
      })
      .catch(error => {
        console.error("Error loading chat history:", error);
        setMessages([{
          id: 'error-message',
          text: 'Could not load chat history.',
          senderId: 'system',
          isError: true,
        }]);
      })
      .finally(() => {
        setIsLoadingHistory(false);
        isInitialLoad.current = false;
      });

    const client = mqtt.connect(BROKER_URL, { clientId });
    clientRef.current = client;

    client.on('connect', () => {
      setConnectionStatus('Connected');
      client.subscribe(TOPIC, (err) => {
        if (err) setConnectionStatus('Subscription Failed');
      });
    });

    client.on('message', (topic, payload) => {
      if (topic === TOPIC) {
        try {
          const { type, payload: actionPayload }: ActionPayload = JSON.parse(payload.toString());
          
          switch (type) {
            case 'new_message': {
              const { senderId: receivedSenderId } = actionPayload;
              if (receivedSenderId === clientId) return;
              setMessages(prev => [...prev, actionPayload]);
              break;
            }
            case 'delete_message': {
              const { messageId } = actionPayload;
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
              break;
            }
            case 'toggle_reaction': {
              const { messageId, emoji, senderId: reactorId } = actionPayload;
              setMessages(prev =>
                prev.map(msg => {
                  if (msg.id !== messageId) return msg;

                  const newReactions = { ...(msg.reactions || {}) };
                  const reactors = newReactions[emoji] || [];

                  if (reactors.includes(reactorId)) {
                    newReactions[emoji] = reactors.filter(id => id !== reactorId);
                    if (newReactions[emoji].length === 0) {
                      delete newReactions[emoji];
                    }
                  } else {
                    newReactions[emoji] = [...reactors, reactorId];
                  }
                  return { ...msg, reactions: newReactions };
                })
              );
              break;
            }
          }
        } catch (error) {
          console.error('Error parsing message payload:', error);
        }
      }
    });
    
    client.on('reconnect', () => setConnectionStatus('Reconnecting...'));
    client.on('error', (err) => {
        console.error('Connection error:', err);
        setConnectionStatus('Connection Error');
        client.end();
    });
    client.on('close', () => setConnectionStatus('Disconnected'));

    return () => {
        if (clientRef.current) {
            clientRef.current.removeAllListeners();
            clientRef.current.end(true);
        }
    };
  }, [clientId]);

  const handleSendMessage = useCallback((inputText: string) => {
    if (!inputText.trim() || !clientRef.current?.connected) return;

    const newMessage: Message = {
        id: uuidv4(),
        text: inputText,
        senderId: clientId,
    };
    
    setMessages(prev => [...prev, newMessage]);

    const action: ActionPayload = { type: 'new_message', payload: newMessage };
    clientRef.current.publish(TOPIC, JSON.stringify(action));
  }, [clientId]);
  
  const handleDeleteMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.senderId !== clientId || !clientRef.current?.connected) return;

    const action: ActionPayload = { type: 'delete_message', payload: { messageId } };
    clientRef.current.publish(TOPIC, JSON.stringify(action));
  }, [clientId, messages]);

  const handleToggleReaction = useCallback((messageId: string, emoji: string) => {
    if (!clientRef.current?.connected) return;
    
    const action: ActionPayload = {
      type: 'toggle_reaction',
      payload: { messageId, emoji, senderId: clientId }
    };
    clientRef.current.publish(TOPIC, JSON.stringify(action));
  }, [clientId]);

  const isConnected = connectionStatus === 'Connected';

  return (
    <div className="flex flex-col h-screen bg-transparent text-white antialiased">
        <header className="relative p-4 shadow-lg bg-black/30 backdrop-blur-xl border-b border-white/10 flex items-center justify-center">
            <div className="flex items-center justify-center gap-3">
                <h1 className="text-xl font-semibold tracking-wider text-gray-200">
                    Secure Channel
                </h1>
                 <div className="relative flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                    <div className={`absolute w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'} animate-ping`}></div>
                </div>
            </div>
            <button onClick={onLock} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Lock and exit">
                <LockIcon />
            </button>
        </header>
        <ChatWindow 
            messages={messages} 
            localClientId={clientId} 
            isLoading={isLoadingHistory}
            onDeleteMessage={handleDeleteMessage}
            onToggleReaction={handleToggleReaction}
        />
        <ChatInput 
            onSendMessage={handleSendMessage} 
            disabled={!isConnected || isLoadingHistory}
        />
    </div>
  );
};

export default ChatApp;