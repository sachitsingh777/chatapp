import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import { getUserByClerkId } from "./_utils";

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

     const conversationMembership=await ctx.db.query("conversationMembers")
     .withIndex("by_memberId",q=>q.eq("memberId",currentUser._id))
     .collect()

      const conversations=await Promise.all(
        conversationMembership?.map(async membership=>{
            const conversation =await ctx.db.get(membership.conversationId);
            if(!conversation){
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
    
           if(conversation.isGroup){
            return {conversation}
           }else{
            const otherMembership=allConversationMemberships.filter((membership)=>membership.memberId!==currentUser._id)[0];


            const otherMember=await ctx.db.get(otherMembership.memberId)
          
           return {conversation,otherMember}
        
        }
        })
    );
    
      
      return conversationWithDetails
    },
});