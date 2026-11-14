export const SAMPLE_VARS: Record<string, string> = {
  santa_name: "John",
  child_name: "Jane",
  child_email: "jane@example.com",
  child_phone: "555 0142",
  child_address: "14 Cedar Lane",
  child_pref: "A wool scarf. Nothing breakable.",
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applyText(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_m, key: string) =>
    (vars[key] ?? "").replace(/[\r\n]+/g, " "),
  );
}

export function applyHtml(template: string, vars: Record<string, string>) {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    safe[key] = escapeHtml(value).replace(/\n/g, "<br/>");
  }
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_m, key: string) => safe[key] ?? "");
}
