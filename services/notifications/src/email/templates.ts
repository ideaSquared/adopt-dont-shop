// Template lookup — the SendEmail handler resolves a templateId or
// template-name reference to a row from `email_templates`, applies the
// render, then queues the resolved subject+html. Templates are seeded
// (admin CRUD lives outside this service for now) so this is a read
// surface only.

import type { DbConn } from './queue.js';

export type EmailTemplate = {
  templateId: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  status: 'draft' | 'active' | 'inactive' | 'archived';
};

type EmailTemplateRow = {
  template_id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  status: 'draft' | 'active' | 'inactive' | 'archived';
};

const rowToTemplate = (row: EmailTemplateRow): EmailTemplate => ({
  templateId: row.template_id,
  name: row.name,
  subject: row.subject,
  htmlContent: row.html_content,
  textContent: row.text_content,
  status: row.status,
});

// Accepts either a UUID (templateId) or a string name. Returns the
// active row or null when not found / not active.
export const findActiveTemplate = async (
  conn: DbConn,
  ref: string
): Promise<EmailTemplate | null> => {
  const res = await conn.query<EmailTemplateRow>(
    `
    SELECT template_id, name, subject, html_content, text_content, status
    FROM email_templates
    WHERE (template_id::text = $1 OR name = $1)
      AND deleted_at IS NULL
      AND status = 'active'
    ORDER BY locale = 'en' DESC
    LIMIT 1
    `,
    [ref]
  );
  return res.rows[0] ? rowToTemplate(res.rows[0]) : null;
};

export const incrementTemplateUsage = async (conn: DbConn, templateId: string): Promise<void> => {
  await conn.query(
    `
    UPDATE email_templates
    SET usage_count = usage_count + 1,
        last_used_at = now(),
        updated_at = now(),
        version = version + 1
    WHERE template_id = $1
    `,
    [templateId]
  );
};
