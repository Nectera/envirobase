export default function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#logoBg)" />
      <g transform="translate(256,256)">
        <line x1="-90" y1="-130" x2="-90" y2="130" stroke="white" strokeWidth="42" strokeLinecap="round" />
        <line x1="-90" y1="-130" x2="90" y2="-130" stroke="white" strokeWidth="42" strokeLinecap="round" />
        <line x1="-90" y1="0" x2="60" y2="0" stroke="white" strokeWidth="42" strokeLinecap="round" />
        <line x1="-90" y1="130" x2="90" y2="130" stroke="white" strokeWidth="42" strokeLinecap="round" />
        <path d="M75,-130 C75,-130 140,-170 150,-130 C160,-90 120,-80 90,-100" stroke="#86efac" strokeWidth="8" fill="#86efac" fillOpacity="0.4" />
        <path d="M82,-128 Q120,-150 140,-120" stroke="white" strokeWidth="3" fill="none" strokeOpacity="0.6" />
      </g>
    </svg>
  );
}
