import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';

import { Database } from './database';

/**
 * The connection, or the honest absence of one.
 *
 * `DATABASE_URL` unset means in-memory storage, and that is not a degraded
 * mode: it is what the web build runs against. `apps/web/scripts/build.mjs`
 * starts this API to fetch the catalogue during `next build`, so requiring a
 * database here would put Postgres on the critical path of every build and
 * every CI run. The seed is the catalogue's source either way — see ADR 0011.
 *
 * Set but unreachable is a boot failure, never a fallback. Falling back would
 * serve an empty catalogue from a process that looks healthy, and the build
 * would bake that empty catalogue into a static site.
 */
export const DATABASE = Symbol('DATABASE');

/** `Database` when `DATABASE_URL` is set, `null` when it is not. */
export type MaybeDatabase = Database | null;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: (): MaybeDatabase => {
        const url = process.env.DATABASE_URL;
        return url ? new Database(url) : null;
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: MaybeDatabase) {}

  /**
   * Closes the pool on shutdown. It only runs because `main.ts` calls
   * `enableShutdownHooks()`; without that, an idle pool keeps the process
   * alive and every deploy waits out its shutdown timeout.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.database?.close();
  }
}
