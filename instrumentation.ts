// Next.js apelează onRequestError pentru ORICE eroare neprinsă de pe server
// (pagini, rute API, server actions). O trimitem în /admin/errors.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string; routerKind: string },
) {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { logError } = await import('./lib/log-error')
  await logError(err, {
    source: 'server',
    url: request.path,
    context: { method: request.method, route: context.routePath, type: context.routeType },
  })
}
