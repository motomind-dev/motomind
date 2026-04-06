import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import ProfileForms from "./ProfileForms";
import ProfileSecuritySection from "./ProfileSecuritySection";
import ProfilePremiumSection from "@/components/ProfilePremiumSection";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, createdAt: true, plan: true },
  });

  if (!user) redirect("/login");

  const userProfile = {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Profil</h1>
        <p className="text-zinc-500 mt-1">Gère les informations de ton compte</p>
      </div>

      <ProfileForms initialUser={userProfile} />

      <ProfilePremiumSection plan={user.plan === "PRO" ? "PRO" : "FREE"} />

      <ProfileSecuritySection />
    </div>
  );
}
