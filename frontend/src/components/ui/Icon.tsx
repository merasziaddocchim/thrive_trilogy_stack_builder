// Simple monochrome line icons (BRAND_GUIDELINES §4: "simple monochrome line icons").
// Stroke-based, currentColor, 1.75 weight — consistent single icon family. Meant to be
// wrapped in <IconCircle> (soft blue circular container) for section decoration.
type IconProps = { className?: string };

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export function IconLayers({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 18 9 5 9-5" />
    </svg>
  );
}

export function IconScale({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v18" />
      <path d="M5 7h14" />
      <path d="m5 7-3 6a3 3 0 0 0 6 0L5 7Z" />
      <path d="m19 7-3 6a3 3 0 0 0 6 0l-3-6Z" />
      <path d="M8 21h8" />
    </svg>
  );
}

export function IconMagnifier({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconReceipt({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function IconPencil({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M14 7l3 3" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4 2 20h20L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}
