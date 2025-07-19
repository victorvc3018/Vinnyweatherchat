
import React, { useState, useEffect } from 'react';

interface PasscodeScreenProps {
    onSuccess: () => void;
    onBack: () => void;
}

const CORRECT_PASSCODE = '2005';

const PasscodeScreen: React.FC<PasscodeScreenProps> = ({ onSuccess, onBack }) => {
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (passcode.length === CORRECT_PASSCODE.length) {
            if (passcode === CORRECT_PASSCODE) {
                onSuccess();
            } else {
                setError('Invalid Passcode');
                setPasscode('');
            }
        } else if (error) {
            setError('');
        }
    }, [passcode, onSuccess, error]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*$/.test(value) && value.length <= CORRECT_PASSCODE.length) {
            setPasscode(value);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode === CORRECT_PASSCODE) {
            onSuccess();
        } else {
            setError('Invalid Passcode');
        }
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
             <div className="w-full max-w-sm text-center">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2">
                    Authorization Required
                </h1>
                <p className="text-gray-400 mb-8">Enter access code to proceed.</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={passcode}
                        onChange={handleInput}
                        maxLength={CORRECT_PASSCODE.length}
                        className={`w-full text-center tracking-[0.6em] sm:tracking-[1em] text-xl sm:text-2xl bg-gray-800 border-2 ${error ? 'border-red-500' : 'border-gray-700'} rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300`}
                        autoFocus
                    />
                     {error && <p className="text-red-400 mt-4 animate-shake">{error}</p>}
                </form>
                 <button 
                    onClick={onBack} 
                    className="mt-8 text-gray-500 hover:text-white transition-colors"
                >
                    Return to App
                </button>
            </div>
        </div>
    );
};

export default PasscodeScreen;
