import { QueryCtx, MutationCtx } from "./_generated/server"


export const getUserByClerkId = async (
  { ctx, clerkId }: { ctx: QueryCtx | MutationCtx; clerkId: string }) => {
  console.log(`Searching for user with Clerk ID: ${clerkId}`);
  const user = await ctx.db.query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
  console.log(`Found user: ${user ? JSON.stringify(user) : "User not found"}`);
  return user;
};

