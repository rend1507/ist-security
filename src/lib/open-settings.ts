/** Buka modal Pengaturan / Batas terlambat di AppShell (satu popup). */
export const OPEN_SETTINGS_EVENT = "ist:open-settings";

export function openSettingsModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}
