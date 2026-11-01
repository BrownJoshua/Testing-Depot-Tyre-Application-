export type RoleCode = 'HO' | 'AM' | 'SUP' | 'TIC' | 'TM';

/** What the database says about the signed-in user (returned by the my_session() function). */
export interface Me {
  employee_id: string;
  employee_code: string;
  full_name: string;
  role_code: RoleCode;
  org_unit_id: string | null;
  org_unit_code: string | null;
  org_unit_name: string | null;
  preferred_language: 'en' | 'ta';
  must_change_password: boolean;
}
