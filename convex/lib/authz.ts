import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export type ConvexAuthCtx = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: ConvexAuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("NOT_AUTHENTICATED");
  return identity;
}

export async function getAccountForOwnerId(ctx: ConvexAuthCtx, ownerId: string) {
  return await ctx.db
    .query("accounts")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
}

export async function requireAccountForOwnerId(
  ctx: ConvexAuthCtx,
  ownerId: string,
) {
  const account = await getAccountForOwnerId(ctx, ownerId);
  if (!account) throw new Error("NO_ACCOUNT");
  return account;
}

export async function requireAccountWithOrganizationByOwnerId(
  ctx: ConvexAuthCtx,
  ownerId: string,
) {
  const account = await requireAccountForOwnerId(ctx, ownerId);
  if (!account.organizationId) throw new Error("MEMBERSHIP_REQUIRED");
  return account;
}

export async function getActiveMembershipByOwnerId(
  ctx: ConvexAuthCtx,
  ownerId: string,
) {
  const memberships = await ctx.db
    .query("organizationMembers")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();

  return memberships.find((membership) => membership.status === "active") ?? null;
}

export async function requireActiveMembershipByOwnerId(
  ctx: ConvexAuthCtx,
  ownerId: string,
) {
  const membership = await getActiveMembershipByOwnerId(ctx, ownerId);
  if (!membership) throw new Error("MEMBERSHIP_REQUIRED");

  const organization = await ctx.db.get(membership.organizationId);
  if (!organization || !organization.isActive) {
    throw new Error("MEMBERSHIP_REQUIRED");
  }

  return { membership, organization };
}

export async function requireActiveMembership(ctx: ConvexAuthCtx) {
  const identity = await requireIdentity(ctx);
  return await requireActiveMembershipByOwnerId(ctx, identity.subject);
}

export async function requireMyAccountWithOrganization(ctx: ConvexAuthCtx) {
  const identity = await requireIdentity(ctx);
  return await requireAccountWithOrganizationByOwnerId(ctx, identity.subject);
}

export async function getOrganizationAccountIds(
  ctx: ConvexAuthCtx,
  organizationId: Id<"organizations">,
) {
  const orgAccounts = await ctx.db
    .query("accounts")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  return new Set(orgAccounts.map((a) => a._id));
}
