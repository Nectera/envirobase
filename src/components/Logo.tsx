/* eslint-disable @next/next/no-img-element */
export default function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="EnviroBase"
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
    />
  );
}
