import pg, { type PoolClient } from "pg";
pg.types.setTypeParser(1082, (value) => value);
const globalPg = globalThis as unknown as { raizPool?: pg.Pool };
export const db =
  globalPg.raizPool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
globalPg.raizPool = db;
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
