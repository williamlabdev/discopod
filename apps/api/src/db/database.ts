import { Pool, type PoolClient, type QueryResultRow } from 'pg';

/**
 * A connection pool, and the two ways this app talks to Postgres.
 *
 * `pg` rather than an ORM. The query surface is five catalogue reads and two
 * saved-word statements, all of them written out below; an ORM would restate
 * `catalog.types.ts` in a second schema language and give the shape a second
 * place to drift. It is also pure JavaScript — the optional native binding is
 * not installed — which keeps it clear of the lockfile trap that a platform
 * binary would reintroduce (see HANDOFF).
 *
 * TLS is not configured here on purpose: `pg` reads `sslmode` out of the
 * connection string, so the URL states its own transport. Render's internal
 * URL needs none; its external one needs `?sslmode=require`.
 */
export class Database {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query<T>(text, values);
    return result.rows;
  }

  /**
   * Run `work` inside one transaction, on one client.
   *
   * The client is passed in rather than borrowed from the pool per statement:
   * a transaction spread across pooled connections is not a transaction, and
   * that failure is silent until two writers overlap.
   */
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  close(): Promise<void> {
    return this.pool.end();
  }
}
