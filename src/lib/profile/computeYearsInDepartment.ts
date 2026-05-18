export function computeYearsInDepartment(startYear: number, now: Date): number {
  return now.getFullYear() - startYear;
}
