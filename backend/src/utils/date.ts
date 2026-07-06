export function startOfIsoWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay() === 0 ? 7 : result.getDay();
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getWeekStart(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const week1Start = startOfIsoWeek(jan4);
  const result = new Date(week1Start);
  result.setDate(week1Start.getDate() + (week - 1) * 7);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getIsoWeekRange(week: number, year: number) {
  const start = getWeekStart(week, year);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function formatMysqlDateTime(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function getIsoWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / 604800000);
}

export function moveDateToIsoWeek(baseDate: Date, targetWeek: number, year: number): Date {
  const baseWeekday = baseDate.getDay() === 0 ? 7 : baseDate.getDay();
  const targetWeekStart = getWeekStart(targetWeek, year);
  const result = new Date(targetWeekStart);
  result.setDate(targetWeekStart.getDate() + baseWeekday - 1);
  result.setHours(baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds(), 0);
  return result;
}

/** Année scolaire se terminant en `year` : du 1er août (year - 1) au 1er août (year), exclu. */
export function getSchoolYearRange(year: number) {
  const start = new Date(year - 1, 7, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, 7, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}
