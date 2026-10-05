// Shared class names and query helper for signed-in app pages.
export const card = "rounded-[20px] border border-line/60 bg-glass/60 p-6 backdrop-blur-2xl";
export const mono = "font-[JetBrains_Mono] text-[11px] uppercase tracking-wider text-muted";
export const input = "w-full rounded-lg border border-line/70 bg-panel/60 px-3 py-2 text-[14px]";
export const btn = "rounded-full border border-line/70 px-4 py-2 text-[13px] hover:bg-panel disabled:opacity-50";
export const primaryBtn = "rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground hover:bg-primary/90 disabled:opacity-50";

export async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const daysTo = (iso: string) => Math.ceil((new Date(iso + "T00:00:00").getTime() - Date.now()) / 86400000);
