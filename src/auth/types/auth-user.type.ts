/**
 * Shape of the value ClerkStrategy actually attaches to `req.user`.
 *
 * This is a decoded session JWT payload (from `verifyToken`), not a Clerk
 * `User` API resource - the two are easy to confuse but carry very
 * different fields (a `User` has things like `emailAddresses`/`firstName`;
 * this has JWT claims like `sub`/`sid`). Previously `req.user` was typed as
 * Clerk's `User`, which let `@CurrentUser('emailAddresses')` type-check
 * while returning `undefined` at runtime - it's a field the JWT payload
 * never carries.
 */
export interface AuthUser {
  /** Clerk user ID - aliased from the JWT's `sub` claim by ClerkStrategy. */
  id: string;
  /** Subject claim (Clerk user ID); same value as `id` above. */
  sub: string;
  /** Session ID. */
  sid?: string;
  /** Issuer. */
  iss?: string;
  /** Authorized party. */
  azp?: string;
  /** Expiration (epoch seconds). */
  exp?: number;
  /** Issued-at (epoch seconds). */
  iat?: number;
  /** Not-before (epoch seconds). */
  nbf?: number;
  /** Custom session claims vary per Clerk app configuration. */
  [claim: string]: unknown;
}
