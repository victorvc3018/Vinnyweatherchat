
import React, { useEffect, useRef } from 'react';
import type { Message } from '../types';
import MessageBubble from './MessageBubble';

const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


interface ChatWindowProps {
  messages: Message[];
  localClientId: string;
  isLoading: boolean;
  onDeleteMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onSetReplyTo: (message: Message) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, localClientId, isLoading, onDeleteMessage, onToggleReaction, onSetReplyTo }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <main className="h-full flex flex-col items-center justify-center text-center p-6">
        <LoadingSpinner />
        <p className="text-gray-400 mt-4 text-lg">Loading chat history...</p>
        <p className="text-gray-500 text-sm">Please wait a moment.</p>
      </main>
    )
  }

  return (
    <main className="h-full overflow-y-auto pt-24 pb-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-2">
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            localClientId={localClientId}
            onDeleteMessage={onDeleteMessage}
            onToggleReaction={onToggleReaction}
            onSetReplyTo={onSetReplyTo}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </main>
  );
};

export default ChatWindow;
