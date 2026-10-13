import { Injectable } from "@nestjs/common";
import bcrypt from "bcrypt";
import type { PasswordHasher } from "../../users/domain/password-hasher";

const SALT_ROUNDS = 10;

@Injectable()
export class PasswordService implements PasswordHasher {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
