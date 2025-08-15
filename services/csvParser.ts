import { TraceEvent } from '../types';

export const parseTraceLog = (csvContent: string): TraceEvent[] => {
  const lines = csvContent.trim().split('\n').map(l => l.trim()).filter(line => line);
  
  if (lines.length === 0) {
    return [];
  }

  // Intermediate representation for easier sorting
  type ParsedEvent = {
      activity: string;
      data: Record<string, string>;
  };

  let parsedEvents: ParsedEvent[] = [];

  // Heuristic: if the first line looks like JSON, assume the whole file is JSONL
  if (lines[0].trim().startsWith('{')) {
      try {
          parsedEvents = lines.map(line => {
              const cleanLine = line.endsWith(',') ? line.slice(0, -1) : line;
              const jsonEvent = JSON.parse(cleanLine);
              if (!jsonEvent.activity || typeof jsonEvent.activity !== 'string') {
                  throw new Error("Chaque objet JSON doit avoir une clé 'activity'.");
              }
              if (!jsonEvent.timestamp || typeof jsonEvent.timestamp !== 'string') {
                  throw new Error("Chaque objet JSON doit avoir une clé 'timestamp'.");
              }
              return {
                  activity: jsonEvent.activity.trim(),
                  data: Object.fromEntries(Object.entries(jsonEvent).map(([key, value]) => [key, String(value)])),
              };
          });
      } catch (e) {
          throw new Error("Le fichier semble être au format JSONL mais contient une erreur de formatage.");
      }
  } else {
      // Otherwise, parse as CSV
      if (lines.length < 2) {
          throw new Error("Un fichier CSV doit avoir un en-tête et au moins une ligne de données.");
      }
      const headers = lines[0].split(',').map(h => h.trim());
      const activityIndex = headers.indexOf('activity');
      const timestampIndex = headers.indexOf('timestamp');

      if (activityIndex === -1) {
          throw new Error("L'en-tête CSV doit contenir la colonne 'activity'.");
      }
      if (timestampIndex === -1) {
          throw new Error("L'en-tête CSV doit contenir la colonne 'timestamp'.");
      }
      
      const dataRows = lines.slice(1);
      parsedEvents = dataRows.map(line => {
          const values = line.split(',').map(v => v.trim());
          const rowData: Record<string, string> = {};
          headers.forEach((header, i) => {
              rowData[header] = values[i] || '';
          });
          return {
              activity: rowData['activity'],
              data: rowData,
          };
      });
  }

  // Sort events by timestamp
  const sortedEvents = parsedEvents.sort((a, b) => {
      const dateA = new Date(a.data.timestamp).getTime();
      const dateB = new Date(b.data.timestamp).getTime();
      if(isNaN(dateA) || isNaN(dateB)) {
          // Silently handle invalid timestamps to avoid crashing, but log a warning.
          console.warn(`Timestamp invalide détecté, l'ordre pourrait être incorrect: ${a.data.timestamp} ou ${b.data.timestamp}`);
          return 0;
      }
      return dateA - dateB;
  });

  // Assign step numbers after sorting
  return sortedEvents.map((event, index) => ({
      step: index,
      activity: event.activity,
      data: event.data,
  }));
};