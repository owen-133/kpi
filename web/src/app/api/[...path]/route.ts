import { getContainer } from '../../../config/container.ts';

// Every /api/* request runs the legacy guard pipeline; routes of the contexts are registered in config/container.ts.
const handle = (request: Request): Promise<Response> => getContainer().pipeline.handle(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;

export const dynamic = 'force-dynamic';
