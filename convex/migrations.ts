import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";

const LEGACY_ORG_NAME = "Legacy Book Club";
const LEGACY_ORG_SLUG = "legacy-book-club";
const CONFIRM_TEXT = "RUN_LEGACY_ORG_BACKFILL";

export const legacyOrganizationBackfillStatus = query({
  args: {},
  returns: v.object({
    legacyOrgExists: v.boolean(),
    legacyOrgId: v.union(v.null(), v.id("organizations")),
    accountsTotal: v.number(),
    accountsMissingOrganizationId: v.number(),
    activeMembershipsTotal: v.number(),
    activeAdminsInLegacyOrg: v.number(),
  }),
  handler: async (ctx) => {
    const legacyOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", LEGACY_ORG_SLUG))
      .unique();

    const accounts = await ctx.db.query("accounts").collect();
    const activeMemberships = (await ctx.db.query("organizationMembers").collect()).filter(
      (m) => m.status === "active",
    );

    const activeAdminsInLegacyOrg = legacyOrg
      ? activeMemberships.filter(
          (m) => m.organizationId === legacyOrg._id && m.role === "admin",
        ).length
      : 0;

    return {
      legacyOrgExists: Boolean(legacyOrg),
      legacyOrgId: legacyOrg?._id ?? null,
      accountsTotal: accounts.length,
      accountsMissingOrganizationId: accounts.filter((a) => !a.organizationId).length,
      activeMembershipsTotal: activeMemberships.length,
      activeAdminsInLegacyOrg,
    };
  },
});

export const runLegacyOrganizationBackfill = mutation({
  args: {
    confirm: v.string(),
  },
  returns: v.object({
    legacyOrgId: v.id("organizations"),
    createdLegacyOrganization: v.boolean(),
    accountsPatched: v.number(),
    membershipsCreated: v.number(),
    membershipsPromotedToAdmin: v.number(),
    skippedOwnersWithOtherActiveOrgMembership: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("NOT_AUTHENTICATED");

    if (args.confirm !== CONFIRM_TEXT) {
      throw new Error("CONFIRMATION_REQUIRED");
    }

    const callerAccount = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .unique();
    const hasAnyAdmin = (
      await ctx.db
        .query("accounts")
        .filter((q) => q.eq(q.field("isAdmin"), true))
        .first()
    ) != null;
    const canBootstrap = !hasAnyAdmin;

    if (!callerAccount?.isAdmin && !canBootstrap) {
      throw new Error("FORBIDDEN");
    }

    return await runBackfill(ctx, identity.subject);
  },
});

export const runLegacyOrganizationBackfillAsSystem = internalMutation({
  args: {
    confirm: v.string(),
  },
  returns: v.object({
    legacyOrgId: v.id("organizations"),
    createdLegacyOrganization: v.boolean(),
    accountsPatched: v.number(),
    membershipsCreated: v.number(),
    membershipsPromotedToAdmin: v.number(),
    skippedOwnersWithOtherActiveOrgMembership: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.confirm !== CONFIRM_TEXT) {
      throw new Error("CONFIRMATION_REQUIRED");
    }
    return await runBackfill(ctx, "system-migration");
  },
});

async function runBackfill(ctx: MutationCtx, creatorOwnerId: string) {
  let legacyOrg = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", LEGACY_ORG_SLUG))
    .unique();

  let createdLegacyOrganization = false;
  if (!legacyOrg) {
    const orgId = await ctx.db.insert("organizations", {
      name: LEGACY_ORG_NAME,
      slug: LEGACY_ORG_SLUG,
      createdByOwnerId: creatorOwnerId,
      isActive: true,
    });
    legacyOrg = await ctx.db.get(orgId);
    createdLegacyOrganization = true;
  }

  if (!legacyOrg) {
    throw new Error("MIGRATION_FAILED");
  }

  const allAccounts = await ctx.db.query("accounts").collect();

  let accountsPatched = 0;
  for (const account of allAccounts) {
    if (account.organizationId) continue;
    await ctx.db.patch(account._id, { organizationId: legacyOrg._id });
    accountsPatched += 1;
  }

  const refreshedAccounts = await ctx.db.query("accounts").collect();
  const refreshedLegacyAccounts = refreshedAccounts.filter(
    (a) => a.organizationId === legacyOrg._id,
  );

  const ownerHasLegacyAdminAccount = new Map<string, boolean>();
  for (const account of refreshedLegacyAccounts) {
    ownerHasLegacyAdminAccount.set(
      account.ownerId,
      Boolean(ownerHasLegacyAdminAccount.get(account.ownerId) || account.isAdmin),
    );
  }

  const legacyOwnerIds = Array.from(ownerHasLegacyAdminAccount.keys());

  let membershipsCreated = 0;
  let membershipsPromotedToAdmin = 0;
  let skippedOwnersWithOtherActiveOrgMembership = 0;

  for (const ownerId of legacyOwnerIds) {
    const ownerMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    const activeMembership = ownerMemberships.find((m) => m.status === "active");

    const shouldBeAdmin = ownerHasLegacyAdminAccount.get(ownerId) ?? false;

    if (!activeMembership) {
      await ctx.db.insert("organizationMembers", {
        organizationId: legacyOrg._id,
        ownerId,
        role: shouldBeAdmin ? "admin" : "member",
        status: "active",
        joinedAt: Date.now(),
        revokedAt: undefined,
      });
      membershipsCreated += 1;
      continue;
    }

    if (activeMembership.organizationId !== legacyOrg._id) {
      skippedOwnersWithOtherActiveOrgMembership += 1;
      continue;
    }

    if (shouldBeAdmin && activeMembership.role !== "admin") {
      await ctx.db.patch(activeMembership._id, { role: "admin" });
      membershipsPromotedToAdmin += 1;
    }
  }

  const activeLegacyMembers = (
    await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", legacyOrg._id))
      .collect()
  ).filter((m) => m.status === "active");

  const hasAdmin = activeLegacyMembers.some((m) => m.role === "admin");
  if (!hasAdmin && activeLegacyMembers.length > 0) {
    await ctx.db.patch(activeLegacyMembers[0]!._id, { role: "admin" });
    membershipsPromotedToAdmin += 1;
  }

  return {
    legacyOrgId: legacyOrg._id,
    createdLegacyOrganization,
    accountsPatched,
    membershipsCreated,
    membershipsPromotedToAdmin,
    skippedOwnersWithOtherActiveOrgMembership,
  };
}
