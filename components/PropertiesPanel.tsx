import React, { useState, useEffect, useRef } from 'react';
import { Place, Transition } from '../types';
import { DeleteIcon } from './icons';

interface PropertiesPanelProps {
    element: (Place | Transition) | null;
    onUpdate: (id: string, updates: Partial<Place> | Partial<Transition>) => void;
    onDelete: (id: string) => void;
}

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input {...props} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
);


const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdate, onDelete }) => {
    const [label, setLabel] = useState('');
    const [initialTokens, setInitialTokens] = useState('0');
    const deleteButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (element) {
            setLabel(element.label);
            if ('initialTokens' in element) {
                setInitialTokens(String(element.initialTokens));
            }
        }
    }, [element]);
    
    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLabel(e.target.value);
    };

    const handleTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInitialTokens(e.target.value);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (!element || e.relatedTarget === deleteButtonRef.current) {
            return;
        }
        
        const currentLabel = element.label;
        const currentTokens = 'initialTokens' in element ? String(element.initialTokens) : '0';

        const updates: Partial<Place> | Partial<Transition> = {};
        let hasChanges = false;

        if (label !== currentLabel) {
            updates.label = label;
            hasChanges = true;
        }

        if ('initialTokens' in element) {
            const tokens = parseInt(initialTokens, 10);
            const finalTokens = isNaN(tokens) ? 0 : tokens;
            if (String(finalTokens) !== currentTokens) {
                (updates as Partial<Place>).initialTokens = finalTokens;
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            onUpdate(element.id, updates);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    if (!element) {
        return (
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex-grow flex items-center justify-center h-full">
                <p className="text-gray-400 text-center">Sélectionnez un élément sur le canevas pour voir et modifier ses propriétés.</p>
            </div>
        );
    }

    const isPlace = 'initialTokens' in element;

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col h-full">
            <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-4">
                Propriétés de : <span className="text-indigo-400 font-mono">{element.label}</span>
            </h3>
            
            <div className="flex-grow space-y-4">
                <FormInput
                    label="Label"
                    type="text"
                    value={label}
                    onChange={handleLabelChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
                {isPlace && (
                    <FormInput
                        label="Jetons Initiaux"
                        type="number"
                        min="0"
                        value={initialTokens}
                        onChange={handleTokensChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                    />
                )}
            </div>
            
            <button
                ref={deleteButtonRef}
                onClick={() => onDelete(element.id)}
                className="mt-4 flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                aria-label="Supprimer l'élément"
            >
                <DeleteIcon className="w-5 h-5" />
                <span>Supprimer</span>
            </button>
        </div>
    );
};

export default PropertiesPanel;