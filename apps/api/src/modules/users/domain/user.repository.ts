import type { CreateUserInput, User } from "@repo/models";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
}
