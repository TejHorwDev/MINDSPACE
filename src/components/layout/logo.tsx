import Link from "next/link";

export function Logo({
  href = "/",
  size = "md",
}: {
  href?: string;
  size?: "md" | "lg";
}) {
  const textSize =
    size === "lg"
      ? "text-lg tracking-[0.22em]"
      : "text-[14px] tracking-[0.2em]";

  return (
    <Link
      href={href}
      className="group inline-flex items-center text-foreground transition-opacity hover:opacity-80"
      aria-label="MINDSPACE"
    >
      <span className={`${textSize} font-extrabold uppercase font-sans select-none text-foreground`}>
        MINDSPACE
      </span>
    </Link>
  );
}
