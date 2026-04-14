import type { User } from "@/feature/user/types/user";

export interface UserRepository {
  getCurrent(): Promise<User>;
}
