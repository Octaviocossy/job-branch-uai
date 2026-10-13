/** Hashing port used by `Usuario.autenticar()`; implemented by the auth module's `PasswordService` (bcrypt). */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
