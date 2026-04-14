import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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

const formatParticipantName = (
  participant: { firstName?: string; lastName?: string } | null | undefined,
) => {
  if (!participant) return "Unknown";
  const full = `${participant.firstName ?? ""} ${participant.lastName ?? ""}`.trim();
  return full || "Unknown";
};

type Ctx = MutationCtx | QueryCtx;
type RosterMember = {
  participantId: Id<"participants">;
  name: string;
  role: "owner" | "member";
};
type RosterGroup = {
  accountId: Id<"accounts">;
  displayName: string;
  ownerId: string;
  participantCount: number;
  members: RosterMember[];
};

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

export const revokeMember = mutation({
  args: {
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const { membership } = await requireActiveMembershipByOwnerId(ctx, identity.subject);

    if (membership.role !== "admin") {
      throw new Error("FORBIDDEN");
    }
    if (args.ownerId === identity.subject) {
      throw new Error("CANNOT_REMOVE_YOURSELF");
    }

    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_and_owner", (q) =>
        q.eq("organizationId", membership.organizationId).eq("ownerId", args.ownerId),
      )
      .unique();

    if (!targetMembership || targetMembership.status !== "active") {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (targetMembership.role === "admin") {
      const activeMemberships = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org", (q) => q.eq("organizationId", membership.organizationId))
        .collect();
      const activeAdminCount = activeMemberships.filter(
        (orgMembership) =>
          orgMembership.status === "active" && orgMembership.role === "admin",
      ).length;

      if (activeAdminCount <= 1) {
        throw new Error("LAST_ADMIN_CANNOT_BE_REMOVED");
      }
    }

    const now = Date.now();
    await ctx.db.patch(targetMembership._id, {
      status: "revoked",
      revokedAt: now,
    });

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    for (const account of accounts) {
      if (account.organizationId === membership.organizationId) {
        await ctx.db.patch(account._id, {
          organizationId: undefined,
        });
      }
    }

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

export const getMyOrganizationRoster = query({
  args: {},
  returns: v.object({
    totals: v.object({
      accounts: v.number(),
      families: v.number(),
      individuals: v.number(),
      participants: v.number(),
    }),
    families: v.array(
      v.object({
        accountId: v.id("accounts"),
        displayName: v.string(),
        ownerId: v.string(),
        participantCount: v.number(),
        members: v.array(
          v.object({
            participantId: v.id("participants"),
            name: v.string(),
            role: v.union(v.literal("owner"), v.literal("member")),
          }),
        ),
      }),
    ),
    individuals: v.array(
      v.object({
        accountId: v.id("accounts"),
        displayName: v.string(),
        ownerId: v.string(),
        participantCount: v.number(),
        members: v.array(
          v.object({
            participantId: v.id("participants"),
            name: v.string(),
            role: v.union(v.literal("owner"), v.literal("member")),
          }),
        ),
      }),
    ),
  }),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const { membership } = await requireActiveMembershipByOwnerId(ctx, identity.subject);
    if (membership.role !== "admin") {
      throw new Error("FORBIDDEN");
    }

    const orgMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", membership.organizationId))
      .collect();
    const activeOwnerIds = new Set(
      orgMemberships.filter((m) => m.status === "active").map((m) => m.ownerId),
    );

    const orgAccounts = (await ctx.db.query("accounts").collect()).filter((account) =>
      activeOwnerIds.has(account.ownerId),
    );

    const families: RosterGroup[] = [];
    const individuals: RosterGroup[] = [];

    let participantTotal = 0;
    for (const account of orgAccounts) {
      const participants = await ctx.db
        .query("participants")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();

      const members = participants
        .map((p) => ({
          participantId: p._id,
          name: formatParticipantName(p),
          role: p.role,
        }))
        .sort((a, b) => {
          if (a.role === b.role) return a.name.localeCompare(b.name);
          return a.role === "owner" ? -1 : 1;
        });

      const row = {
        accountId: account._id,
        displayName: account.displayName,
        ownerId: account.ownerId,
        participantCount: members.length,
        members,
      };
      participantTotal += members.length;

      if (account.type === "family") {
        families.push(row);
      } else {
        individuals.push(row);
      }
    }

    families.sort((a, b) => a.displayName.localeCompare(b.displayName));
    individuals.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      totals: {
        accounts: orgAccounts.length,
        families: families.length,
        individuals: individuals.length,
        participants: participantTotal,
      },
      families,
      individuals,
    };
  },
});
