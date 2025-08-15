
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PetriNetCanvas from './components/PetriNetCanvas';
import Controls from './components/Controls';
import TraceLogViewer from './components/TraceLogViewer';
import EditorToolbar, { EditorTool } from './components/EditorToolbar';
import PropertiesPanel from './components/PropertiesPanel';
import { SAMPLE_PETRI_NET, SPEEDS } from './constants';
import { parseTraceLog } from './services/csvParser';
import { TraceEvent, TransitionWithIO, PetriNet, Place, Transition, Arc } from './types';

type Mode = 'visualize' | 'edit';

const App: React.FC = () => {
  const [petriNet, setPetriNet] = useState<PetriNet>(SAMPLE_PETRI_NET);
  const [tokenState, setTokenState] = useState<Map<string, number>>(new Map());
  
  // Trace states
  const [fullTrace, setFullTrace] = useState<TraceEvent[] | null>(null);
  const [filteredTrace, setFilteredTrace] = useState<TraceEvent[] | null>(null);
  const [availableCaseIds, setAvailableCaseIds] = useState<string[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('all');

  // Simulation states
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(SPEEDS[2].value);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('visualize');

  // Editor state
  const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const [activeTool, setActiveTool] = useState<EditorTool | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [arcSourceId, setArcSourceId] = useState<string | null>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);


  const { transitionMap, transitionLabelToIdMap } = useMemo(() => {
    const tMap = new Map<string, TransitionWithIO>();
    const labelMap = new Map<string, string>();
    petriNet.transitions.forEach(t => {
      const inputPlaceIds = petriNet.arcs
        .filter(arc => arc.targetId === t.id)
        .map(arc => arc.sourceId);
      const outputPlaceIds = petriNet.arcs
        .filter(arc => arc.sourceId === t.id)
        .map(arc => arc.targetId);
      tMap.set(t.id, { id: t.id, label: t.label, inputPlaceIds, outputPlaceIds });
      labelMap.set(t.label, t.id);
    });
    return { transitionMap: tMap, transitionLabelToIdMap: labelMap };
  }, [petriNet]);

  const initializeTokenState = useCallback(() => {
    const initialTokens = new Map<string, number>();
    const startPlace = petriNet.places.find(p => p.label.toLowerCase() === 'start');

    petriNet.places.forEach(place => {
      // Is this the start place and is a trace loaded?
      if (startPlace && place.id === startPlace.id && fullTrace) {
        if (selectedCaseId === 'all') {
          // If "all" is selected, use number of unique cases. Default to 1 if no cases found but trace exists.
          initialTokens.set(place.id, availableCaseIds.length > 0 ? availableCaseIds.length : 1);
        } else {
          // A specific case is selected, so it gets 1 token.
          initialTokens.set(place.id, 1);
        }
      } else {
        // For any other place, or if no trace is loaded, use the value from the model definition.
        initialTokens.set(place.id, place.initialTokens);
      }
    });

    setTokenState(initialTokens);
  }, [petriNet.places, fullTrace, selectedCaseId, availableCaseIds]);


  useEffect(() => {
    initializeTokenState();
  }, [initializeTokenState, mode, petriNet.places]);

  const resetSimulation = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setError(null);
    initializeTokenState();
  }, [initializeTokenState]);

  const handleFileChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const parsedTrace = parseTraceLog(content);
        if (parsedTrace.length === 0) {
            setError("Le fichier est vide ou dans un format incorrect.");
            setFullTrace(null);
            setFilteredTrace(null);
            setAvailableCaseIds([]);
        } else {
            const caseIds = [...new Set(parsedTrace.map(event => event.data.case_id).filter(Boolean))];
            setFullTrace(parsedTrace);
            setFilteredTrace(parsedTrace);
            setAvailableCaseIds(caseIds);
            setSelectedCaseId('all');
            resetSimulation();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de l'analyse du fichier.");
        setFullTrace(null);
        setFilteredTrace(null);
        setAvailableCaseIds([]);
      }
    };
    reader.readAsText(file);
  };
  
  const advanceStep = useCallback(() => {
    if (!filteredTrace || currentStep >= filteredTrace.length) {
      setIsPlaying(false);
      return;
    }

    const event = filteredTrace[currentStep];
    const transitionId = transitionLabelToIdMap.get(event.activity);

    if (!transitionId) {
        setError(`Étape ${currentStep + 1}: Transition avec le label "${event.activity}" non trouvée dans le réseau.`);
        setIsPlaying(false);
        return;
    }
    
    const transition = transitionMap.get(transitionId);
    
    if (!transition) { // Should not happen
      setError(`Étape ${currentStep + 1}: Erreur interne, transition "${event.activity}" non trouvée.`);
      setIsPlaying(false);
      return;
    }

    const isEnabled = transition.inputPlaceIds.every(
      placeId => (tokenState.get(placeId) || 0) > 0
    );

    if (!isEnabled) {
      setError(`Étape ${currentStep + 1}: La transition "${transition.label}" n'est pas activée (jeton manquant).`);
      setIsPlaying(false);
      return;
    }

    setTokenState(prevTokens => {
      const newTokens = new Map(prevTokens);
      transition.inputPlaceIds.forEach(placeId => {
        newTokens.set(placeId, (newTokens.get(placeId) || 0) - 1);
      });
      transition.outputPlaceIds.forEach(placeId => {
        newTokens.set(placeId, (newTokens.get(placeId) || 0) + 1);
      });
      return newTokens;
    });

    setCurrentStep(prev => prev + 1);
    setError(null);

  }, [filteredTrace, currentStep, transitionMap, tokenState, transitionLabelToIdMap]);

  const handleNextStep = useCallback(() => {
    setIsPlaying(false);
    advanceStep();
  }, [advanceStep]);

  const handlePrevStep = useCallback(() => {
    setIsPlaying(false);
    if (!filteredTrace || currentStep <= 0) return;

    const prevStepIndex = currentStep - 1;
    const event = filteredTrace[prevStepIndex];
    const transitionId = transitionLabelToIdMap.get(event.activity);
    
    if (!transitionId) {
        setError(`Impossible d'annuler l'étape ${prevStepIndex + 1}: la transition "${event.activity}" est introuvable.`);
        return;
    }
    const transition = transitionMap.get(transitionId);
    if (!transition) return;

    setTokenState(prevTokens => {
        const newTokens = new Map(prevTokens);
        transition.outputPlaceIds.forEach(placeId => {
            newTokens.set(placeId, (newTokens.get(placeId) || 1) - 1);
        });
        transition.inputPlaceIds.forEach(placeId => {
            newTokens.set(placeId, (newTokens.get(placeId) || 0) + 1);
        });
        return newTokens;
    });

    setCurrentStep(prev => prev - 1);
    setError(null);
  }, [filteredTrace, currentStep, transitionMap, tokenState, transitionLabelToIdMap]);


  useEffect(() => {
    if (isPlaying && mode === 'visualize') {
      const timer = setTimeout(() => {
        advanceStep();
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentStep, speed, advanceStep, mode]);

  const handleCaseIdChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    const newFilteredTrace = caseId === 'all'
      ? fullTrace
      : fullTrace?.filter(event => event.data.case_id === caseId) || null;
    
    setFilteredTrace(newFilteredTrace);
    resetSimulation();
  };

  const activeTransitionId = useMemo(() => {
    if (mode === 'visualize' && filteredTrace && currentStep < filteredTrace.length) {
      return transitionLabelToIdMap.get(filteredTrace[currentStep].activity);
    }
    return undefined;
  }, [mode, filteredTrace, currentStep, transitionLabelToIdMap]);
  
  const handleToolSelect = (tool: EditorTool) => {
    setActiveTool(prev => (prev === tool ? null : tool));
    setSelectedElementId(null);
    setArcSourceId(null);
  };
  
  const handleArcCreate = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const sourceIsPlace = petriNet.places.some(p => p.id === sourceId);
    const targetIsPlace = petriNet.places.some(p => p.id === targetId);

    if (sourceIsPlace === targetIsPlace) {
        console.warn("Les arcs doivent connecter une place et une transition.");
        setError("Les arcs doivent connecter une place et une transition.");
        setTimeout(() => setError(null), 3000);
        return;
    }

    const newArc: Arc = {
        id: `a${Date.now()}`,
        sourceId,
        targetId,
    };
    setPetriNet(prev => ({ ...prev, arcs: [...prev.arcs, newArc]}));
  }, [petriNet.places]);

  const handleCanvasClick = (x: number, y: number) => {
    if (activeTool === 'add_place') {
      const newPlace: Place = {
        id: `p${Date.now()}`,
        label: `Place ${petriNet.places.length + 1}`,
        initialTokens: 0,
        x, y
      };
      setPetriNet(prev => ({...prev, places: [...prev.places, newPlace]}));
    } else if (activeTool === 'add_transition') {
      const newTransition: Transition = {
        id: `t${Date.now()}`,
        label: `T${petriNet.transitions.length + 1}`,
        x, y
      };
      setPetriNet(prev => ({...prev, transitions: [...prev.transitions, newTransition]}));
    } else {
        setSelectedElementId(null);
        setArcSourceId(null);
    }
  };

  const handleNodeClick = (id: string) => {
    if (activeTool === 'add_arc') {
        if (!arcSourceId) {
            setArcSourceId(id);
        } else {
            handleArcCreate(arcSourceId, id);
            setArcSourceId(null); // Reset to allow creating next arc from scratch
        }
    } else {
        setSelectedElementId(id);
        setArcSourceId(null);
    }
  };
  
  const handleDeleteElement = useCallback((id: string) => {
      if (!id) return;
      setPetriNet(prev => ({
        ...prev,
        places: prev.places.filter(p => p.id !== id),
        transitions: prev.transitions.filter(t => t.id !== id),
        arcs: prev.arcs.filter(a => a.sourceId !== id && a.targetId !== id),
      }));
      if (selectedElementId === id) {
          setSelectedElementId(null);
      }
  }, [selectedElementId]);

  const handleNodeDragStart = (id: string) => {
      setSelectedElementId(id);
  };

  const handleNodeDrag = (id: string, x: number, y: number) => {
    setPetriNet(prev => ({
      ...prev,
      places: prev.places.map(p => p.id === id ? {...p, x, y} : p),
      transitions: prev.transitions.map(t => t.id === id ? {...t, x, y} : t),
    }));
  };
  
  const handleNodeDragEnd = () => {
      // Deletion via drag-to-trash is disabled. This function is kept for drag state logic.
  };
  
  const handleUpdateElement = (id: string, updates: Partial<Place> | Partial<Transition>) => {
    setPetriNet(prev => ({
      ...prev,
      places: prev.places.map(p => p.id === id ? { ...p, ...updates } : p),
      transitions: prev.transitions.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
    if ('initialTokens' in updates) {
        initializeTokenState();
    }
  };

  const handleExportModel = useCallback(() => {
    try {
        const jsonString = JSON.stringify(petriNet, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'petri-net-model.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        setError("Erreur lors de l'exportation du modèle.");
    }
  }, [petriNet]);

  const handleImportModelClick = () => {
    modelInputRef.current?.click();
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const importedNet = JSON.parse(content);
            
            if (
                !Array.isArray(importedNet.places) ||
                !Array.isArray(importedNet.transitions) ||
                !Array.isArray(importedNet.arcs)
            ) {
                throw new Error("Le fichier JSON n'a pas la structure d'un réseau de Petri valide.");
            }

            setPetriNet(importedNet);
            setError(null);
            setView({ zoom: 1, pan: { x: 0, y: 0 } });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur lors de l'importation du modèle.");
        }
    };
    reader.onerror = () => {
         setError("Erreur lors de la lecture du fichier.");
    };
    reader.readAsText(file);

    if (e.target) {
        e.target.value = '';
    }
  };

  const selectedElement = useMemo(() => {
      if (!selectedElementId) return null;
      return petriNet.places.find(p => p.id === selectedElementId) || petriNet.transitions.find(t => t.id === selectedElementId) || null;
  }, [selectedElementId, petriNet]);

  const TabButton: React.FC<{ tabMode: Mode; children: React.ReactNode }> = ({ tabMode, children }) => (
    <button
        onClick={() => {
            setMode(tabMode);
            setIsPlaying(false);
            setSelectedElementId(null);
            setActiveTool(null);
        }}
        className={`px-4 py-2 text-lg font-semibold rounded-t-md transition-colors duration-200 focus:outline-none ${
            mode === tabMode 
            ? 'bg-gray-800 text-indigo-400 border-b-2 border-indigo-400' 
            : 'bg-transparent text-gray-400 hover:bg-gray-700/50'
        }`}
        aria-selected={mode === tabMode}
    >
        {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col p-4 font-sans">
       <input
        type="file"
        ref={modelInputRef}
        onChange={handleImportFileSelect}
        className="hidden"
        accept=".json"
        aria-hidden="true"
      />
      <header className="text-center mb-4 flex-shrink-0">
        <h1 className="text-4xl font-bold text-indigo-400">Visualiseur de Réseau de Petri</h1>
        <p className="text-gray-400 mt-1">
          {mode === 'visualize' ? 'Visualisez le flux de jetons à travers un réseau en fonction d\'un journal de traces.' : 'Créez ou modifiez votre propre modèle de réseau de Petri.'}
        </p>
      </header>
      
      <div className="border-b border-gray-700 mb-4 flex-shrink-0">
         <TabButton tabMode="visualize">Visualisation</TabButton>
         <TabButton tabMode="edit">Éditeur</TabButton>
      </div>
      
      {error && (
        <div className="bg-red-800/50 border border-red-600 text-red-200 px-4 py-3 rounded-md relative mb-4 flex-shrink-0" role="alert">
            <strong className="font-bold">Erreur: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Fermer l'alerte">
                <svg className="fill-current h-6 w-6 text-red-300" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Fermer</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </button>
        </div>
      )}

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-[400px]">
          {mode === 'edit' && (
            <EditorToolbar
              activeTool={activeTool}
              onSelectTool={handleToolSelect}
              onImportModel={handleImportModelClick}
              onExportModel={handleExportModel}
            />
          )}
          <div className="flex-grow">
            <PetriNetCanvas
                net={petriNet}
                tokenState={tokenState}
                activeTransitionId={activeTransitionId}
                isEditing={mode === 'edit'}
                activeTool={activeTool}
                selectedElementId={selectedElementId}
                arcSourceId={arcSourceId}
                view={view}
                onViewChange={setView}
                onCanvasClick={handleCanvasClick}
                onNodeClick={handleNodeClick}
                onNodeDragStart={handleNodeDragStart}
                onNodeDrag={handleNodeDrag}
                onNodeDragEnd={handleNodeDragEnd}
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 min-h-0">
          {mode === 'visualize' ? (
            <>
              <Controls
                  isPlaying={isPlaying}
                  isLogLoaded={!!fullTrace}
                  speed={speed}
                  currentStep={currentStep}
                  traceLength={filteredTrace?.length || 0}
                  caseIds={availableCaseIds}
                  selectedCaseId={selectedCaseId}
                  onPlayPause={() => setIsPlaying(!isPlaying)}
                  onReset={resetSimulation}
                  onSpeedChange={setSpeed}
                  onFileChange={handleFileChange}
                  onPrevStep={handlePrevStep}
                  onNextStep={handleNextStep}
                  onCaseIdChange={handleCaseIdChange}
              />
              <TraceLogViewer trace={filteredTrace} currentStep={currentStep} />
            </>
          ) : (
            <PropertiesPanel 
                element={selectedElement}
                onUpdate={handleUpdateElement}
                onDelete={handleDeleteElement}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
