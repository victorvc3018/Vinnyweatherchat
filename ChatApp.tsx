
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, ReplyContext } from './types';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ExitIcon from './components/ExitIcon';
import TrashIcon from './components/icons/TrashIcon';
import DeleteHistoryModal from './components/DeleteHistoryModal';
import { v4 as uuidv4 } from 'uuid';
import mqtt from 'mqtt';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const CHAT_TOPIC = 'pro-react-chat-app/realtime-chat-v3';
const HISTORY_TOPIC = 'pro-react-chat-app/history-v3';
const PASSCODE = '3021';

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

type ActionType = 'new_message' | 'delete_message' | 'toggle_reaction' | 'clear_all_history';

interface ActionPayload {
  type: ActionType;
  payload?: any;
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const saveHistory = useCallback((msgs: Message[]) => {
    if (clientRef.current && clientRef.current.connected) {
      const persistentMessages = msgs.filter(m => m.senderId !== 'system' && !m.isError);
      clientRef.current.publish(HISTORY_TOPIC, JSON.stringify(persistentMessages), { retain: true, qos: 1 });
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
  
  const debouncedSave = useRef(debounce((msgs: Message[]) => saveHistory(msgs), 1500)).current;

  useEffect(() => {
    if (!isLoadingHistory) {
      debouncedSave(messages);
    }
  }, [messages, isLoadingHistory, debouncedSave]);
  
  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, { clientId });
    clientRef.current = client;

    let historyReceived = false;
    const historyTimeout = setTimeout(() => {
        if (!historyReceived) {
            setIsLoadingHistory(false);
            client.unsubscribe(HISTORY_TOPIC, () => client.subscribe(CHAT_TOPIC, { qos: 1 }));
        }
    }, 4000);

    client.on('connect', () => {
      setConnectionStatus('Connected');
      client.subscribe(HISTORY_TOPIC, { qos: 1 });
    });

    client.on('message', (topic, payload) => {
      try {
        const payloadString = payload.toString();
        if (!payloadString) { // Handle empty retained message for history clearing
          if (topic === HISTORY_TOPIC) {
            setMessages([]);
            setIsLoadingHistory(false);
            historyReceived = true;
            clearTimeout(historyTimeout);
            client.unsubscribe(HISTORY_TOPIC, () => client.subscribe(CHAT_TOPIC, { qos: 1 }));
          }
          return;
        }

        if (topic === HISTORY_TOPIC && !historyReceived) {
            historyReceived = true;
            clearTimeout(historyTimeout);
            setMessages(JSON.parse(payloadString) || []);
            setIsLoadingHistory(false);
            client.unsubscribe(HISTORY_TOPIC, () => client.subscribe(CHAT_TOPIC, { qos: 1 }));
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
                case 'clear_all_history':
                  return [];
                default: return prev;
              }
            });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    client.on('reconnect', () => setConnectionStatus('Reconnecting...'));
    client.on('error', (err) => {
        setConnectionStatus('Connection Error');
        client.end();
    });
    client.on('close', () => setConnectionStatus('Disconnected'));

    return () => {
        clearTimeout(historyTimeout);
        if (clientRef.current) clientRef.current.end(true);
    };
  }, [clientId]);
  
  const handleExit = () => {
    if (isExiting) return;
    setIsExiting(true);
    saveHistory(messagesRef.current);
    setTimeout(() => {
        if (clientRef.current) clientRef.current.end(true);
        onLock();
    }, 200);
  };

  const handleSendMessage = useCallback((inputText: string) => {
    if (!inputText.trim() || !clientRef.current?.connected) return;
    
    let replyContext: ReplyContext | undefined = undefined;
    if (replyingTo) {
      replyContext = {
        messageId: replyingTo.id,
        text: replyingTo.text,
        senderId: replyingTo.senderId,
      };
    }
    
    const newMessage: Message = { 
      id: uuidv4(), 
      text: inputText, 
      senderId: clientId,
      replyTo: replyContext,
    };

    setMessages(prev => [...prev, newMessage]);
    clientRef.current.publish(CHAT_TOPIC, JSON.stringify({ type: 'new_message', payload: newMessage }), { qos: 1 });
    setReplyingTo(null); // Clear reply state after sending
  }, [clientId, replyingTo]);
  
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
  
  const handleSetReplyTo = useCallback((message: Message) => {
    setReplyingTo(message);
  }, []);

  const handleDeleteAllHistory = useCallback(() => {
    if (!clientRef.current?.connected) return;
    // Clear the retained message by publishing an empty payload
    clientRef.current.publish(HISTORY_TOPIC, '', { retain: true, qos: 1 });
    // Tell all other clients to clear their state
    clientRef.current.publish(CHAT_TOPIC, JSON.stringify({ type: 'clear_all_history' }), { qos: 1 });
    // Clear our own state
    setMessages([]);
    setIsDeleteModalOpen(false);
  }, []);

  const isConnected = connectionStatus === 'Connected';

  return (
    <>
      <DeleteHistoryModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAllHistory}
        passcode={PASSCODE}
      />
      <div className="relative h-screen bg-transparent text-white antialiased">
          <ChatWindow 
              messages={messages} 
              localClientId={clientId} 
              isLoading={isLoadingHistory}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              onSetReplyTo={handleSetReplyTo}
          />
          <header className="absolute top-0 left-0 right-0 z-10 p-4 shadow-lg bg-black/30 backdrop-blur-xl border-b border-white/10 flex items-center justify-center">
              <button onClick={() => setIsDeleteModalOpen(true)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Delete all history">
                  <TrashIcon className="w-5 h-5" />
              </button>
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
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <ChatInput 
                onSendMessage={handleSendMessage} 
                disabled={!isConnected || isLoadingHistory}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
            />
          </div>
      </div>
    </>
  );
};

export default ChatApp;
