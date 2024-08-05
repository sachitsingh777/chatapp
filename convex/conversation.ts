import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
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


        }else{

            const otherMembers = await Promise.all(
                allConversationMemberships
                  .filter((membership) => membership.memberId !== currentUser._id)
                  .map(async (membership) => {
                    const member = await ctx.db.get(membership.memberId);
              
                    if (!member) {
                      throw new ConvexError("Member could not be found");
                    }
              
                    return {
                      username: member.username,
                    };
                  })
              );
              
              return { ...conversation, otherMembers, otherMember: null };
              
        }






    },
});



export const createdGroup = mutation({
    args: {
        members: v.array(v.id("users")),
        name:v.string()
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

       const conversationId=await ctx.db.insert("conversations",{
        isGroup:true,
        name:args.name
       })
       
       await Promise.all([...args.members,currentUser._id].map(async (memberId)=>{
        await ctx.db.insert("conversationMembers",{
            memberId,
            conversationId,
        })
       }))

    },
});



export const deleteGroup =mutation({
    args:{
       conversationId:v.id("conversations"),
      
    },
    handler:async(ctx,args)=>{
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

      const conversation=await ctx.db.get(args.conversationId)
      if (!conversation) {
       
        throw new ConvexError("conversation not found");
    }
       const memberships=await ctx.db.query("conversationMembers")
       .withIndex("by_conversationId",q=>q.eq("conversationId",args.conversationId))
       .collect()

         if(!memberships||memberships.length!==2){
            throw new ConvexError("This conversation does not have any members");
         }

         const friendships=await ctx.db.query("friends")
         .withIndex("by_conversationId",q=>{
            return q.eq("conversationId",args.conversationId);

         })
         .unique()
         
         if(!friendships){
            throw new ConvexError("Friend could not be found");
         }
        
         const messages=await ctx.db.query("messages")
         .withIndex("by_conversationId",q=>q.eq("conversationId",
            args.conversationId)).collect()

          await ctx.db.delete(args.conversationId)
          await ctx.db.delete(friendships._id)

          await Promise.all(memberships.map(async membership=>{
            await ctx.db.delete(membership._id)
          }))


          await Promise.all(messages.map(async message=>{
            await ctx.db.delete(message._id)
          }))

    }
})