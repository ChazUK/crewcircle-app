import { DEPARTMENT_ROLES, type Department } from "./departments";

export function getRolesForDepartment(department: Department): readonly string[] {
  return DEPARTMENT_ROLES[department];
}
