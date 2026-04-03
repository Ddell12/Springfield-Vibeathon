import { ForgotPasswordCard } from "@/features/auth/components/forgot-password-card";
import { MarketingHeader } from "@/shared/components/marketing-header";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="flex flex-1 items-center justify-center p-8">
        <ForgotPasswordCard />
      </main>
    </div>
  );
}
