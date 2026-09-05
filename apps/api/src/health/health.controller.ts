import { Controller, Get, Inject } from '@nestjs/common';

import { DATABASE, type MaybeDatabase } from '../db/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly database: MaybeDatabase) {}

  /**
   * Reports which storage the process booted with, because "the API is up" and
   * "the API is serving what you think it is" are different questions and only
   * the first one was answerable here before.
   *
   * It deliberately does not probe the connection. This endpoint is what
   * `apps/web/scripts/build.mjs` and `scripts/dev.mjs` wait on, and what a host
   * polls for liveness; failing it on a momentary database blip would take the
   * API out of rotation for something a retry would have survived. An
   * unreachable database is already a boot failure — see database.module.ts.
   */
  @Get()
  check(): { status: string; uptimeSeconds: number; storage: 'postgres' | 'memory' } {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      storage: this.database ? 'postgres' : 'memory',
    };
  }
}
