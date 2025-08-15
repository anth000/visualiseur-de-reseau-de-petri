import React, { useState } from 'react';
import { PetriNet, Place, Transition, Arc } from '../types';

interface PetriNetEditorProps {
    net: PetriNet;
    setNet: React.Dispatch<React.SetStateAction<PetriNet>>;
}

const PetriNetEditor: React.FC<PetriNetEditorProps> = ({ net, setNet }) => {
    
    // State for forms
    const [newPlace, setNewPlace] = useState({ label: '', initialTokens: '0', x: '100', y: '100' });
    const [newTransition, setNewTransition] = useState({ label: '', x: '100', y: '100' });
    const [newArc, setNewArc] = useState({ sourceId: '', targetId: '' });
    const [arcError, setArcError] = useState('');

    const handleAddPlace = (e: React.FormEvent) => {
        e.preventDefault();
        const place: Place = {
            id: `p${Date.now()}`,
            label: newPlace.label || `Place ${net.places.length + 1}`,
            initialTokens: parseInt(newPlace.initialTokens, 10) || 0,
            x: parseInt(newPlace.x, 10) || 100,
            y: parseInt(newPlace.y, 10) || 100,
        };
        setNet(prev => ({ ...prev, places: [...prev.places, place] }));
        setNewPlace({ label: '', initialTokens: '0', x: '100', y: '100' });
    };

    const handleAddTransition = (e: React.FormEvent) => {
        e.preventDefault();
        const transition: Transition = {
            id: `t${Date.now()}`,
            label: newTransition.label || `Transition ${net.transitions.length + 1}`,
            x: parseInt(newTransition.x, 10) || 100,
            y: parseInt(newTransition.y, 10) || 100,
        };
        setNet(prev => ({ ...prev, transitions: [...prev.transitions, transition] }));
        setNewTransition({ label: '', x: '100', y: '100' });
    };
    
    const handleAddArc = (e: React.FormEvent) => {
        e.preventDefault();
        setArcError('');
        const { sourceId, targetId } = newArc;
        if (!sourceId || !targetId || sourceId === targetId) {
            setArcError('Source et cible doivent être définies et différentes.');
            return;
        }

        const sourceIsPlace = net.places.some(p => p.id === sourceId);
        const targetIsPlace = net.places.some(p => p.id === targetId);

        if (sourceIsPlace === targetIsPlace) {
            setArcError('Les arcs doivent connecter une place à une transition (et vice-versa).');
            return;
        }

        const arc: Arc = {
            id: `a${Date.now()}`,
            sourceId,
            targetId,
        };
        setNet(prev => ({ ...prev, arcs: [...prev.arcs, arc] }));
        setNewArc({ sourceId: '', targetId: '' });
    };

    const handleDelete = (type: 'places' | 'transitions' | 'arcs', id: string) => {
        setNet(prev => {
            const newNet = { ...prev };
            (newNet[type] as any) = (newNet[type] as any[]).filter(item => item.id !== id);
            
            // Also remove connected arcs when a node is deleted
            if (type === 'places' || type === 'transitions') {
                newNet.arcs = newNet.arcs.filter(arc => arc.sourceId !== id && arc.targetId !== id);
            }
            
            return newNet;
        });
    };
    
    const allNodes = [...net.places, ...net.transitions];

    const FormInput = ({ label, ...props }) => (
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <input {...props} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
    );

    const FormSelect = ({ label, value, onChange, children }) => (
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <select value={value} onChange={onChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500">
                {children}
            </select>
        </div>
    );

    const EditorSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-indigo-300 border-b border-gray-700 pb-2">{title}</h3>
            {children}
        </div>
    );

    const ItemList: React.FC<{ items: any[], type: 'places' | 'transitions' | 'arcs' }> = ({ items, type }) => (
        <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
            {items.length === 0 ? <p className="text-gray-500 italic">Aucun élément.</p> : items.map(item => (
                <div key={item.id} className="bg-gray-700 p-2 rounded-md flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-300">
                        {type === 'arcs' ? `${net.places.find(p=>p.id === item.sourceId)?.label || net.transitions.find(t=>t.id === item.sourceId)?.label} → ${net.places.find(p=>p.id === item.targetId)?.label || net.transitions.find(t=>t.id === item.targetId)?.label}` : `${item.label} (id: ${item.id})`}
                    </span>
                    <button onClick={() => handleDelete(type, item.id)} className="text-red-400 hover:text-red-300 font-bold text-lg">&times;</button>
                </div>
            ))}
        </div>
    );

    return (
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Places Editor */}
            <EditorSection title="Places">
                <form onSubmit={handleAddPlace} className="space-y-4 mb-4">
                    <FormInput label="Label" value={newPlace.label} onChange={e => setNewPlace({ ...newPlace, label: e.target.value })} placeholder="Nom de la place" />
                    <FormInput label="Jetons Initiaux" value={newPlace.initialTokens} onChange={e => setNewPlace({ ...newPlace, initialTokens: e.target.value })} type="number" min="0" />
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput label="X" value={newPlace.x} onChange={e => setNewPlace({ ...newPlace, x: e.target.value })} type="number" />
                        <FormInput label="Y" value={newPlace.y} onChange={e => setNewPlace({ ...newPlace, y: e.target.value })} type="number" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md">Ajouter Place</button>
                </form>
                <ItemList items={net.places} type="places" />
            </EditorSection>

            {/* Transitions Editor */}
            <EditorSection title="Transitions">
                 <form onSubmit={handleAddTransition} className="space-y-4 mb-4">
                    <FormInput label="Label" value={newTransition.label} onChange={e => setNewTransition({ ...newTransition, label: e.target.value })} placeholder="Nom de la transition" />
                     <div className="grid grid-cols-2 gap-4">
                        <FormInput label="X" value={newTransition.x} onChange={e => setNewTransition({ ...newTransition, x: e.target.value })} type="number" />
                        <FormInput label="Y" value={newTransition.y} onChange={e => setNewTransition({ ...newTransition, y: e.target.value })} type="number" />
                    </div>
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md">Ajouter Transition</button>
                </form>
                <ItemList items={net.transitions} type="transitions" />
            </EditorSection>

            {/* Arcs Editor */}
            <EditorSection title="Arcs">
                 <form onSubmit={handleAddArc} className="space-y-4 mb-4">
                    <FormSelect label="Source" value={newArc.sourceId} onChange={e => setNewArc({ ...newArc, sourceId: e.target.value })}>
                        <option value="">-- Sélectionner --</option>
                        <optgroup label="Places">
                            {net.places.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </optgroup>
                        <optgroup label="Transitions">
                            {net.transitions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </optgroup>
                    </FormSelect>
                    <FormSelect label="Cible" value={newArc.targetId} onChange={e => setNewArc({ ...newArc, targetId: e.target.value })}>
                         <option value="">-- Sélectionner --</option>
                        <optgroup label="Places">
                            {net.places.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </optgroup>
                        <optgroup label="Transitions">
                            {net.transitions.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </optgroup>
                    </FormSelect>
                    {arcError && <p className="text-red-400 text-sm">{arcError}</p>}
                    <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-md">Ajouter Arc</button>
                </form>
                <ItemList items={net.arcs} type="arcs" />
            </EditorSection>
        </main>
    );
};

export default PetriNetEditor;
