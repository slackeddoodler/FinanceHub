import { getAuthDb } from "../database/pglite";
import { generateSalt, hashPassword } from "../../domain/utils/cryptoUtils";

export class PGliteAuthRepository {
  async init() {
    const db = await getAuthDb();
    await db.query(`
      CREATE TABLE IF NOT EXISTS auth_registry (
        username TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        salt TEXT NOT NULL
      )
    `);
  }

  async userExists(username: string): Promise<boolean> {
    const db = await getAuthDb();
    const res = await db.query(`SELECT username FROM auth_registry WHERE username = $1`, [username.toLowerCase()]);
    return res.rows.length > 0;
  }

  async registerUser(username: string, password: string): Promise<void> {
    const db = await getAuthDb();
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    
    await db.query(
      `INSERT INTO auth_registry (username, hash, salt) VALUES ($1, $2, $3)`,
      [username.toLowerCase(), hash, salt]
    );
  }

  async verifyUser(username: string, password: string): Promise<boolean> {
    const db = await getAuthDb();
    const res = await db.query(`SELECT hash, salt FROM auth_registry WHERE username = $1`, [username.toLowerCase()]);
    
    if (res.rows.length === 0) return false;
    
    const record = res.rows[0] as { hash: string, salt: string };
    const attemptHash = await hashPassword(password, record.salt);
    
    return attemptHash === record.hash;
  }
}