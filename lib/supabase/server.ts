/**
 * Backward-compatible server client — maintained for routes not yet migrated
 * to shared middleware. Uses Clerk under the hood.
 *
 * Phase 8 migration: New routes should use queryHandler/mutationHandler
 * from @/lib/api/shared-middleware instead.
 */

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function createClient() {
  return {
    auth: {
      getUser: async () => {
        const session = await auth();
        const userId = session.userId;
        if (!userId) return { data: { user: null } };
        try {
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);
          const email = clerkUser.emailAddresses[0]?.emailAddress || "";
          return {
            data: {
              user: {
                id: userId,
                email,
                emailAddresses: clerkUser.emailAddresses,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                imageUrl: clerkUser.imageUrl,
                user_metadata: {
                  full_name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : null,
                  name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : null,
                  avatar_url: clerkUser.imageUrl,
                  picture: clerkUser.imageUrl,
                },
              },
            },
          };
        } catch {
          return { data: { user: null } };
        }
      },
    },
  };
}
