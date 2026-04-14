import { Elysia } from 'elysia'
import { auth } from './auth'

export const authPlugin = new Elysia({ name: 'auth' })
  .mount(auth.handler)
  .macro({
    withAuth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        if (!session) return status(401)
        return { user: session.user }
      },
    },
  })
