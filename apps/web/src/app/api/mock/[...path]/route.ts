import { mockApiEnabled } from "../../../../lib/mock-mode.ts";

async function handle(request: Request) {
  if (!mockApiEnabled) return new Response(null, { status: 404 });
  const { handleMockRequest } = await import("../../../../lib/mock-api.ts");
  return handleMockRequest(request);
}

export { handle as GET, handle as POST, handle as PUT };
