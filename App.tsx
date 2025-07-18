
import React, { useState } from 'react';
import WeatherApp from './WeatherApp';
import PasscodeScreen from './PasscodeScreen';
import ChatApp from './ChatApp';

type View = 'weather' | 'passcode' | 'chat';

const App: React.FC = () => {
  const [view, setView] = useState<View>('weather');
  // Once the user unlocks the chat, we keep it mounted in the background for the session.
  const [hasChatBeenUnlocked, setHasChatBeenUnlocked] = useState(false);

  const handleUnlockRequest = () => {
    setView('passcode');
  };

  const handlePasscodeSuccess = () => {
    // Once unlocked, we ensure the chat component is rendered and switch the view.
    // It will now stay mounted for the rest of the session.
    if (!hasChatBeenUnlocked) {
      setHasChatBeenUnlocked(true);
    }
    setView('chat');
  };
  
  const handleLockRequest = () => {
    // Just switch the view back to the weather app.
    // The chat component remains mounted and connected in the background.
    setView('weather');
  };

  const handleBackFromPasscode = () => {
    setView('weather');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900">
      <div className="view-container">
        <div className={`view ${view !== 'weather' ? 'hidden' : ''}`}>
          <WeatherApp onUnlockRequest={handleUnlockRequest} />
        </div>
        
        <div className={`view passcode-view ${view !== 'passcode' ? 'hidden' : ''}`}>
          <PasscodeScreen onSuccess={handlePasscodeSuccess} onBack={handleBackFromPasscode} />
        </div>
        
        {/* Conditionally render ChatApp. Once rendered, it stays in the DOM. */}
        {hasChatBeenUnlocked && (
          <div className={`view ${view !== 'chat' ? 'hidden' : ''}`}>
            <ChatApp onLock={handleLockRequest} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
