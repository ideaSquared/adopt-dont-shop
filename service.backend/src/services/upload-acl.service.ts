/**
 * ADS-422 follow-up: per-resource ACL for `/uploads/*` requests.
 *
 * The nginx auth_request gate (`GET /api/v1/uploads/authorize`) already
 * confirms the requester is logged in. This module decides whether the
 * authenticated user is allowed to see the *specific* file behind the
 * request path — e.g. "is this the application owner, or a staff member
 * of the rescue handling that application?". Public assets (pet photos,
 * profile avatars) bypass per-resource checks; private assets fall back
 * to a fail-closed deny.
 *
 * Returns an HTTP status verdict — the caller maps that onto the empty
 * 200/403/404 response nginx expects.
 */
import path from 'path';
import Application from '../models/Application';
import ChatParticipant from '../models/ChatParticipant';
import FileUpload from '../models/FileUpload';
import StaffMember from '../models/StaffMember';
import User, { UserType } from '../models/User';

export type UploadAccessVerdict = 200 | 403 | 404;

/**
 * Path-shape mapping (see PR body for the full table):
 *   pets/*, profiles/*       → public, auth-only
 *   applications/*           → owner OR rescue staff OR admin
 *   chat/*                   → chat participant OR admin
 *   documents/*, temp/*      → uploader OR admin (no entity link to staff)
 *   anything else            → 404 (unknown shape, fail-closed)
 */
const PUBLIC_PREFIXES = new Set(['pets', 'profiles']);
const PRIVATE_PREFIXES = new Set(['applications', 'chat', 'documents', 'temp']);

type DecideArgs = {
  filePath: string;
  user: User;
};

const splitPath = (filePath: string): { prefix: string; basename: string } | null => {
  const cleaned = filePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  const segments = cleaned.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  const [prefix, ...rest] = segments;
  // basename includes any subdirectories — but in practice the writer
  // service places files directly under <prefix>/, so we use the final
  // segment to look up the FileUpload row.
  return { prefix, basename: path.basename(rest[rest.length - 1]) };
};

const isAdmin = (user: User): boolean =>
  user.userType === UserType.ADMIN || user.userType === UserType.MODERATOR;

const isVerifiedStaffOf = async (userId: string, rescueId: string): Promise<boolean> => {
  const row = await StaffMember.findOne({
    where: { userId, rescueId, isVerified: true },
    attributes: ['staffMemberId'],
  });
  return Boolean(row);
};

const isChatParticipant = async (userId: string, chatId: string): Promise<boolean> => {
  const row = await ChatParticipant.findOne({
    where: { participant_id: userId, chat_id: chatId },
    attributes: ['chat_participant_id'],
  });
  return Boolean(row);
};

const decideApplicationAccess = async (
  upload: FileUpload,
  user: User
): Promise<UploadAccessVerdict> => {
  if (upload.uploaded_by === user.userId) {
    return 200;
  }
  if (!upload.entity_id) {
    return 403;
  }
  const application = await Application.findByPk(upload.entity_id, {
    attributes: ['userId', 'rescueId'],
  });
  if (!application) {
    return 403;
  }
  if (application.userId === user.userId) {
    return 200;
  }
  if (await isVerifiedStaffOf(user.userId, application.rescueId)) {
    return 200;
  }
  return 403;
};

const decideChatAccess = async (
  upload: FileUpload,
  user: User
): Promise<UploadAccessVerdict> => {
  if (upload.uploaded_by === user.userId) {
    return 200;
  }
  if (!upload.entity_id) {
    return 403;
  }
  if (await isChatParticipant(user.userId, upload.entity_id)) {
    return 200;
  }
  return 403;
};

const decideUploaderOnlyAccess = (upload: FileUpload, user: User): UploadAccessVerdict =>
  upload.uploaded_by === user.userId ? 200 : 403;

export const decideUploadAccess = async ({
  filePath,
  user,
}: DecideArgs): Promise<UploadAccessVerdict> => {
  const parsed = splitPath(filePath);
  if (!parsed) {
    return 404;
  }
  const { prefix, basename } = parsed;

  if (PUBLIC_PREFIXES.has(prefix)) {
    return 200;
  }

  if (!PRIVATE_PREFIXES.has(prefix)) {
    return 404;
  }

  // Admin/moderator short-circuit — they're explicitly trusted to see
  // any uploaded asset for moderation/support work. (They still pass
  // through the auth gate first.)
  if (isAdmin(user)) {
    return 200;
  }

  // For private prefixes we need the FileUpload row to know the
  // owner/entity. If the row is missing, fail-closed with 404 — there
  // is no resource to describe access against.
  const upload = await FileUpload.findOne({
    where: { stored_filename: basename },
    attributes: ['upload_id', 'uploaded_by', 'entity_id', 'entity_type'],
  });
  if (!upload) {
    return 404;
  }

  if (prefix === 'applications') {
    return decideApplicationAccess(upload, user);
  }
  if (prefix === 'chat') {
    return decideChatAccess(upload, user);
  }
  // documents/, temp/ — no parent entity model with staff relations,
  // so uploader-only. See PR "Open questions".
  return decideUploaderOnlyAccess(upload, user);
};
