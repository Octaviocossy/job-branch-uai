import { Inject, Injectable } from "@nestjs/common";
import type { CreateUserInput, User } from "@repo/models";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { users } from "../../../database/schema/index";
import type { UserRepository, UserWithPasswordHash } from "../domain/user.repository";

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateUserInput & { passwordHash?: string }): Promise<User> {
    const [user] = await this.db.insert(users).values(input).returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));

    return user ?? null;
  }

  async findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async findByEmail(email: string): Promise<UserWithPasswordHash | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));

    return user ?? null;
  }

  async incrementFailedAttempts(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ intentosFallidos: sql`${users.intentosFallidos} + 1` })
      .where(eq(users.id, id));
  }
}
