import React, { useState } from 'react';

interface LoginGateProps {
  onLoginSuccess: () => void;
}

const OBFUSCATED_PASSCODE_NUMS = [128, 120, 132, 126, 137, 134, 134, 139];

const getDecryptedPasscode = (): string => {
  return OBFUSCATED_PASSCODE_NUMS.map(charNum =>
    String.fromCharCode(charNum - 23)
  ).join('');
};

const LoginGate: React.FC<LoginGateProps> = ({ onLoginSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.toLowerCase() === getDecryptedPasscode()) { // Compare with decrypted passcode
      sessionStorage.setItem('hasLoggedIn', 'true'); // Use sessionStorage
      onLoginSuccess();
    } else {
      setError('Incorrect passcode. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" aria-hidden="true" />
      
      <div 
        className="relative glass w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-white/10 text-center flex flex-col items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mb-6">
          <span className="text-white font-black text-3xl">D</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2" id="login-title">Access Daily Digest</h2>
        <p className="text-slate-400 text-sm mb-6">Enter the secret passcode to unlock your daily tech news.</p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <input
            type="password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setError(''); // Clear error on input change
            }}
            placeholder="Enter passcode"
            className="w-full bg-slate-800/50 border border-white/10 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-slate-500"
            aria-label="Passcode input"
            aria-describedby={error ? "passcode-error" : undefined}
          />
          {error && (
            <p id="passcode-error" className="text-rose-400 text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            aria-label="Unlock"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginGate;