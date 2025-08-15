
import { PetriNet } from './types';

export const SAMPLE_PETRI_NET: PetriNet = {
  places: [
    { id: 'p1', label: 'Start', x: 50, y: 250, initialTokens: 1 },
    { id: 'p2', label: 'A', x: 250, y: 150, initialTokens: 0 },
    { id: 'p3', label: 'B', x: 250, y: 350, initialTokens: 0 },
    { id: 'p4', label: 'C', x: 450, y: 150, initialTokens: 0 },
    { id: 'p5', label: 'D', x: 450, y: 350, initialTokens: 0 },
    { id: 'p6', label: 'End', x: 650, y: 250, initialTokens: 0 },
  ],
  transitions: [
    { id: 't1', label: 'Split', x: 150, y: 250 },
    { id: 't2', label: 'Action 1', x: 350, y: 150 },
    { id: 't3', label: 'Action 2', x: 350, y: 350 },
    { id: 't4', label: 'Join', x: 550, y: 250 },
  ],
  arcs: [
    { id: 'a1', sourceId: 'p1', targetId: 't1' },
    { id: 'a2', sourceId: 't1', targetId: 'p2' },
    { id: 'a3', sourceId: 't1', targetId: 'p3' },
    { id: 'a4', sourceId: 'p2', targetId: 't2' },
    { id: 'a5', sourceId: 't2', targetId: 'p4' },
    { id: 'a6', sourceId: 'p3', targetId: 't3' },
    { id: 'a7', sourceId: 't3', targetId: 'p5' },
    { id: 'a8', sourceId: 'p4', targetId: 't4' },
    { id: 'a9', sourceId: 'p5', targetId: 't4' },
    { id: 'a10', sourceId: 't4', targetId: 'p6' },
  ],
};

export const SPEEDS = [
  { label: '0.25x', value: 2000 },
  { label: '0.5x', value: 1000 },
  { label: '1x', value: 500 },
  { label: '2x', value: 250 },
  { label: '4x', value: 125 },
];
