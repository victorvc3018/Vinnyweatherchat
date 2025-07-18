
import React, { useState } from 'react';
import WeatherApp from './WeatherApp';
import PasscodeScreen from './PasscodeScreen';
import ChatApp from './ChatApp';

type View = 'weather' | 'passcode' | 'chat';

const App: React.FC = () => {
  const [view, setView] = useState<View>('weather');

  const handleUnlockRequest = () => {
    setView('passcode');
  };

  const handlePasscodeSuccess = () => {
    setView('chat');
  };
  
  const handleLockRequest = () => {
    setView('weather');
  };

  const handleBackFromPasscode = () => {
    setView('weather');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900">
      <div className="view-container">
        {/* The WeatherApp is always rendered but hidden to preserve its state */}
        <div className={`view ${view !== 'weather' ? 'hidden' : ''}`}>
          <WeatherApp onUnlockRequest={handleUnlockRequest} />
        </div>
        
        {/* The Passcode screen is only rendered when needed */}
        {view === 'passcode' && (
          <div className="view passcode-view">
            <PasscodeScreen onSuccess={handlePasscodeSuccess} onBack={handleBackFromPasscode} />
          </div>
        )}
        
        {/* The ChatApp is only rendered when the view is 'chat'. It will mount/unmount on view change. */}
        {view === 'chat' && (
          <div className="view">
            <ChatApp onLock={handleLockRequest} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
