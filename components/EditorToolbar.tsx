import React from 'react';
import { PlaceIcon, TransitionIcon, ArcIcon, ImportModelIcon, ExportModelIcon } from './icons';

export type EditorTool = 'add_place' | 'add_transition' | 'add_arc';

interface EditorToolbarProps {
    activeTool: EditorTool | null;
    onSelectTool: (tool: EditorTool) => void;
    onImportModel: () => void;
    onExportModel: () => void;
}

const ToolButton: React.FC<{
    tool: EditorTool;
    activeTool: EditorTool | null;
    onSelectTool: (tool: EditorTool) => void;
    children: React.ReactNode;
    label: string;
}> = ({ tool, activeTool, onSelectTool, children, label }) => {
    const isActive = activeTool === tool;
    return (
        <button
            onClick={() => onSelectTool(tool)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 w-20 h-20 ${
                isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            aria-label={`Outil ${label}`}
            aria-pressed={isActive}
        >
            {children}
            <span className="text-xs mt-1">{label}</span>
        </button>
    );
};

const EditorToolbar: React.FC<EditorToolbarProps> = ({ activeTool, onSelectTool, onImportModel, onExportModel }) => {
    return (
        <div className="bg-gray-800 p-2 rounded-lg shadow-lg flex justify-center items-center gap-2">
            {/* Tools */}
            <div className="flex gap-2">
                <ToolButton tool="add_place" activeTool={activeTool} onSelectTool={onSelectTool} label="Place">
                    <PlaceIcon className="w-6 h-6" />
                </ToolButton>
                <ToolButton tool="add_transition" activeTool={activeTool} onSelectTool={onSelectTool} label="Transition">
                    <TransitionIcon className="w-6 h-6" />
                </ToolButton>
                 <ToolButton tool="add_arc" activeTool={activeTool} onSelectTool={onSelectTool} label="Arc">
                    <ArcIcon className="w-6 h-6" />
                </ToolButton>
            </div>

            <div className="border-l border-gray-600 h-16 mx-2"></div>
            
            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={onImportModel}
                    className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 w-20 h-20 bg-gray-700 text-gray-300 hover:bg-gray-600"
                    aria-label="Importer un modèle"
                >
                    <ImportModelIcon className="w-6 h-6" />
                    <span className="text-xs mt-1">Importer</span>
                </button>
                <button
                    onClick={onExportModel}
                    className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 w-20 h-20 bg-gray-700 text-gray-300 hover:bg-gray-600"
                    aria-label="Exporter le modèle"
                >
                    <ExportModelIcon className="w-6 h-6" />
                    <span className="text-xs mt-1">Exporter</span>
                </button>
            </div>
        </div>
    );
};

export default EditorToolbar;
