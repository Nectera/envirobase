/* eslint-disable @next/next/no-img-element */
export default function Logo({ size = 32, className = "", src, alt }: { size?: number; className?: string; src?: string; alt?: string }) {
  return (
    <img
      src={src || "/logo.png"}
      alt={alt || "Logo"}
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
    />
  );
}
