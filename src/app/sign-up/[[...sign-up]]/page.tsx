import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        signInUrl="/sign-in"
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
