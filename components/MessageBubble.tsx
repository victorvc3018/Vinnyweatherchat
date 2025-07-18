
import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import UserIcon from './UserIcon';
import BotIcon from './BotIcon';
import TrashIcon from './icons/TrashIcon';
import SmileIcon from './icons/SmileIcon';

interface MessageBubbleProps {
  message: Message;
  localClientId: string;
  onDeleteMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, localClientId, onDeleteMessage, onToggleReaction }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const bubbleContainerRef = useRef<HTMLDivElement>(null);

  if (message.senderId === 'system') {
    return (
      <div className="text-center text-sm text-gray-400 my-4 font-medium">
        {message.text}
      </div>
    );
  }
  
  const isLocalUser = message.senderId === localClientId;

  const bubbleClasses = isLocalUser
    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-none shadow-lg shadow-blue-600/20'
    : 'bg-gray-800/40 backdrop-blur-sm border border-white/10 text-gray-200 rounded-bl-none';
  
  const alignmentClasses = isLocalUser
    ? 'justify-end'
    : 'justify-start';

  const textColor = message.isError ? 'text-red-300' : 'text-gray-100';

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(isEmojiPickerVisible) setIsEmojiPickerVisible(false);
    setIsMenuOpen(prev => !prev);
  }

  const handleEmojiPickerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEmojiPickerVisible(prev => !prev);
  }

  const handleEmojiSelect = (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation();
    onToggleReaction(message.id, emoji);
    setIsEmojiPickerVisible(false);
    setIsMenuOpen(false);
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteMessage(message.id);
    setIsMenuOpen(false);
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bubbleContainerRef.current && !bubbleContainerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsEmojiPickerVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={bubbleContainerRef}
      className={`group relative flex items-end gap-3 my-1 ${alignmentClasses}`}
    >
      {!isLocalUser && (
        <div className="flex-shrink-0 self-start">
          <BotIcon />
        </div>
      )}
      <div className="flex flex-col relative">
        {!isLocalUser && (
            <span className="text-xs text-gray-400 ml-3 mb-1 font-mono">
                {message.senderId.substring(12, 20)}
            </span>
        )}
        <div
            className={`px-4 py-3 rounded-2xl max-w-lg md:max-w-2xl transition-all duration-300 cursor-pointer ${bubbleClasses}`}
            onClick={handleToggleMenu}
        >
            <p className={`whitespace-pre-wrap ${textColor}`}>{message.text}</p>
        </div>

        {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className={`flex gap-1 mt-1.5 ${isLocalUser ? 'justify-end' : 'justify-start'}`}>
                {Object.entries(message.reactions).map(([emoji, reactors]) => (
                    reactors.length > 0 && (
                        <div key={emoji} className="flex items-center gap-1 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full px-2 py-0.5 text-xs">
                            <span>{emoji}</span>
                            <span className="font-medium text-gray-300">{reactors.length}</span>
                        </div>
                    )
                ))}
            </div>
        )}

        {(isMenuOpen || isEmojiPickerVisible) && (
            <div className={`absolute top-0 -mt-10 flex gap-1 p-1 bg-black/40 backdrop-blur-xl rounded-full shadow-lg border border-white/10 transition-all duration-200 z-10
                ${isLocalUser ? 'right-4' : 'left-4'}
                ${isMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
            `}>
                <button onClick={handleEmojiPickerToggle} className="group p-1.5 rounded-full hover:bg-white/20 transition-colors"><SmileIcon/></button>
                {isLocalUser && <button onClick={handleDelete} className="group p-1.5 rounded-full hover:bg-white/20 transition-colors"><TrashIcon/></button>}
            </div>
        )}
        
        {isMenuOpen && isEmojiPickerVisible && (
            <div className={`absolute z-20 top-0 -mt-24 flex gap-2 p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl
                 ${isLocalUser ? 'right-0' : 'left-0'}
                 transition-all duration-200
                 ${isEmojiPickerVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
            `}
            >
                {EMOJI_REACTIONS.map(emoji => (
                    <button key={emoji} onClick={(e) => handleEmojiSelect(e, emoji)} className="text-2xl p-1 rounded-md hover:bg-white/20 transition-transform duration-150 ease-in-out hover:scale-125">
                        {emoji}
                    </button>
                ))}
            </div>
        )}

      </div>
      {isLocalUser && (
        <div className="flex-shrink-0 self-start">
          <UserIcon />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
