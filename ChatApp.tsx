
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from './types';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ExitIcon from './components/ExitIcon';
import { v4 as uuidv4 } from 'uuid';
import mqtt from 'mqtt';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC = 'pro-react-chat-app/persistent-general-chat-v2';
const HISTORY_API = '/.netlify/functions/chat-history';

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

const ChatApp: React.FC<ChatAppProps> = ({ onLock }) => {
  const [clientId] = useState(() => `chat-client-${uuidv4()}`);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const saveHistory = useCallback(async (msgs: Message[]) => {
    const persistentMessages = msgs.filter(m => m.senderId !== 'system' && !m.isError);
    try {
      await fetch(HISTORY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persistentMessages)
      });
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, []);

  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const debounced = (...args: Parameters<F>): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), waitFor);
    };
    return debounced;
  };
  
  const debouncedSave = useRef(debounce((msgs: Message[]) => saveHistory(msgs), 1000)).current;

  useEffect(() => {
    if (!isLoadingHistory) {
      debouncedSave(messages);
    }
  }, [messages, isLoadingHistory, debouncedSave]);
  
  useEffect(() => {
    fetch(HISTORY_API)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch history: ${res.statusText}`);
        return res.json();
      })
      .then((history: Message[]) => setMessages(history || []))
      .catch(error => {
        console.error("Error loading chat history:", error);
        setMessages([{
          id: 'error-message',
          text: 'Could not load chat history.',
          senderId: 'system',
          isError: true,
        }]);
      })
      .finally(() => setIsLoadingHistory(false));

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
              default:
                return prev;
            }
          });
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
            clientRef.current.end(true);
        }
    };
  }, [clientId]);
  
  const handleExit = async () => {
    if (isExiting) return;
    setIsExiting(true);

    await saveHistory(messagesRef.current);

    if (clientRef.current) {
        clientRef.current.end(true);
    }
    
    onLock();
  };

  const handleSendMessage = useCallback((inputText: string) => {
    if (!inputText.trim() || !clientRef.current?.connected) return;
    const newMessage: Message = { id: uuidv4(), text: inputText, senderId: clientId };
    setMessages(prev => [...prev, newMessage]);
    clientRef.current.publish(TOPIC, JSON.stringify({ type: 'new_message', payload: newMessage }));
  }, [clientId]);
  
  const handleDeleteMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.senderId !== clientId || !clientRef.current?.connected) return;
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    clientRef.current.publish(TOPIC, JSON.stringify({ type: 'delete_message', payload: { messageId } }));
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
    clientRef.current.publish(TOPIC, JSON.stringify({
      type: 'toggle_reaction',
      payload: { messageId, emoji, senderId: clientId }
    }));
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
