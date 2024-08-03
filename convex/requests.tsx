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

        console.log(`Current user: ${JSON.stringify(currentUser)}`);

        const requests = await ctx.db.query("requests")
            .withIndex("by_receiver", q => q.eq("receiver", currentUser._id))
            .collect();

        console.log(`Requests found: ${requests.length}`);

        const requestWithSender = await Promise.all(requests.map(async (request) => {
            const sender = await ctx.db.get(request.sender);

            if (!sender) {
                console.error(`Request sender could not be found for request ID: ${request._id}`);
                throw new Error("Request sender could not be found");
            }

            return { sender, request };
        }));

        console.log(`Request with sender details: ${JSON.stringify(requestWithSender)}`);

        return requestWithSender;
    },
});


