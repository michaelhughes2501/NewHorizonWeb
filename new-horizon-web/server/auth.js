// Verifies the short-lived JWT that Neon Auth (Managed Better Auth) issues to
// a signed-in browser. The browser sends it as `Authorization: Bearer <jwt>`
// (or as ?token= on the Server-Sent Events stream, where headers can't be set).
import { createRemoteJWKSet, jwtVerify } from 'jose'

export function createTokenVerifier({ jwksUrl, baseUrl }) {
  if (!jwksUrl || !baseUrl) {
    throw new Error('NEON_AUTH_JWKS_URL and NEON_AUTH_BASE_URL are required to verify sign-ins.')
  }
  const jwks = createRemoteJWKSet(new URL(jwksUrl))
  const issuer = new URL(baseUrl).origin
  return async function verifyToken(token) {
    const { payload } = await jwtVerify(token, jwks, { issuer })
    if (!payload.sub) throw new Error('Token has no subject.')
    return {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      name: typeof payload.name === 'string' ? payload.name : null,
      exp: payload.exp ?? null,
    }
  }
}

export function bearerToken(req) {
  const header = req.get('authorization') || ''
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim()
  return null
}
