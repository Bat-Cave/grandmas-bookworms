import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import {
  getActiveMembershipByOwnerId,
  requireActiveMembershipByOwnerId,
  requireIdentity,
} from "./lib/authz";

const hashValue = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const normalizeInviteCode = (value: string) => value.trim().toUpperCase();

const randomInviteCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let code = "";
  for (let i = 0; i < bytes.length; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `${code.slice(0, 5)}-${code.slice(5)}`;
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

type Ctx = MutationCtx | QueryCtx;

const uniqueSlug = async (ctx: Ctx, baseName: string) => {
  const base = toSlug(baseName) || "book-club";
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
};

export const getMyMembership = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("organizationMembers"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      ownerId: v.string(),
      role: v.union(v.literal("admin"), v.literal("member")),
      status: v.union(v.literal("active"), v.literal("revoked")),
      joinedAt: v.number(),
      revokedAt: v.optional(v.number()),
      organizationName: v.string(),
      organizationSlug: v.string(),
      organizationIsActive: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const membership = await getActiveMembershipByOwnerId(ctx, identity.subject);
    if (!membership) return null;

    const organization = await ctx.db.get(membership.organizationId);
    if (!organization) return null;

    return {
      ...membership,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationIsActive: organization.isActive,
    };
  },
});

export const createOrganization = mutation({
  args: {
    name: v.string(),
  },
  returns: v.object({
    organizationId: v.id("organizations"),
    membershipId: v.id("organizationMembers"),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const existingMembership = await getActiveMembershipByOwnerId(ctx, identity.subject);
    if (existingMembership) {
      throw new Error("ALREADY_IN_ORGANIZATION");
    }

    const slug = await uniqueSlug(ctx, args.name);
    const now = Date.now();

    const organizationId = await ctx.db.insert("organizations", {
      name: args.name.trim(),
      slug,
      createdByOwnerId: identity.subject,
      isActive: true,
    });

    const membershipId = await ctx.db.insert("organizationMembers", {
      organizationId,
      ownerId: identity.subject,
      role: "admin",
      status: "active",
      joinedAt: now,
    });

    return { organizationId, membershipId };
  },
});

export const createInvite = mutation({
  args: {
    organizationId: v.id("organizations"),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
  },
  returns: v.object({
    inviteId: v.id("organizationInvites"),
    code: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { membership } = await requireActiveMembershipByOwnerId(ctx, identity.subject);

    if (membership.organizationId !== args.organizationId) {
      throw new Error("ORG_MISMATCH");
    }
    if (membership.role !== "admin") {
      throw new Error("FORBIDDEN");
    }

    const code = randomInviteCode();
    const codeHash = await hashValue(code);
    const now = Date.now();

    const inviteId = await ctx.db.insert("organizationInvites", {
      organizationId: args.organizationId,
      code,
      codeHash,
      createdByOwnerId: identity.subject,
      createdAt: now,
      expiresAt: args.expiresAt,
      maxUses: args.maxUses,
      useCount: 0,
      revokedAt: undefined,
    });

    return { inviteId, code };
  },
});

export const revokeInvite = mutation({
  args: {
    inviteId: v.id("organizationInvites"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { membership } = await requireActiveMembershipByOwnerId(ctx, identity.subject);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("INVITE_NOT_FOUND");
    if (invite.organizationId !== membership.organizationId) {
      throw new Error("ORG_MISMATCH");
    }
    if (membership.role !== "admin") {
      throw new Error("FORBIDDEN");
    }

    await ctx.db.patch(args.inviteId, { revokedAt: Date.now() });
    return null;
  },
});

export const joinOrganizationByInvite = mutation({
  args: {
    code: v.string(),
  },
  returns: v.object({
    organizationId: v.id("organizations"),
    membershipId: v.id("organizationMembers"),
  }),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const existingMembership = await getActiveMembershipByOwnerId(ctx, identity.subject);
    if (existingMembership) {
      throw new Error("ALREADY_IN_ORGANIZATION");
    }

    const normalizedCode = normalizeInviteCode(args.code);
    const codeHash = await hashValue(normalizedCode);
    const inviteCandidates = await ctx.db
      .query("organizationInvites")
      .withIndex("by_code_hash", (q) => q.eq("codeHash", codeHash))
      .collect();

    if (inviteCandidates.length === 0) throw new Error("INVITE_INVALID");
    const invite = inviteCandidates.find((candidate) => !candidate.revokedAt);
    if (!invite) throw new Error("INVITE_REVOKED");

    const now = Date.now();
    if (invite.expiresAt !== undefined && invite.expiresAt < now) {
      throw new Error("INVITE_EXPIRED");
    }
    if (invite.maxUses !== undefined && invite.useCount >= invite.maxUses) {
      throw new Error("INVITE_EXHAUSTED");
    }

    const organization = await ctx.db.get(invite.organizationId);
    if (!organization || !organization.isActive) {
      throw new Error("INVITE_INVALID");
    }

    const existingOrgMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_and_owner", (q) =>
        q.eq("organizationId", invite.organizationId).eq("ownerId", identity.subject),
      )
      .first();

    if (existingOrgMembership?.status === "active") {
      throw new Error("ALREADY_IN_ORGANIZATION");
    }

    const membershipId = await ctx.db.insert("organizationMembers", {
      organizationId: invite.organizationId,
      ownerId: identity.subject,
      role: "member",
      status: "active",
      joinedAt: now,
      revokedAt: undefined,
    });

    await ctx.db.patch(invite._id, {
      useCount: invite.useCount + 1,
    });

    return { organizationId: invite.organizationId, membershipId };
  },
});

export const listMyOrganizationInvites = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("organizationInvites"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      code: v.optional(v.string()),
      createdByOwnerId: v.string(),
      createdAt: v.number(),
      expiresAt: v.optional(v.number()),
      maxUses: v.optional(v.number()),
      useCount: v.number(),
      revokedAt: v.optional(v.number()),
      isRevoked: v.boolean(),
      isExpired: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const { membership } = await requireActiveMembershipByOwnerId(ctx, identity.subject);
    if (membership.role !== "admin") {
      throw new Error("FORBIDDEN");
    }

    const now = Date.now();
    const invites = await ctx.db
      .query("organizationInvites")
      .withIndex("by_org", (q) => q.eq("organizationId", membership.organizationId))
      .collect();

    invites.sort((a, b) => b.createdAt - a.createdAt);
    return invites.map((invite) => ({
      _id: invite._id,
      _creationTime: invite._creationTime,
      organizationId: invite.organizationId,
      code: invite.code,
      createdByOwnerId: invite.createdByOwnerId,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      revokedAt: invite.revokedAt,
      isRevoked: Boolean(invite.revokedAt),
      isExpired: invite.expiresAt !== undefined && invite.expiresAt < now,
    }));
  },
});
