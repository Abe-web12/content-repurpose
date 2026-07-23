import { prisma } from "@/lib/prisma";
import { SecurityDashboard } from "@/components/security/security-dashboard";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Security",
  description: "Manage security settings, SSO, MFA, and compliance",
};

export default async function SecurityPage() {
  const { userId } = await auth();

  let orgId: string | undefined;
  if (userId) {
    const membership = await prisma.organizationMembers.findFirst({
      where: { userId, role: { in: ["OWNER", "ADMIN", "MANAGER"] } },
       select: { organizationId: true },
    });
    orgId = membership?.organizationId;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Security</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage authentication, access control, and compliance settings
        </p>
      </div>
      <SecurityDashboard orgId={orgId} />
    </div>
  );
}
