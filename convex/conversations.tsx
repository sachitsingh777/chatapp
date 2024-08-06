import { ConvexError } from "convex/values";
import { query, QueryCtx, MutationCtx } from "./_generated/server";
import { getUserByClerkId } from "./_utils";
import { Id } from "./_generated/dataModel"
export const get = query({
    args: {},
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            console.error("Unauthorized: No user identity found");
            throw new Error("Unauthorized");
        }

        console.log(`User identity: ${JSON.stringify(identity)}`);

        const currentUser = await getUserByClerkId({
            ctx, clerkId: identity.subject
        });

        if (!currentUser) {
            console.error(`User not found for Clerk ID: ${identity.subject}`);
            throw new Error("User not found");
        }

        const conversationMembership = await ctx.db.query("conversationMembers")
            .withIndex("by_memberId", q => q.eq("memberId", currentUser._id))
            .collect()

        const conversations = await Promise.all(
            conversationMembership?.map(async membership => {
                const conversation = await ctx.db.get(membership.conversationId);
                if (!conversation) {
                    throw new ConvexError("conversation could be not found")
                }

                return conversation;
            })
        );

        const conversationWithDetails = await Promise.all(
            conversations.map(async (conversation, index) => {
                const allConversationMemberships = await ctx.db.query("conversationMembers")
                    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversation?._id))
                    .collect();

                const lastMessage = await getLastMessageDetails({
                    ctx,
                    id: conversation.lastMessageId
                })

               const lastSeenMessage=conversationMembership[index].lastSeenMessage?await ctx.db.get(conversationMembership[index].lastSeenMessage!):null
                 
               const lastSeenMessageTime=lastSeenMessage?lastSeenMessage._creationTime:-1;
                 

             const unseenMessage=await ctx.db.query("messages")
             .withIndex("by_conversationId",q=>q.eq("conversationId",conversation._id))
             .filter(q=>q.gt(q.field("_creationTime"),lastSeenMessageTime)).filter(q=>q.neq(q.field("senderId"),currentUser._id))
             .collect()


               if (conversation.isGroup) {
                    return { conversation, lastMessage,unseenCount:unseenMessage.length }
                } else {
                    const otherMembership = allConversationMemberships.filter((membership) => membership.memberId !== currentUser._id)[0];


                    const otherMember = await ctx.db.get(otherMembership.memberId)

                    return { conversation, otherMember, lastMessage,unseenCount:unseenMessage.length }

                }
            })
        );


        return conversationWithDetails
    },
});

const getLastMessageDetails = async ({ ctx, id }: { ctx: QueryCtx | MutationCtx; id: Id<"messages"> | undefined }) => {
    if (!id) return null;

    const message = await ctx.db.get(id);
    if (!message) return null;

    const sender = await ctx.db.get(message.senderId);
    if (!sender) return null;

    const content = getMessageContent(message.type, message.content as unknown as string);

    return {
        content,
        sender: sender.username
    };
};



const getMessageContent = (type: string, content: string) => {
    switch (type) {
        case "text":
            return content;
        default:
            return "[Non-text]"
    }
}