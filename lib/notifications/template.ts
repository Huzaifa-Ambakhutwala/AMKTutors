import type { NotificationRuleTemplate } from "@/lib/types";

/** Very small mustache-style replacer: {{varName}} -> values[varName] (or empty string). */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key: string) => {
    const raw = variables[key];
    if (raw === undefined || raw === null) return "";
    return String(raw);
  });
}

export function renderRuleTemplate(
  tpl: NotificationRuleTemplate,
  variables: Record<string, string | number | undefined | null>
) {
  return {
    title: renderTemplate(tpl.title, variables),
    body: renderTemplate(tpl.body, variables),
    emailSubject: renderTemplate(tpl.emailSubject, variables),
    emailHtml: renderTemplate(tpl.emailHtml, variables),
  };
}

