
import React, { useState, useEffect } from 'react';

interface DeleteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  passcode: string;
}

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DeleteHistoryModal: React.FC<DeleteHistoryModalProps> = ({ isOpen, onClose, onConfirm, passcode: correctPasscode }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);
  
  const handleConfirm = async () => {
    if (input !== correctPasscode) {
      setError('Invalid Passcode');
      setInput('');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
        await onConfirm();
    } catch (e) {
        setError('Failed to delete history');
    } finally {
        setIsLoading(false);
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-red-500/50 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-red-400">Delete All History?</h2>
        <p className="text-gray-400 mt-2 mb-6">
          This action is irreversible and will permanently delete the chat history for <span className="font-bold text-gray-300">all users</span>.
        </p>
        
        <div className="space-y-2">
            <label htmlFor="passcode" className="text-sm font-medium text-gray-300">Enter Passcode to Confirm</label>
            <input
                id="passcode"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className={`w-full text-center tracking-[0.5em] text-lg bg-gray-800 border-2 ${error ? 'border-red-500 animate-shake' : 'border-gray-700'} rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all`}
                maxLength={correctPasscode.length}
                autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || input !== correctPasscode}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-2"
          >
            {isLoading ? <LoadingSpinner /> : 'Confirm & Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteHistoryModal;
