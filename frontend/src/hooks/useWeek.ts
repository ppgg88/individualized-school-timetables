import { addDays, addWeeks, format, getISOWeek, getYear, startOfISOWeek } from 'date-fns';
import { useMemo } from 'react';
import { useWeekContext } from '../context/WeekContext';

function getWeekStartFromValues(week: number, year: number) {
  const anchor = new Date(year, 0, 4);
  return startOfISOWeek(addWeeks(anchor, week - 1));
}

interface UseWeekOptions {
  /** Interdit la navigation vers une semaine future : clampe sur la semaine courante */
  maxCurrentWeek?: boolean;
}

export function useWeek(options?: UseWeekOptions) {
  const { week: contextWeek, year: contextYear, setWeek: setContextWeek } = useWeekContext();
  const today = new Date();
  const currentWeek = getISOWeek(today);
  const currentYear = getYear(today);
  const currentWeekStart = useMemo(() => getWeekStartFromValues(currentWeek, currentYear), [currentWeek, currentYear]);

  let week = contextWeek;
  let year = contextYear;

  if (options?.maxCurrentWeek && getWeekStartFromValues(week, year) > currentWeekStart) {
    week = currentWeek;
    year = currentYear;
  }

  const weekStart = useMemo(() => getWeekStartFromValues(week, year), [week, year]);
  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart]);
  const canGoNext = !options?.maxCurrentWeek || weekStart < currentWeekStart;

  const setWeek = (nextWeek: number, nextYear: number) => {
    setContextWeek(nextWeek, nextYear);
  };

  const nextWeek = () => {
    if (!canGoNext) return;
    const nextDate = addWeeks(weekStart, 1);
    setWeek(getISOWeek(nextDate), getYear(nextDate));
  };

  const prevWeek = () => {
    const prevDate = addWeeks(weekStart, -1);
    setWeek(getISOWeek(prevDate), getYear(prevDate));
  };

  return {
    week,
    year,
    weekStart,
    weekEnd,
    weekLabel: `${format(weekStart, 'dd/MM')} → ${format(weekEnd, 'dd/MM')}`,
    nextWeek,
    prevWeek,
    setWeek,
    canGoNext,
  };
}
