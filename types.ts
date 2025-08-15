
export interface Place {
  id: string;
  label: string;
  x: number;
  y: number;
  initialTokens: number;
}

export interface Transition {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface Arc {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface PetriNet {
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
}

export interface TraceEvent {
  step: number;
  activity: string; // La valeur de la colonne 'activity'
  data: Record<string, string>; // Toutes les données de la ligne
}

export interface TransitionWithIO {
  id: string;
  label: string;
  inputPlaceIds: string[];
  outputPlaceIds: string[];
}
