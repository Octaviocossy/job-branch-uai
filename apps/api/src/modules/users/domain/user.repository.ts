import type { CreateUserInput, User } from "@repo/models";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export type UserWithPasswordHash = User & { passwordHash: string | null };

export interface UserRepository {
  create(input: CreateUserInput & { passwordHash?: string }): Promise<User>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findByEmail(email: string): Promise<UserWithPasswordHash | null>;
  incrementFailedAttempts(id: string): Promise<void>;
}
