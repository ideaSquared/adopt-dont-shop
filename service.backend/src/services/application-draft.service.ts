import ApplicationDraft, { type ApplicationDraftAttributes } from '../models/ApplicationDraft';

/**
 * Backend-synced application drafts with last-write-wins semantics.
 *
 * The legacy autosave flow persisted drafts to localStorage only, so a
 * user starting on phone and switching to laptop lost their progress.
 * The frontend now PUTs the entire answers payload here on every
 * debounced keystroke; whoever wrote last wins.
 *
 * `expiresAt` is stamped to NOW() + 30d on each upsert; a daily cron
 * deletes rows past that horizon.
 */
const DRAFT_TTL_DAYS = 30;

const computeExpiresAt = (now: Date): Date => {
  const expires = new Date(now);
  expires.setDate(expires.getDate() + DRAFT_TTL_DAYS);
  return expires;
};

class ApplicationDraftService {
  async getDraft(userId: string, petId: string): Promise<ApplicationDraftAttributes | null> {
    const draft = await ApplicationDraft.findOne({
      where: { userId, petId },
    });
    return draft ? draft.get({ plain: true }) : null;
  }

  async upsertDraft(
    userId: string,
    petId: string,
    answers: Record<string, unknown>
  ): Promise<ApplicationDraftAttributes> {
    const existing = await ApplicationDraft.findOne({ where: { userId, petId } });
    const expiresAt = computeExpiresAt(new Date());

    if (existing) {
      existing.answers = answers;
      existing.expiresAt = expiresAt;
      await existing.save();
      return existing.get({ plain: true });
    }

    const created = await ApplicationDraft.create({
      userId,
      petId,
      answers,
      expiresAt,
    });
    return created.get({ plain: true });
  }

  async deleteDraft(userId: string, petId: string): Promise<boolean> {
    const deleted = await ApplicationDraft.destroy({
      where: { userId, petId },
    });
    return deleted > 0;
  }
}

export const applicationDraftService = new ApplicationDraftService();
export default applicationDraftService;
