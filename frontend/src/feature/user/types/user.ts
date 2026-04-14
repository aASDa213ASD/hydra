export interface User {
  id: number;
  name: string;
  roles: string[];
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}
