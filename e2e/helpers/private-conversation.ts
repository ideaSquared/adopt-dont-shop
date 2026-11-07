import type { ApiClient } from '../fixtures/api';
import { uniqueText } from './factories';
import { createAdopterApplication, expectOk, postWithCsrf } from './seeds';

export type PrivateConversation = {
  applicationId: string;
  petId: string;
  chatId: string;
};

/**
 * Give a throwaway adopter an application and a rescue chat of their own: the
 * adopter applies for a fresh pet, then the rescue opens a chat with them
 * (the same route the rescue UI uses). Returns the ids a second user would
 * have to guess or be handed.
 */
export async function createPrivateConversation(
  adopterApi: ApiClient,
  rescueApi: ApiClient
): Promise<PrivateConversation> {
  const { applicationId, petId } = await createAdopterApplication(adopterApi, rescueApi);
  const openRes = await postWithCsrf(rescueApi.context, '/api/v1/chats', {
    applicationId,
    otherUserId: adopterApi.userId,
  });
  await expectOk(openRes, 'rescue opens a chat with the applicant');
  const { chat } = (await openRes.json()) as { chat: { chatId: string } };
  return { applicationId, petId, chatId: chat.chatId };
}

/** Post a uniquely-worded message from the rescue and return its text. */
export async function rescueSaysSomethingPrivate(
  rescueApi: ApiClient,
  chatId: string
): Promise<string> {
  const content = uniqueText('private-note-for-the-applicant-only');
  const res = await postWithCsrf(rescueApi.context, `/api/v1/chats/${chatId}/messages`, {
    content,
    messageType: 'text',
  });
  await expectOk(res, 'rescue sends a private message');
  return content;
}
