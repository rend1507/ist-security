import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 4) {
    throw new Error("Password terlalu pendek.");
  }
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined
): Promise<boolean> {
  if (!password || !passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}
