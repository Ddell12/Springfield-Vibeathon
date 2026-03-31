import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-gradient-to-br from-[#00595c] to-[#0d7377] hover:opacity-90 transition-opacity text-white shadow-none",
          },
        }}
      />
    </div>
  );
}
