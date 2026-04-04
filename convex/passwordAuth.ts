import {
  ConvexCredentials,
  type ConvexCredentialsUserConfig,
} from "@convex-dev/auth/providers/ConvexCredentials";
import {
  type EmailConfig,
  type GenericActionCtxWithAuthConfig,
  createAccount,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
  signInViaProvider,
} from "@convex-dev/auth/server";
import {
  type DocumentByName,
  type GenericDataModel,
  type WithoutSystemFields,
} from "convex/server";
import { type Value } from "convex/values";
import { Scrypt } from "../node_modules/.pnpm/lucia@3.2.2/node_modules/lucia/dist/crypto.js";

type PasswordFlow =
  | "signIn"
  | "signUp"
  | "reset"
  | "reset-verification"
  | "email-verification";

type PasswordAuthErrorMode =
  | "sign-in"
  | "reset"
  | "reset-verification"
  | "email-verification";

const INVALID_ACCOUNT_ERRORS = new Set(["InvalidAccountId", "InvalidAountId"]);
const INVALID_SECRET_ERRORS = new Set(["InvalidSecret", "TooManyFailedAttempts"]);

export interface PasswordConfig<DataModel extends GenericDataModel> {
  id?: string;
  profile?: (
    params: Record<string, Value | undefined>,
    ctx: GenericActionCtxWithAuthConfig<DataModel>,
  ) => WithoutSystemFields<DocumentByName<DataModel, "users">> & {
    email: string;
  };
  validatePasswordRequirements?: (password: string) => void;
  crypto?: ConvexCredentialsUserConfig["crypto"];
  reset?: EmailConfig | ((...args: any[]) => EmailConfig);
  verify?: EmailConfig | ((...args: any[]) => EmailConfig);
}

export function shouldNormalizePasswordAuthError(
  error: unknown,
  mode: PasswordAuthErrorMode,
): boolean {
  const message = error instanceof Error ? error.message : "";
  if (mode === "sign-in") {
    return (
      INVALID_ACCOUNT_ERRORS.has(message) || INVALID_SECRET_ERRORS.has(message)
    );
  }
  if (mode === "reset") {
    return INVALID_ACCOUNT_ERRORS.has(message);
  }
  if (mode === "reset-verification" || mode === "email-verification") {
    return INVALID_ACCOUNT_ERRORS.has(message);
  }
  return false;
}

export function Password<DataModel extends GenericDataModel>(
  config: PasswordConfig<DataModel> = {},
) {
  const provider = config.id ?? "password";
  return ConvexCredentials<DataModel>({
    id: provider,
    authorize: async (params, ctx) => {
      const flow = params.flow as PasswordFlow;
      const passwordToValidate =
        flow === "signUp"
          ? (params.password as string)
          : flow === "reset-verification"
            ? (params.newPassword as string)
            : null;

      if (passwordToValidate !== null) {
        if (config.validatePasswordRequirements !== undefined) {
          config.validatePasswordRequirements(passwordToValidate);
        } else {
          validateDefaultPasswordRequirements(passwordToValidate);
        }
      }

      const profile = config.profile?.(params, ctx) ?? defaultProfile(params);
      const { email } = profile;
      const secret = params.password as string | undefined;

      if (flow === "signUp") {
        if (secret === undefined) {
          throw new Error("Missing `password` param for `signUp` flow");
        }
        const { account, user } = await createAccount(ctx, {
          provider,
          account: { id: email, secret },
          profile:
            profile as unknown as WithoutSystemFields<
              DocumentByName<DataModel, "users">
            >,
          shouldLinkViaEmail: config.verify !== undefined,
          shouldLinkViaPhone: false,
        });
        if (config.verify && !account.emailVerified) {
          return await signInViaProvider(ctx, config.verify, {
            accountId: account._id,
            params,
          });
        }
        return { userId: user._id };
      }

      if (flow === "signIn") {
        if (secret === undefined) {
          throw new Error("Missing `password` param for `signIn` flow");
        }
        try {
          const { account, user } = await retrieveAccount(ctx, {
            provider,
            account: { id: email, secret },
          });
          if (config.verify && !account.emailVerified) {
            return await signInViaProvider(ctx, config.verify, {
              accountId: account._id,
              params,
            });
          }
          return { userId: user._id };
        } catch (error) {
          if (shouldNormalizePasswordAuthError(error, "sign-in")) {
            return null;
          }
          throw error;
        }
      }

      if (flow === "reset") {
        if (!config.reset) {
          throw new Error(`Password reset is not enabled for ${provider}`);
        }
        try {
          const { account } = await retrieveAccount(ctx, {
            provider,
            account: { id: email },
          });
          return await signInViaProvider(ctx, config.reset, {
            accountId: account._id,
            params,
          });
        } catch (error) {
          if (shouldNormalizePasswordAuthError(error, "reset")) {
            return null;
          }
          throw error;
        }
      }

      if (flow === "reset-verification") {
        if (!config.reset) {
          throw new Error(`Password reset is not enabled for ${provider}`);
        }
        if (params.newPassword === undefined) {
          throw new Error(
            "Missing `newPassword` param for `reset-verification` flow",
          );
        }

        let resetAccountUserId: string;
        try {
          const { account } = await retrieveAccount(ctx, {
            provider,
            account: { id: email },
          });
          resetAccountUserId = String(account.userId);
        } catch (error) {
          if (shouldNormalizePasswordAuthError(error, "reset-verification")) {
            throw new Error("Invalid code");
          }
          throw error;
        }

        const result = await signInViaProvider(ctx, config.reset, { params });
        if (result === null) {
          throw new Error("Invalid code");
        }

        const { userId, sessionId } = result;
        if (resetAccountUserId !== String(userId)) {
          throw new Error("Invalid code");
        }

        await modifyAccountCredentials(ctx, {
          provider,
          account: { id: email, secret: params.newPassword as string },
        });
        await invalidateSessions(ctx, { userId, except: [sessionId] });
        return { userId, sessionId };
      }

      if (flow === "email-verification") {
        if (!config.verify) {
          throw new Error(`Email verification is not enabled for ${provider}`);
        }
        try {
          const { account } = await retrieveAccount(ctx, {
            provider,
            account: { id: email },
          });
          return await signInViaProvider(ctx, config.verify, {
            accountId: account._id,
            params,
          });
        } catch (error) {
          if (shouldNormalizePasswordAuthError(error, "email-verification")) {
            throw new Error("Invalid code");
          }
          throw error;
        }
      }

      throw new Error(
        "Missing `flow` param, it must be one of " +
          '"signUp", "signIn", "reset", "reset-verification" or ' +
          '"email-verification"!',
      );
    },
    crypto: {
      async hashSecret(password: string) {
        return await new Scrypt().hash(password);
      },
      async verifySecret(password: string, hash: string) {
        return await new Scrypt().verify(hash, password);
      },
    },
    extraProviders: [config.reset, config.verify],
    ...config,
  });
}

function validateDefaultPasswordRequirements(password: string) {
  if (!password || password.length < 8) {
    throw new Error("Invalid password");
  }
}

function defaultProfile(params: Record<string, unknown>) {
  return {
    email: params.email as string,
  };
}
