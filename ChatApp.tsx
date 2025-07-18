
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from './types';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ExitIcon from './components/ExitIcon';
import { v4 as uuidv4 } from 'uuid';
import mqtt from 'mqtt';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const CHAT_TOPIC = 'pro-react-chat-app/realtime-chat-v3';
const HISTORY_TOPIC = 'pro-react-chat-app/history-v3';

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

type ActionType = 'new_message' | 'delete_message' | 'toggle_reaction';

interface ActionPayload {
  type: ActionType;
  payload: any;
}

interface ChatAppProps {
    onLock: () => void;
}

const getPersistentClientId = (): string => {
  const storedId = localStorage.getItem('pro-react-chat-app-client-id');
  if (storedId) {
    return storedId;
  }
  const newId = `chat-client-${uuidv4()}`;
  localStorage.setItem('pro-react-chat-app-client-id', newId);
  return newId;
};

const ChatApp: React.FC<ChatAppProps> = ({ onLock }) => {
  const [clientId] = useState(getPersistentClientId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // This function now saves history via MQTT retained messages
  const saveHistory = useCallback((msgs: Message[]) => {
    if (clientRef.current && clientRef.current.connected) {
      const persistentMessages = msgs.filter(m => m.senderId !== 'system' && !m.isError);
      clientRef.current.publish(HISTORY_TOPIC, JSON.stringify(persistentMessages), { retain: true, qos: 1 });
    }
  }, []);

  // Debounce utility to prevent spamming the save function
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const debounced = (...args: Parameters<F>): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), waitFor);
    };
    return debounced;
  };
  
  const debouncedSave = useRef(debounce((msgs: Message[]) => saveHistory(msgs), 1500)).current;

  // Save messages when they change
  useEffect(() => {
    if (!isLoadingHistory) {
      debouncedSave(messages);
    }
  }, [messages, isLoadingHistory, debouncedSave]);
  
  // Main effect for MQTT connection and message handling
  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, { clientId });
    clientRef.current = client;

    let historyReceived = false;

    const historyTimeout = setTimeout(() => {
        if (!historyReceived) {
            console.log("No history received, proceeding.");
            setIsLoadingHistory(false);
            client.unsubscribe(HISTORY_TOPIC, () => {
                client.subscribe(CHAT_TOPIC, (err) => {
                    if (err) setConnectionStatus('Subscription Failed');
                });
            });
        }
    }, 4000); // 4-second timeout for history

    client.on('connect', () => {
      setConnectionStatus('Connected');
      client.subscribe(HISTORY_TOPIC, { qos: 1 }); // Subscribe to history first
    });

    client.on('message', (topic, payload) => {
      try {
        const payloadString = payload.toString();
        if (topic === HISTORY_TOPIC && !historyReceived) {
            historyReceived = true;
            clearTimeout(historyTimeout);
            const history = JSON.parse(payloadString);
            setMessages(history || []);
            setIsLoadingHistory(false);
            client.unsubscribe(HISTORY_TOPIC, () => {
                client.subscribe(CHAT_TOPIC, { qos: 1 }, (err) => {
                    if (err) setConnectionStatus('Subscription Failed');
                });
            });
        } else if (topic === CHAT_TOPIC) {
            const { type, payload: actionPayload }: ActionPayload = JSON.parse(payloadString);
            if (type === 'new_message' && actionPayload.senderId === clientId) return;
            
            setMessages(prev => {
              switch (type) {
                case 'new_message':
                  return [...prev, actionPayload];
                case 'delete_message':
                  return prev.filter(msg => msg.id !== actionPayload.messageId);
                case 'toggle_reaction': {
                  const { messageId, emoji, senderId: reactorId } = actionPayload;
                  return prev.map(msg => {
                    if (msg.id !== messageId) return msg;
                    const newReactions = { ...(msg.reactions || {}) };
                    const reactors = newReactions[emoji] || [];
                    newReactions[emoji] = reactors.includes(reactorId)
                      ? reactors.filter(id => id !== reactorId)
                      : [...reactors, reactorId];
                    if (newReactions[emoji].length === 0) delete newReactions[emoji];
                    return { ...msg, reactions: newReactions };
                  });
                }
                default: return prev;
              }
            });
        }
      } catch (error) {
        console.error('Error parsing payload:', error);
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
        clearTimeout(historyTimeout);
        if (clientRef.current) {
            clientRef.current.end(true);
        }
    };
  }, [clientId]);
  
  const handleExit = () => {
    if (isExiting) return;
    setIsExiting(true);

    // Perform one final, immediate save before exiting
    saveHistory(messagesRef.current);

    // Give a moment for the publish to go through before closing
    setTimeout(() => {
        if (clientRef.current) {
            clientRef.current.end(true);
        }
        onLock();
    }, 200);
  };

  const handleSendMessage = useCallback((inputText: string) => {
    if (!inputText.trim() || !clientRef.current?.connected) return;
    const newMessage: Message = { id: uuidv4(), text: inputText, senderId: clientId };
    setMessages(prev => [...prev, newMessage]);
    clientRef.current.publish(CHAT_TOPIC, JSON.stringify({ type: 'new_message', payload: newMessage }), { qos: 1 });
  }, [clientId]);
  
  const handleDeleteMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.senderId !== clientId || !clientRef.current?.connected) return;
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    clientRef.current.publish(CHAT_TOPIC, JSON.stringify({ type: 'delete_message', payload: { messageId } }), { qos: 1 });
  }, [clientId, messages]);

  const handleToggleReaction = useCallback((messageId: string, emoji: string) => {
    if (!clientRef.current?.connected) return;
    setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const newReactions = { ...(msg.reactions || {}) };
        const reactors = newReactions[emoji] || [];
        if (reactors.includes(clientId)) {
          newReactions[emoji] = reactors.filter(id => id !== clientId);
          if (newReactions[emoji].length === 0) delete newReactions[emoji];
        } else {
          newReactions[emoji] = [...reactors, clientId];
        }
        return { ...msg, reactions: newReactions };
      })
    );
    clientRef.current.publish(CHAT_TOPIC, JSON.stringify({
      type: 'toggle_reaction',
      payload: { messageId, emoji, senderId: clientId }
    }), { qos: 1 });
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
            <button onClick={handleExit} disabled={isExiting} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:cursor-wait" aria-label="Exit chat">
                {isExiting ? <LoadingSpinner /> : <ExitIcon />}
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
