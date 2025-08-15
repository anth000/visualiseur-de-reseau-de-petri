import React, { useMemo, useRef, useState, useEffect } from 'react';
import { PetriNet, Place, Transition } from '../types';
import { EditorTool } from './EditorToolbar';

interface PetriNetCanvasProps {
  net: PetriNet;
  tokenState: Map<string, number>;
  activeTransitionId?: string;
  isEditing?: boolean;
  activeTool?: EditorTool | null;
  selectedElementId?: string | null;
  arcSourceId?: string | null;
  view: { zoom: number; pan: { x: number; y: number } };
  onViewChange: (view: { zoom: number; pan: { x: number; y: number } }) => void;
  onCanvasClick: (x: number, y: number) => void;
  onNodeClick: (id: string, type: 'place' | 'transition') => void;
  onNodeDragStart: (id:string) => void;
  onNodeDrag: (id: string, x: number, y: number) => void;
  onNodeDragEnd: (id: string) => void;
}

const PLACE_RADIUS = 30;
const TOKEN_RADIUS = 6;
const TRANSITION_WIDTH = 15;
const TRANSITION_HEIGHT = 60;

const Arrowhead = () => (
    <marker
      id="arrowhead"
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
    </marker>
);

const NodeLabel: React.FC<{ x: number, y: number, label: string, yOffset?: number }> = ({x, y, label, yOffset = 0}) => (
    <text
        x={x}
        y={y + yOffset}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-gray-300 font-sans text-xs select-none pointer-events-none"
    >
        {label}
    </text>
);

const PetriNetCanvas: React.FC<PetriNetCanvasProps> = ({ 
    net, 
    tokenState, 
    activeTransitionId,
    isEditing = false,
    activeTool = null,
    selectedElementId,
    arcSourceId,
    view,
    onViewChange,
    onCanvasClick,
    onNodeClick,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragEnd,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragState, setDragState] = useState<{ id: string; isDragging: boolean; } | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    
    const nodeMap = useMemo(() => {
        const map = new Map<string, Place | Transition>();
        net.places.forEach(p => map.set(p.id, p));
        net.transitions.forEach(t => map.set(t.id, t));
        return map;
    }, [net.places, net.transitions]);

    const getCursor = () => {
        if (isPanning) return 'grabbing';
        if (!isEditing) return 'default';
        if (activeTool === 'add_place' || activeTool === 'add_transition') return 'crosshair';
        if (activeTool === 'add_arc') return 'pointer';
        if (dragState?.isDragging) return 'grabbing';
        return 'grab';
    };

    const getSVGPoint = (e: React.MouseEvent | MouseEvent): DOMPoint => {
        const svg = svgRef.current;
        if (!svg) return new DOMPoint();
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        return pt.matrixTransform(svg.getScreenCTM()?.inverse());
    }

    const getWorldCoords = (e: React.MouseEvent | MouseEvent): { x: number, y: number } => {
        const svgPoint = getSVGPoint(e);
        return {
            x: (svgPoint.x - view.pan.x) / view.zoom,
            y: (svgPoint.y - view.pan.y) / view.zoom
        };
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const { x, y } = getSVGPoint(e);
        
        const newZoom = e.deltaY < 0 ? view.zoom * zoomFactor : view.zoom / zoomFactor;
        const newPan = {
            x: x - (x - view.pan.x) * (newZoom / view.zoom),
            y: y - (y - view.pan.y) * (newZoom / view.zoom),
        };
        onViewChange({ zoom: newZoom, pan: newPan });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.buttons === 1 && e.altKey) { // Alt+click for panning
            setIsPanning(true);
        } else if (e.target === svgRef.current) {
            const { x, y } = getWorldCoords(e);
            onCanvasClick(x, y);
        }
    }
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            onViewChange({
                ...view,
                pan: {
                    x: view.pan.x + e.movementX,
                    y: view.pan.y + e.movementY
                }
            });
        } else if (isEditing && dragState?.isDragging && dragState.id) {
            const {x,y} = getWorldCoords(e);
            onNodeDrag(dragState.id, x, y);
        }
    };
    
    const handleMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
        } else if (isEditing && dragState?.isDragging && dragState.id) {
            onNodeDragEnd(dragState.id);
            setDragState(null);
        }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, id: string, type: 'place' | 'transition') => {
        e.stopPropagation();
        if(isEditing && !activeTool) {
             setDragState({ id, isDragging: true });
             onNodeDragStart(id);
        } else if (isEditing) {
             onNodeClick(id, type);
        }
    };

    const getArcEndPoints = (sourceId: string, targetId: string) => {
        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);

        if (!source || !target) return { x1: 0, y1: 0, x2: 0, y2: 0 };

        let x1 = source.x;
        let y1 = source.y;
        let x2 = target.x;
        let y2 = target.y;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist === 0) return { x1, y1, x2, y2 };
        
        const sourceIsPlace = net.places.some(p => p.id === sourceId);
        const targetIsPlace = net.places.some(p => p.id === targetId);

        if (sourceIsPlace) { 
            x1 += (dx * PLACE_RADIUS) / dist;
            y1 += (dy * PLACE_RADIUS) / dist;
        } else {
             const angle = Math.atan2(dy, dx);
             const intersectX = Math.abs(TRANSITION_HEIGHT / 2 * Math.tan(angle)) <= TRANSITION_WIDTH / 2 ? TRANSITION_WIDTH / 2 * Math.sign(dx) : TRANSITION_HEIGHT / 2 / Math.tan(angle) * Math.sign(dy);
             const intersectY = Math.abs(TRANSITION_WIDTH / 2 / Math.tan(angle)) <= TRANSITION_HEIGHT / 2 ? TRANSITION_HEIGHT / 2 * Math.sign(dy) : TRANSITION_WIDTH / 2 * Math.tan(angle) * Math.sign(dx);
             x1 += intersectX;
             y1 += intersectY;
        }

        if (targetIsPlace) {
            x2 -= (dx * PLACE_RADIUS) / dist;
            y2 -= (dy * PLACE_RADIUS) / dist;
        } else {
            const angle = Math.atan2(-dy, -dx);
             const intersectX = Math.abs(TRANSITION_HEIGHT / 2 * Math.tan(angle)) <= TRANSITION_WIDTH / 2 ? TRANSITION_WIDTH / 2 * Math.sign(-dx) : TRANSITION_HEIGHT / 2 / Math.tan(angle) * Math.sign(-dy);
             const intersectY = Math.abs(TRANSITION_WIDTH / 2 / Math.tan(angle)) <= TRANSITION_HEIGHT / 2 ? TRANSITION_HEIGHT / 2 * Math.sign(-dy) : TRANSITION_WIDTH / 2 * Math.tan(angle) * Math.sign(-dx);
            x2 += intersectX;
            y2 += intersectY;
        }

        return { x1, y1, x2, y2 };
    }

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-full h-full overflow-hidden relative">
      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: getCursor() }}
      >
        <defs>
            <Arrowhead/>
        </defs>

        <g transform={`translate(${view.pan.x}, ${view.pan.y}) scale(${view.zoom})`}>
            {/* Arcs */}
            {net.arcs.map(arc => {
                const {x1,y1,x2,y2} = getArcEndPoints(arc.sourceId, arc.targetId);
                return (
                    <line
                        key={arc.id}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        className="stroke-gray-500"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                    />
                )
            })}
            
            {/* Places and Tokens */}
            {net.places.map(place => {
              const tokens = tokenState.get(place.id) || 0;
              return (
                <g 
                  key={place.id} 
                  onMouseDown={(e) => handleNodeMouseDown(e, place.id, 'place')}
                  style={{ cursor: isEditing && activeTool === 'add_arc' ? 'pointer' : (isEditing ? 'grab' : 'default') }}
                >
                  <circle
                    cx={place.x}
                    cy={place.y}
                    r={PLACE_RADIUS}
                    className={`fill-blue-900/50 stroke-2 transition-all duration-200 ${
                      selectedElementId === place.id ? 'stroke-yellow-300' 
                      : arcSourceId === place.id ? 'stroke-green-400'
                      : 'stroke-blue-400'}`}
                    strokeWidth={3 / view.zoom}
                  />
                  <NodeLabel x={place.x} y={place.y + PLACE_RADIUS + 10} label={place.label} />

                  {!isEditing && tokens > 0 && (
                      <text x={place.x} y={place.y - PLACE_RADIUS - 8} textAnchor="middle" dominantBaseline="middle" className="fill-yellow-300 pointer-events-none select-none" style={{fontSize: `${0.8/view.zoom}rem`, fontWeight: 'bold'}}>
                          {tokens}
                      </text>
                  )}
                  
                  {isEditing && tokens > 0 && (
                      <text x={place.x} y={place.y} textAnchor="middle" dominantBaseline="central" className="fill-yellow-300 pointer-events-none select-none" style={{fontSize: `${1.2/view.zoom}rem`, fontWeight: 'bold'}}>
                          {tokens}
                      </text>
                  )}

                  {!isEditing && tokens > 0 && Array.from({ length: Math.min(tokens, 5) }).map((_, i) => (
                      <circle
                          key={i}
                          cx={place.x + (Math.random() - 0.5) * (PLACE_RADIUS - TOKEN_RADIUS) * 1.5}
                          cy={place.y + (Math.random() - 0.5) * (PLACE_RADIUS - TOKEN_RADIUS) * 1.5}
                          r={TOKEN_RADIUS}
                          className="fill-yellow-300 pointer-events-none"
                          style={{ transition: 'cx 0.3s, cy 0.3s' }}
                      />
                  ))}
                  {!isEditing && tokens > 5 && (
                    <text x={place.x} y={place.y} textAnchor="middle" dominantBaseline="central" className="fill-yellow-200 pointer-events-none select-none" style={{fontSize: `${1.2/view.zoom}rem`, fontWeight: 'bold'}}>
                      {tokens}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Transitions */}
            {net.transitions.map(transition => (
              <g 
                key={transition.id} 
                onMouseDown={(e) => handleNodeMouseDown(e, transition.id, 'transition')}
                style={{ cursor: isEditing && activeTool === 'add_arc' ? 'pointer' : (isEditing ? 'grab' : 'default') }}
              >
                <rect
                  x={transition.x - TRANSITION_WIDTH / 2}
                  y={transition.y - TRANSITION_HEIGHT / 2}
                  width={TRANSITION_WIDTH}
                  height={TRANSITION_HEIGHT}
                  className={`stroke-2 transition-all duration-200 ${
                    activeTransitionId === transition.id
                      ? 'fill-orange-500/80 stroke-orange-300'
                      : selectedElementId === transition.id
                      ? 'fill-gray-700 stroke-yellow-300'
                      : arcSourceId === transition.id 
                      ? 'fill-gray-700 stroke-green-400'
                      : 'fill-gray-700 stroke-gray-400'
                  }`}
                  strokeWidth={3 / view.zoom}
                />
                <NodeLabel x={transition.x} y={transition.y + TRANSITION_HEIGHT / 2 + 10} label={transition.label} />
              </g>
            ))}
        </g>
      </svg>
      <div className="absolute bottom-2 left-4 text-xs text-gray-400 bg-gray-900/50 px-2 py-1 rounded pointer-events-none">Zoom: {view.zoom.toFixed(2)}x. Maintenez Alt + Glisser pour déplacer.</div>
    </div>
  );
};

export default PetriNetCanvas;