import { type Department, DEPARTMENTS } from "./departments";

export function getRolesForDepartment(department: Department): readonly string[] {
  const entry = DEPARTMENTS.find((d) => d.name === department);

  return entry ? entry.roles : [];
}
