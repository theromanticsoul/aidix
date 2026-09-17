export function GET(): Response {
  return Response.json({
    status: "ok",
    dependencies: { database: "not_checked" },
  });
}
