import Image from "next/image";

export function AuthArtPanel() {
  return (
    <div className="relative hidden min-h-[620px] overflow-hidden rounded-[2rem] bg-[#c96834] lg:block">
      <Image
        src="/vocali-auth-slp.png"
        alt="Speech therapist working with a child using communication cards"
        fill
        priority
        sizes="(max-width: 1024px) 0px, 50vw"
        className="object-cover"
      />
    </div>
  );
}
