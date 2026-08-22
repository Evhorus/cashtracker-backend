import { AuthUser } from './auth-user.type';

// @types/passport already declares `Request.user?: Express.User` (with
// `Express.User` an intentionally empty interface for consumers to extend)
// - augmenting `Express.User` here, rather than redeclaring `Request.user`
// directly, is what lets that declaration pick up our real shape instead of
// the two conflicting declarations of `Request.user` shadowing each other.
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- intentional declaration-merging extension, not a redundant interface
    interface User extends AuthUser {}
  }
}
