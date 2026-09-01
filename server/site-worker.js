/* Cloudflare-compatible static entrypoint used by Sites hosting. Vite still
   builds the browser app normally; this worker delegates every asset request
   to the platform and gives client-side routes the app shell. */
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    const methodCanRender = request.method === 'GET' || request.method === 'HEAD'
    const wantsHtml = (request.headers.get('accept') || '').includes('text/html')

    if (response.status !== 404 || !methodCanRender || !wantsHtml) return response

    const indexUrl = new URL('/index.html', request.url)
    return env.ASSETS.fetch(new Request(indexUrl, request))
  },
}
