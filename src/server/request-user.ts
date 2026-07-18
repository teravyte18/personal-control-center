import {
  AuthenticationInputError,
  AuthenticationRequiredError,
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/server/auth";

export type PersonalDataUser = AuthenticatedUser;

export class InvalidUserIdentityError extends AuthenticationInputError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserIdentityError";
  }
}

export { AuthenticationRequiredError };

export async function resolveRequestUser(request: Request): Promise<PersonalDataUser> {
  return requireAuthenticatedUser(request);
}
