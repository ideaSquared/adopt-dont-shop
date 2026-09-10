# API Route Audit (ADS-1317)

Replaces the tracking doc removed without a replacement (see the "Fix" section of
[ADS-1317](https://linear.app/ideasquared/issue/ADS-1317)). Scope: the four live UI
actions the audit found calling gateway routes that didn't exist. Not a full
frontend↔gateway route audit — see ADS-1248 for the earlier, broader pass.

## Verified

These UI actions were reported as 404ing. On inspection (main @ `d0a6e71`, this repo)
the proto → handler → gateway route → frontend service chain already exists end to
end and is covered by tests; no code change was needed.

| Frontend call                                                           | Gateway route                                   | Backing RPC                      | Status                                                                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cmsService.publishContent` (`apps/admin/src/services/cmsService.ts`)   | `POST /api/v1/cms/content/:contentId/publish`   | `CmsService.PublishContent`      | Wired — `services/gateway/src/routes/cms.ts`, `services/cms/src/grpc/handlers.ts`                                             |
| `cmsService.unpublishContent`                                           | `POST /api/v1/cms/content/:contentId/unpublish` | `CmsService.UnpublishContent`    | Wired (same files)                                                                                                            |
| `cmsService.archiveContent`                                             | `POST /api/v1/cms/content/:contentId/archive`   | `CmsService.ArchiveContent`      | Wired (same files)                                                                                                            |
| `rescueService.updatePlan` (`apps/admin/src/services/rescueService.ts`) | `PATCH /api/v1/admin/rescues/:rescueId/plan`    | `RescueService.UpdateRescuePlan` | Wired — `services/gateway/src/routes/rescue-admin.ts`, `services/rescue/src/grpc/handlers.ts` (`ADMIN_SECURITY_MANAGE`-gated) |

All four have colocated handler tests (`services/cms/src/grpc/handlers.test.ts`,
`services/rescue/src/grpc/handlers.test.ts`) and gateway route tests
(`services/gateway/src/routes/cms.test.ts`, `.../rescue-admin.test.ts`) already in
the suite. `pnpm exec turbo run test:coverage --filter=@adopt-dont-shop/service.cms
--filter=@adopt-dont-shop/service.rescue --filter=@adopt-dont-shop/service.gateway`
passes without modification.

## Descoped

| Frontend call                                                                     | Gateway route (missing)                              | Status                                                                  |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `ChatService.uploadAttachment` (`packages/lib.chat/src/services/chat-service.ts`) | `POST /api/v1/chats/:id/attachments` (never existed) | Descoped — no gateway route or `service.chat` RPC to receive an upload. |

`service.chat`'s proto only carries `MessageAttachment` metadata (url, contentType,
…) that a message can reference once it already has a URL — there is no upload RPC
and no design yet for where that URL would come from. Rather than build a file
pipeline against an unresolved design:

- `ChatService.uploadAttachment` now throws `ChatAttachmentsNotSupportedError`
  instead of calling the dead endpoint.
- The attach-file affordance (paperclip button, hidden file input, attachment
  preview) was removed from `MessageInput`; `ChatWindow` / `ChatProvider` no
  longer thread a `File[]` through `sendMessage`.
- Displaying attachment metadata already on a `Message` (`MessageBubbleComponent`)
  is untouched — only the upload path is gone.

Note: even before this endpoint was missing, `ChatProvider.attemptSendWithRetry`
uploaded each file and then called `sendMessage(conversationId, content)` **without**
the uploaded attachment's url/id — the result of `uploadAttachment` was discarded.
Separately, `ChatService.sendMessage`'s own multipart branch (sending files inline
with the message body) targets the same JSON-only `POST /messages` route per its own
comment ("The backend's POST /messages route is JSON-only (no multer)") and was
already unreachable from `ChatProvider` before this change. That branch is
pre-existing, independently dead code, out of this PR's scope — flagged here rather
than removed.

## Phantom endpoint constants found during this work

`packages/lib.chat/src/constants/endpoints.ts` (`CHAT_ENDPOINTS` and its individual
named exports, including `UPLOAD_ATTACHMENT` / `DOWNLOAD_ATTACHMENT`) has zero
consumers anywhere in the repo outside its own test file, and isn't re-exported from
`packages/lib.chat/src/index.ts`. `ChatService` hardcodes its own `/api/v1/chats/...`
paths rather than importing from it. Left in place per this batch's file-ownership
split — not deleted here.

This is not a full sweep of every `packages/lib.*/src/constants/endpoints.ts` file;
only the one surfaced while investigating chat attachments is listed.
