import { useState } from 'react';
import { parseDictatedDate } from '../services/voiceTask';
import { toDateString } from '../services/recurrence';
import { formatDay } from '../services/tasks';

// NOMBRE DICTADO CON FECHA (metas y proyectos): «Correr una media maratón antes del 1 de marzo» deja el nombre y
// rellena la fecha (la objetivo de la meta, la de fin del proyecto). Lo escrito a mano no se entiende. Devuelve lo
// que necesitan el campo y su DictateButton: `typed` (y `onTyped`, al escribir a mano), `onFinal`, y para
// DictationUnderstood, `summary` y `undo`; `onDateChanged` es el onChange del campo de la fecha. `describe` dice la fecha entendida (p. ej. «fecha objetivo: 1 mar 2027»).
export const useDictatedDate = (
  setTitle: (title: string) => void,
  date: string,
  setDate: (date: string) => void,
  describe: (day: string) => string
) => {
  const [typed, setTyped] = useState(0);
  const [understood, setUnderstood] = useState<{ date: string; previous: { title: string; date: string } } | null>(
    null
  );
  const onFinal = (dictated: string, before: string) => {
    const parsed = parseDictatedDate(dictated, toDateString(new Date()));
    if (!parsed.date) return;
    setUnderstood({ date: parsed.date, previous: { title: before ? `${before} ${dictated}` : dictated, date } });
    setTitle(before ? `${before} ${parsed.title}` : parsed.title);
    setDate(parsed.date);
  };
  const undo = () => {
    if (!understood) return;
    setTitle(understood.previous.title);
    setDate(understood.previous.date);
    setUnderstood(null);
  };
  const onTyped = () => {
    setTyped((n) => n + 1);
    setUnderstood(null);
  };
  // La fecha cambiada a mano: «Deshacer» ya no la pisaría
  const onDateChanged = (value: string) => {
    setDate(value);
    setUnderstood(null);
  };
  return {
    typed,
    onTyped,
    onFinal,
    undo,
    onDateChanged,
    summary: understood ? describe(formatDay(understood.date)) : ''
  };
};
