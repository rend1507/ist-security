/** Ikon SVG sederhana — tanpa dependency ekstra. */

type IconProps = { className?: string };

const base = "h-5 w-5 shrink-0";

export function IconChart({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconKey({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="14" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M11 12.5 18 5.5M15 6l2.5 2.5M17 8l2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Daftar / log */
export function IconList({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconDatabase({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function IconLock({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Roda gigi — SVGRepo setting-cog (upload user).
 * viewBox dipotong ke isi ikon + sedikit padding agar ukuran optik
 * sama dengan ikon stroke 24×24 lain (bukan canvas 40×40 yang longgar).
 */
export function IconSettings({ className = base }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="10.5 10.5 19 19"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20 22.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zm0-4c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5z" />
      <path d="M20.7 28.5h-1.3c-.6 0-1.2-.5-1.2-1.2v-1c-.4-.1-.8-.3-1.2-.5-.1 0-.2 0-.2 0l-.7.7c-.4.4-1.2.4-1.7 0l-1-1c-.5-.5-.5-1.2 0-1.7l.7-.7c.1-.1 0-.2 0-.2-.2-.3-.3-.7-.4-1 0-.1-.1-.1-.2-.1h-.9c-.6 0-1.2-.5-1.2-1.2v-1.3c0-.6.5-1.2 1.2-1.2h.9c.1 0 .1-.1.2-.1.1-.4.3-.7.4-1 0-.1 0-.1 0-.2l-.7-.7c-.5-.5-.5-1.2 0-1.7l1-1c.4-.4 1.2-.4 1.7 0l.7.7c.1.1.1.1.2 0 .3-.2.7-.3 1-.4.1 0 .1-.1.1-.2v-.9c0-.6.5-1.2 1.2-1.2h1.3c.6 0 1.2.5 1.2 1.2v.9c0 .1.1.1.1.2.3.1.7.3 1 .4.1 0 .2 0 .2 0l.7-.7c.4-.4 1.2-.4 1.7 0l1 1c.5.5.5 1.2 0 1.7l-.7.7c-.1.1 0 .2 0 .2.2.3.3.7.4 1 0 .1.1.1.2.1h.9c.6 0 1.2.5 1.2 1.2v1.3c0 .6-.5 1.2-1.2 1.2h-.9c-.1 0-.1.1-.2.1-.1.4-.3.7-.4 1 0 .1 0 .1 0 .2l.7.7c.5.5.5 1.2 0 1.7l-1 1c-.4.4-1.2.4-1.7 0l-.7-.7c-.1-.1-.1-.1-.2 0-.3.2-.7.3-1 .4-.1 0-.1.1-.1.2v.9c0 .7-.5 1.2-1.1 1.2zm-3.8-3.7c.2 0 .4 0 .6.1.4.2.9.4 1.3.5.2.1.4.3.4.5v1.4c0 .1.1.2.2.2h1.3c.1 0 .2-.1.2-.2v-.9c0-.5.3-1 .8-1.1.3-.1.6-.2.9-.4.5-.2 1-.2 1.4.2l.7.7c.1.1.2.1.2 0l1-1c.1-.1.1-.2 0-.2l-.7-.7c-.4-.4-.4-.9-.2-1.4.1-.3.3-.6.4-.9.2-.5.6-.8 1.1-.8h.9c.1 0 .2-.1.2-.2v-1.3c0-.1-.1-.2-.2-.2h-.9c-.5 0-1-.3-1.1-.8-.1-.3-.2-.6-.4-.9-.2-.5-.2-1 .2-1.4l.7-.7c.1-.1.1-.2 0-.2l-1-1c-.1-.1-.2-.1-.2 0l-.7.7c-.4.3-.9.4-1.4.2-.3-.1-.6-.3-.9-.4-.5-.2-.8-.6-.8-1.1v-.9c0-.1-.1-.2-.2-.2h-1.3c-.1 0-.2.1-.2.2v.9c0 .5-.3 1-.8 1.1-.3.1-.6.2-.9.4-.5.2-1 .2-1.4-.2l-.7-.7c-.1-.1-.2-.1-.2 0l-1 1c-.1.1-.1.2 0 .2l.7.7c.4.4.4.9.2 1.4-.1.3-.3.6-.4.9-.2.5-.6.8-1.1.8h-.9c-.1 0-.2.1-.2.2v1.3c0 .1.1.2.2.2h.9c.5 0 1 .3 1.1.8.1.3.2.6.4.9.2.5.2 1-.2 1.4l-.7.7c-.1.1-.1.2 0 .2l1 1c.1.1.2.1.2 0l.7-.7c.2-.3.5-.4.8-.4z" />
    </svg>
  );
}

/** Printer — Cetak QR */
export function IconPrint({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 14h10v6H7v-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M17 11h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconClock({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8v4.5l3 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMenu({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconLogout({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2M15 12H4m0 0 3-3M4 12l3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPencil({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconClose({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlus({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Pinjam / ambil kunci — panah naik dari rak */
export function IconTake({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14V4M8 8l4-4 4 4M5 18h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Kembalikan kunci — panah turun ke garis (rak) */
export function IconGive({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v10M8 10l4 4 4-4M5 18h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
