import React, { useState, useEffect } from 'react';
import { Sun, Moon, Globe, Shield, RefreshCw, UserCheck, Wifi, WifiOff, Lock, Info, X } from 'lucide-react';
import { Language, Theme, UserRole, LanguagePack } from '../types';

interface HeaderProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Language;
  setLang: (l: Language) => void;
  role: UserRole;
  setRole: (r: UserRole) => void;
  isOffline: boolean;
  setIsOffline: (o: boolean) => void;
  t: LanguagePack;
  syncQueueLength: number;
  onSync: () => void;
  encryptionKey: string;
  setEncryptionKey: (k: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  setTheme,
  lang,
  setLang,
  role,
  setRole,
  isOffline,
  setIsOffline,
  t,
  syncQueueLength,
  onSync,
  encryptionKey,
  setEncryptionKey
}) => {
  const [showEncModal, setShowEncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Secure PIN switching states
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSyncClick = () => {
    setSyncing(true);
    setTimeout(() => {
      onSync();
      setSyncing(false);
    }, 1500);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRole = e.target.value as UserRole;
    if (selectedRole === role) return;

    if (selectedRole === 'guest') {
      // Swapping back to Guest requires no credentials
      setRole('guest');
    } else {
      // Mandor or Admin requires password validation
      setPendingRole(selectedRole);
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const handlePinPress = (num: string) => {
    if (pinInput.length >= 4 || isShaking) return;
    const newPin = pinInput + num;
    setPinInput(newPin);
    setPinError('');

    if (newPin.length === 4) {
      const correctPin = pendingRole === 'admin' ? '1234' : '5678';
      if (newPin === correctPin) {
        setRole(pendingRole!);
        setShowPinModal(false);
        setPendingRole(null);
        setPinInput('');
      } else {
        setIsShaking(true);
        setPinError(lang === 'id' ? 'PIN salah! Silakan coba lagi.' : 'Incorrect PIN! Please try again.');
        setTimeout(() => {
          setIsShaking(false);
          setPinInput('');
        }, 850);
      }
    }
  };

  const handleBackspace = () => {
    if (isShaking) return;
    setPinInput(prev => prev.slice(0, -1));
    setPinError('');
  };

  const handleCancel = () => {
    if (isShaking) return;
    setShowPinModal(false);
    setPendingRole(null);
    setPinInput('');
    setPinError('');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 dark:border-gray-800 dark:bg-gray-900/95 backdrop-blur-md px-4 py-3 shadow-sm transition-colors duration-200" id="eba-header">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Branding & App Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30">
              <span className="font-sans font-black text-white text-lg tracking-wider">EBA</span>
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg text-gray-900 dark:text-white leading-none tracking-tight">EBA PROJECT</h1>
              <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest">
                Contractor Platform
              </p>
            </div>
          </div>

          {/* Quick theme & lang toggle on mobile header bar */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle Theme"
              id="theme-toggle-mob"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1"
              id="lang-toggle-mob"
            >
              <Globe size={16} />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>
          </div>
        </div>

        {/* Global Control Bars */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          
          {/* User Role Selector */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1" id="role-selector-container">
            <UserCheck size={14} className="text-gray-400 dark:text-gray-500 mx-1.5" />
            <select
              value={role}
              onChange={handleRoleChange}
              className="bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300 pr-2 border-none outline-none cursor-pointer focus:ring-0"
              id="role-dropdown"
            >
              <option value="admin" className="dark:bg-gray-900">{t.admin}</option>
              <option value="mandor" className="dark:bg-gray-900">{t.mandor}</option>
              <option value="guest" className="dark:bg-gray-900">{t.guest}</option>
            </select>
          </div>

          {/* Online/Offline Simulator Switch */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isOffline
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
            }`}
            id="offline-toggle-btn"
          >
            {isOffline ? (
              <>
                <WifiOff size={14} />
                <span>{t.offlineMode}</span>
              </>
            ) : (
              <>
                <Wifi size={14} />
                <span>{t.syncCloud}</span>
              </>
            )}
          </button>

          {/* Sync Trigger and Queue count */}
          {syncQueueLength > 0 && (
            <button
              onClick={handleSyncClick}
              disabled={isOffline || syncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                isOffline 
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/15'
              }`}
              id="sync-now-btn"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? 'Syncing...' : `Sync ${syncQueueLength}`}</span>
            </button>
          )}

          {/* E2E Encryption Status Toggle */}
          <button
            onClick={() => setShowEncModal(true)}
            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center relative"
            title="End-to-End Encryption Status"
            id="e2e-status-btn"
          >
            <Shield size={15} />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          </button>

          {/* Theme & Language desktop toggle */}
          <div className="hidden sm:flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-800 pl-3">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle Theme"
              id="theme-toggle-desc"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5"
              id="lang-toggle-desc"
            >
              <Globe size={14} />
              <span className="text-xs font-bold uppercase">{lang}</span>
            </button>
          </div>

        </div>
      </div>
    </header>

      {/* Encryption Settings Modal */}
      {showEncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" id="encryption-modal">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-sans font-bold text-gray-900 dark:text-white">{t.encrypted}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Security & Privacy Protocol</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              {lang === 'id' 
                ? 'Semua data transaksi lokal dienkripsi menggunakan kunci rahasia sebelum disimpan di penyimpanan perangkat Anda dan disinkronkan ke cloud. Ini mencegah pembacaan data pihak ketiga.' 
                : 'All local transaction data is encrypted using a secret key before being written to your device storage and synchronized to the cloud. This prevents third-party eavesdropping.'}
            </p>

            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {lang === 'id' ? 'Kunci Enkripsi E2E' : 'E2E Encryption Key'}
              </label>
              <input
                type="password"
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter custom passcode"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowEncModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
                id="encryption-modal-close"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Switch Secure PIN Keypad Modal */}
      {showPinModal && pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" id="role-pin-modal">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-150 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
            
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <Lock size={12} className="text-orange-500 stroke-[2.5]" />
                {lang === 'id' ? 'Verifikasi Keamanan' : 'Security Verification'}
              </span>
              <button 
                onClick={() => {
                  setShowPinModal(false);
                  setPendingRole(null);
                  setPinInput('');
                }}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                id="close-pin-modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Avatar / Icon Indicator */}
            <div className="text-center space-y-1 mb-5">
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-2.5 shadow-md ${
                pendingRole === 'admin' 
                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30' 
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
              }`}>
                <UserCheck size={28} className="stroke-[2.2]" />
              </div>
              <h3 className="font-sans font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wide">
                {lang === 'id' 
                  ? `Masuk Sebagai ${pendingRole === 'admin' ? 'Administrator' : 'Mandor Lapangan'}` 
                  : `Enter as ${pendingRole === 'admin' ? 'Administrator' : 'Field Mandor'}`}
              </h3>
              <p className="text-[10.5px] text-gray-500 dark:text-gray-400 max-w-[220px] mx-auto leading-normal">
                {lang === 'id' 
                  ? 'Masukkan 4 digit PIN rahasia untuk memverifikasi tingkat wewenang Anda.' 
                  : 'Please enter the 4-digit PIN to authenticate your access clearance.'}
              </p>
            </div>

            {/* Password Dots Display */}
            <div className={`flex gap-4 justify-center py-2 mb-3 ${isShaking ? 'animate-bounce text-red-500' : ''}`} id="pin-display">
              {[0, 1, 2, 3].map((idx) => {
                const filled = idx < pinInput.length;
                return (
                  <div 
                    key={idx} 
                    className={`w-4.5 h-4.5 rounded-full border-2 transition-all duration-150 ${
                      isShaking
                        ? 'border-red-500 bg-red-500 scale-95'
                        : filled
                          ? pendingRole === 'admin'
                            ? 'bg-orange-500 border-orange-500 scale-110 shadow-[0_0_10px_rgba(249,115,22,0.4)]'
                            : 'bg-blue-500 border-blue-500 scale-110 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                          : 'border-gray-300 dark:border-gray-700 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            <div className="h-4 mb-2 text-center">
              {pinError && (
                <span className="text-[10.5px] font-bold text-red-600 dark:text-red-400">
                  {pinError}
                </span>
              )}
            </div>

            {/* Numerical Numpad Pad Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-[230px] mx-auto" id="pin-keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinPress(num)}
                  className="w-13 h-13 rounded-full flex items-center justify-center text-sm font-extrabold bg-gray-50 dark:bg-gray-800 border border-gray-100/60 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors shadow-sm active:scale-90"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleCancel}
                className="w-13 h-13 rounded-full flex items-center justify-center text-[10px] font-extrabold uppercase text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handlePinPress('0')}
                className="w-13 h-13 rounded-full flex items-center justify-center text-sm font-extrabold bg-gray-50 dark:bg-gray-800 border border-gray-100/60 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors shadow-sm active:scale-90"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="w-13 h-13 rounded-full flex items-center justify-center text-[10px] font-extrabold uppercase text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {lang === 'id' ? 'Hapus' : 'Del'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
