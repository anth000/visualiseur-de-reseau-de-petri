import React from 'react';
import { TraceEvent } from '../types';

interface TraceLogViewerProps {
  trace: TraceEvent[] | null;
  currentStep: number;
}

const TraceLogViewer: React.FC<TraceLogViewerProps> = ({ trace, currentStep }) => {
  if (!trace) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex-grow flex items-center justify-center">
        <p className="text-gray-400 text-center">Veuillez télécharger un journal de traces (CSV ou JSONL).</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex-grow flex flex-col min-h-0">
      <h3 className="text-lg font-semibold mb-3 text-gray-300 flex-shrink-0">Aperçu CSV</h3>
      <div className="overflow-y-auto pr-2 max-h-80 lg:max-h-96">
        <ul className="space-y-2">
          {trace.map((event) => (
            <li
              key={event.step}
              className={`p-3 rounded-md text-sm transition-all duration-300 ${
                event.step === currentStep
                  ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                 {Object.entries(event.data).map(([key, value]) => (
                  <span key={key} className="whitespace-nowrap">
                    <span className="font-normal opacity-70">{key}:</span>{' '}
                    <span className="font-semibold">{value}</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TraceLogViewer;