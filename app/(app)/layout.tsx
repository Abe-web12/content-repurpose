import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { AuthProvider } from "@/components/providers/auth-provider";
import { UsageProvider } from "@/components/providers/usage-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AppProviders } from "@/components/providers/app-providers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  let onboardingCompleted = false;
  try {
    const dbUser = await prisma.users.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true },
    });
    onboardingCompleted = dbUser?.onboardingCompleted ?? false;
  } catch {
    onboardingCompleted = false;
  }

  return (
    <AuthProvider>
      <UsageProvider>
        <WorkspaceProvider>
        <AppProviders showOnboarding={!onboardingCompleted}>
          <div className="min-h-screen bg-[#F8FAFC]">
            <div className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
              <Sidebar />
            </div>
            <div className="min-h-screen lg:pl-64">
              <Topbar />
              <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
          </div>
        </AppProviders>
        </WorkspaceProvider>
      </UsageProvider>
    </AuthProvider>
  );
}
