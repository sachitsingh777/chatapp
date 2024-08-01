import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
    args: {
        username: v.string(),
        imageUrl: v.string(),
        clerkId: v.string(),
        email: v.string(),
    },
    handler: async (ctx, args: { username: string; imageUrl: string; clerkId: string; email: string }) => {
        await ctx.db.insert("users", args);
    }
});

export const get = internalQuery({
    args: { clerkId: v.string() },
    async handler(ctx, args: { clerkId: string }) {
        return ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();
    }
});
