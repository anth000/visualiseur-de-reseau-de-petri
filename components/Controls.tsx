import React, { useRef } from 'react';
import { PlayIcon, PauseIcon, ResetIcon, UploadIcon, PrevIcon, NextIcon } from './icons';
import { SPEEDS } from '../constants';

interface ControlsProps {
  isPlaying: boolean;
  isLogLoaded: boolean;
  speed: number;
  currentStep: number;
  traceLength: number;
  caseIds: string[];
  selectedCaseId: string;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onFileChange: (file: File) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onCaseIdChange: (caseId: string) => void;
}

const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  isLogLoaded,
  speed,
  currentStep,
  traceLength,
  caseIds,
  selectedCaseId,
  onPlayPause,
  onReset,
  onSpeedChange,
  onFileChange,
  onPrevStep,
  onNextStep,
  onCaseIdChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
    // Réinitialise la valeur pour permettre de retélécharger le même fichier
    if(event.target) {
        event.target.value = '';
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg space-y-4">
      <h3 className="text-lg font-semibold text-gray-300 text-center">Contrôles</h3>
      
      <div className="flex items-center justify-center gap-4">
        <button
            onClick={onPrevStep}
            disabled={!isLogLoaded || currentStep === 0}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Étape précédente"
        >
            <PrevIcon className="w-6 h-6" />
        </button>
        <button
            onClick={onPlayPause}
            disabled={!isLogLoaded}
            className="p-4 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            aria-label={isPlaying ? 'Mettre en pause' : 'Démarrer'}
        >
            {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
        </button>
        <button
            onClick={onNextStep}
            disabled={!isLogLoaded || currentStep >= traceLength}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Étape suivante"
        >
            <NextIcon className="w-6 h-6" />
        </button>
      </div>

      <div>
        <label htmlFor="speed" className="block text-sm font-semibold mb-1 text-gray-300">
          Vitesse de lecture
        </label>
        <div className="flex items-center gap-2">
            <input
            id="speed"
            type="range"
            min="0"
            max={SPEEDS.length - 1}
            value={SPEEDS.findIndex(s => s.value === speed)}
            onChange={(e) => onSpeedChange(SPEEDS[parseInt(e.target.value, 10)].value)}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-mono w-16 text-center">{SPEEDS.find(s=> s.value === speed)?.label}</span>
        </div>
      </div>
      
       {isLogLoaded && caseIds.length > 0 && (
          <div>
            <label htmlFor="case_id_filter" className="block text-sm font-semibold mb-1 text-gray-300">
              Filtrer par Case ID
            </label>
            <select
              id="case_id_filter"
              value={selectedCaseId}
              onChange={(e) => onCaseIdChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Tous les cas</option>
              {caseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
        )}

       <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-700">
           <button
            onClick={onReset}
            disabled={!isLogLoaded}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-300"
            aria-label="Réinitialiser la simulation"
          >
            <ResetIcon className="w-5 h-5" />
            <span>Réinitialiser</span>
          </button>
           <button
            onClick={handleUploadClick}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md transition duration-300"
          >
            <UploadIcon className="w-5 h-5" />
            <span>Télécharger</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".csv,.jsonl"
            aria-hidden="true"
          />
        </div>
    </div>
  );
};

export default Controls;