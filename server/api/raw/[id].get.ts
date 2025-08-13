export default eventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const res: any = await $fetch(`/api/pastes/${id}`, { headers: event.node.req.headers as any })
  const cacheable = !res.expiresAt && !res.passwordHash && !res.burnAfterRead
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  if (cacheable) setHeader(event, 'Cache-Control', 'public, max-age=120')
  return res.content as string
})
