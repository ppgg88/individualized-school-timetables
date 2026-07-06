import { createContext, useContext, useState, type ReactNode } from 'react';
import { getISOWeek, getYear } from 'date-fns';

interface WeekContextValue {
  week: number;
  year: number;
  setWeek: (week: number, year: number) => void;
}

const WeekContext = createContext<WeekContextValue | null>(null);

export function useWeekContext() {
  const ctx = useContext(WeekContext);
  if (!ctx) throw new Error('useWeekContext must be used within a WeekProvider');
  return ctx;
}

export function WeekProvider({ children }: { children: ReactNode }) {
  const [week, setWeekState] = useState(() => getISOWeek(new Date()));
  const [year, setYearState] = useState(() => getYear(new Date()));

  const setWeek = (nextWeek: number, nextYear: number) => {
    setWeekState(nextWeek);
    setYearState(nextYear);
  };

  return <WeekContext.Provider value={{ week, year, setWeek }}>{children}</WeekContext.Provider>;
}
