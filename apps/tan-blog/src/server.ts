import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from '#/paraglide/server.js'

export default createServerEntry({
  fetch(request) {
    // TanStack Router already de/localizes URLs via router.rewrite
    // (see src/router.tsx), so the original `request` must be passed
    // through here — using the middleware's de-localized request would
    // double-delocalize and cause a redirect loop.
    return paraglideMiddleware(request, () => handler.fetch(request))
  },
})
