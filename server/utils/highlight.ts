export const codeToHtmlCached = defineCachedFunction(async (code: string, lang?: string) => {
  const { codeToHtml } = await import('shiki')

  return codeToHtml(code, { lang: lang || 'plaintext', theme: 'github-dark' })

}, { name: 'shiki', maxAge: 60 * 60 })
