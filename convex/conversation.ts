import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { getUserByClerkId } from "./_utils";


export const get = query({
    args: {
        id: v.id("conversations")
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            console.error("Unauthorized: No user identity found");
            throw new ConvexError("Unauthorized");
        }

        console.log(`User identity: ${JSON.stringify(identity)}`);

        const currentUser = await getUserByClerkId({
            ctx, clerkId: identity.subject
        });

        if (!currentUser) {
            console.error(`User not found for Clerk ID: ${identity.subject}`);
            throw new ConvexError("User not found");
        }

        console.log(`Current user: ${JSON.stringify(currentUser)}`);

        const conversation = await ctx.db.get(args.id)

        if (!conversation) {
            throw new ConvexError("conversation not found")
        }

        const membership = await ctx.db.query("conversationMembers")
            .withIndex("by_memberId_conversationId", q => q.eq("memberId", currentUser._id)
                .eq("conversationId", conversation._id))
            .unique()

        if (!membership) {
            throw new ConvexError("You aren't a member of this conversation")
        }


        const allConversationMemberships = await ctx.db.query("conversationMembers")
            .withIndex("by_conversationId",
                (q) => q.eq("conversationId", args.id))
            .collect();

        if (!conversation.isGroup) {
            const otherMembership =
                allConversationMemberships.filter(
                    (membership) => membership.memberId !== currentUser._id
                )[0];

            const otherMembershipDetails = await ctx.db.get(otherMembership.memberId);

            return {
                ...conversation,
                otherMember: {
                    ...otherMembershipDetails,
                    lastSeenMessageId: otherMembership.lastSeenMessage
                },
                otherMembers: null
            }


        }






    },
});