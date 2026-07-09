import type { RequestHandler } from './$types';
import { buildRosterWorkbook } from '$lib/server/export.js';

export const GET: RequestHandler = async () => {
  const buffer = await buildRosterWorkbook();
  return new Response(new Uint8Array(buffer), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="dmon-presence-${new Date().toISOString().slice(0, 10)}.xlsx"`
    }
  });
};
