import React from 'react';
import { GeminiModel } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: GeminiModel) => void;
  selectedModel: GeminiModel;
  onModelChange: (model: GeminiModel) => void;
  onClearCache: () => void;
  onLogout: () => void; // New prop for clearing login state
}

const MODELS: { id: GeminiModel; name: string; description: string }[] = [
  { id: 'gemini-flash-lite-latest', name: 'Gemini 2.5 Flash-Lite', description: 'Fastest for basic text generation with low latency.' },
  { id: 'gemini-flash-latest', name: 'Gemini 2.5 Flash (Latest)', description: 'General purpose Flash model from the 2.5 series, suitable for broad text tasks.' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedModel,
  onModelChange,
  onClearCache,
  onLogout, // Destructure new prop
}) => {
  if (!isOpen) return null;

  const handleSave = () => {
    onSave(selectedModel);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      
      <div className="relative glass w-full max-w-xl max-h-[90vh] rounded-3xl overflow-y-auto shadow-2xl border border-white/10 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-white/10 p-6 flex items-center justify-between">
          <h2 id="settings-title" className="text-xl font-bold text-white line-clamp-1">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <section>
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Gemini Model Selection
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Choose the Gemini model that best fits your needs. Faster models might be less capable for complex tasks.
            </p>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value as GeminiModel)}
              className="w-full bg-slate-800/50 border border-white/10 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              aria-label="Select Gemini Model"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-slate-500 text-xs mt-2">
              {MODELS.find(m => m.id === selectedModel)?.description}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Data Management & Security
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Clear all cached news data to force a fresh fetch from the model.
            </p>
            <button
              onClick={onClearCache}
              className="w-full px-6 py-2 bg-rose-700/20 hover:bg-rose-700/30 text-rose-300 rounded-xl transition-colors font-bold text-base mb-4"
              aria-label="Clear all news cache"
            >
              Clear All News Cache
            </button>
            <button
              onClick={onLogout}
              className="w-full px-6 py-2 bg-slate-700/20 hover:bg-slate-700/30 text-slate-300 rounded-xl transition-colors font-bold text-base"
              aria-label="Log out of the application"
            >
              Log Out
            </button>
          </section>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 z-10 glass border-t border-white/10 p-6 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
            aria-label="Cancel and close settings"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold"
            aria-label="Save settings"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;