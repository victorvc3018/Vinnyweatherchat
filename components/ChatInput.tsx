import React, { useState } from 'react';
import SendIcon from './SendIcon';
import type { Message } from '../types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
  replyingTo: Message | null;
  onCancelReply: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled, replyingTo, onCancelReply }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <footer className="p-2 sm:p-4 bg-black/30 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-4xl mx-auto">
        {replyingTo && (
          <div className="bg-gray-800/60 rounded-t-lg px-4 py-2 text-sm">
            <div className="flex justify-between items-center">
              <div className="text-gray-300">
                Replying to <span className="font-semibold text-purple-400">{replyingTo.senderId.substring(12, 20)}</span>
              </div>
              <button onClick={onCancelReply} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <p className="text-gray-400 truncate mt-1 border-l-2 border-purple-400 pl-2">
              {replyingTo.text}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Waiting to connect...' : 'Type a message...'}
            rows={1}
            className={`flex-1 bg-gray-800/50 text-gray-200 placeholder-gray-400 py-2 px-4 sm:py-3 sm:px-5 focus:outline-none focus:ring-2 focus:ring-purple-500/80 border border-transparent focus:border-purple-500 transition-all duration-300 resize-none max-h-40 ${replyingTo ? 'rounded-b-full rounded-t-none' : 'rounded-full'}`}
            disabled={disabled}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full p-2 sm:p-3 hover:scale-105 active:scale-100 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </footer>
  );
};

export default ChatInput;
