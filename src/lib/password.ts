import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

let dummy: Promise<string> | null = null;
/** A real bcrypt hash used to keep login timing similar for unknown usernames. */
export const dummyHash = () => (dummy ??= bcrypt.hash("not-a-real-password", COST));

export function passwordProblem(pw: string, username?: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 100) return "Password is too long.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain at least one letter and one number.";
  if (username && pw.toLowerCase() === username.toLowerCase()) return "Password must not be the same as the username.";
  return null;
}

/** Readable random password (no look-alike characters), e.g. "Kf7m-Qp3x-Wn9b" */
export function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const group = () => Array.from({ length: 4 }, () => chars[randomInt(chars.length)]).join("");
  const pw = `${group()}-${group()}-${group()}`;
  return /\d/.test(pw) ? pw : pw.slice(0, -1) + "7";
}
