export const ROLES = [
  "superadmin",
  "kepala_security",
  "admin",
  "security",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  kepala_security: "Kepala Security",
  admin: "Admin Data",
  security: "Petugas Security",
};

/** Bisa dipilih saat tambah/ubah akun lewat UI — Super Admin tidak. */
export const ASSIGNABLE_ROLES = [
  "kepala_security",
  "admin",
  "security",
] as const satisfies readonly Role[];

export function canLogin(role: string): boolean {
  return (
    role === "superadmin" ||
    role === "kepala_security" ||
    role === "admin" ||
    role === "security"
  );
}

export function canTransact(role: string): boolean {
  return (
    role === "superadmin" ||
    role === "kepala_security" ||
    role === "admin" ||
    role === "security"
  );
}

/** Data Master buku kunci (jenis kunci + peminjam) */
export function canManageMaster(role: string): boolean {
  return (
    role === "superadmin" ||
    role === "kepala_security" ||
    role === "admin"
  );
}

/** Ganti PIN sendiri */
export function canChangeOwnPin(role: string): boolean {
  return (
    role === "superadmin" ||
    role === "kepala_security" ||
    role === "admin" ||
    role === "security"
  );
}

export function canChangeAnyPin(role: string): boolean {
  return role === "superadmin";
}

/** Atur overdue global (popup) / per kunci — Super Admin & Admin */
export function canSetOverdue(role: string): boolean {
  return role === "superadmin" || role === "admin";
}

/** Kelola akun petugas — hanya Super Admin */
export function canManageUsers(role: string): boolean {
  return role === "superadmin";
}

/** Log masuk / keluar (audit) — hanya Super Admin */
export function canViewSessionLogs(role: string): boolean {
  return role === "superadmin";
}

/** Akun uji di layar Login — Super Admin sengaja tidak ditampilkan. */
export const DEMO_ACCOUNTS = [
  { id: "sec01", role: "Petugas Security" },
  { id: "kepala", role: "Kepala Security" },
  { id: "admin", role: "Admin Data" },
] as const;

export const DEMO_PASSWORD = "ist2026";
export const DEMO_PIN = "123456";
