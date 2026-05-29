import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export interface Auth0Claims {
  sub: string
  payload: JWTPayload
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks(domain: string) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`))
  }
  return jwks
}

export async function verifyAuth0Token(token: string): Promise<Auth0Claims | null> {
  const domain = process.env.AUTH0_DOMAIN
  const audience = process.env.AUTH0_AUDIENCE
  if (!domain || !audience) {
    throw new Error('Missing AUTH0_DOMAIN or AUTH0_AUDIENCE')
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(domain), {
      issuer: `https://${domain}/`,
      audience,
    })
    if (!payload.sub) return null
    return { sub: payload.sub, payload }
  } catch {
    return null
  }
}
