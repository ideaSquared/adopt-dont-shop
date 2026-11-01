/**
 * Generates the fixed dev/e2e personas (scripts/lib/seed-personas.mjs) through
 * the gateway, so seeded data takes the same path as real traffic: request
 * validation, permission checks, domain events, the audit trail and the
 * read-model projections.
 *
 * Every step looks before it creates, so a re-run converges on the same data
 * instead of failing or duplicating it.
 *
 * Accounts are completed with the test-only token-peek routes
 * (/api/v1/test/*, gateway E2E_TOKEN_PEEK=true): they hand back the one-time
 * email-verification and invitation tokens that would otherwise only be
 * emailed.
 */

import { createSession, login } from './seed-api-client.mjs';

// Pets are created 'available'; these are the status-machine hops to each
// seeded status (services/pets/src/grpc/status-machine.ts).
const STATUS_PATHS = {
  available: [],
  pending: ['pending'],
  adopted: ['pending', 'adopted'],
  not_available: ['not_available'],
};

/**
 * The status hops still needed to take a pet from `current` to `target`, or
 * null when `current` is not on the way there (someone moved it elsewhere).
 */
export const remainingStatusHops = (current, target) => {
  const path = STATUS_PATHS[target];
  if (!path) {
    throw new Error(`no seed status path to '${target}'`);
  }
  if (current === target) {
    return [];
  }
  if (current === 'available') {
    return path;
  }
  const index = path.indexOf(current);
  return index === -1 ? null : path.slice(index + 1);
};

export const createGenerator = ({ baseUrl, password, fetchImpl, log = () => {} }) => {
  const sessions = new Map();
  const anon = createSession(baseUrl, fetchImpl);

  const signIn = async email => {
    const cached = sessions.get(email);
    if (cached) {
      return cached;
    }
    const session = await login(baseUrl, email, password, fetchImpl);
    if (session) {
      sessions.set(email, session);
    }
    return session;
  };

  const as = async email => {
    const session = await signIn(email);
    if (!session) {
      throw new Error(`could not log in as ${email} — was it created by an earlier step?`);
    }
    return session;
  };

  const peekToken = async (path, email, extra = '') => {
    const res = await anon.get(`${path}?email=${encodeURIComponent(email)}${extra}`);
    return res.body;
  };

  // --- accounts ---------------------------------------------------------

  const ensureAdmin = async (admin, superAdmin) => {
    if (await signIn(admin.email)) {
      log(`  = ${admin.email} (${admin.role})`);
      return;
    }
    // 409 means a previous run created the account but never activated it.
    await superAdmin.post(
      '/api/v1/admin/users',
      { ...admin, sendInvitation: false },
      { allow: [409] }
    );
    const { token } = await peekToken('/api/v1/test/user-invitation-token', admin.email);
    await anon.post('/api/v1/auth/redeem-invitation', {
      invitationToken: token,
      newPassword: password,
    });
    await as(admin.email);
    log(`  + ${admin.email} (${admin.role})`);
  };

  const ensureAdopter = async adopter => {
    if (await signIn(adopter.email)) {
      log(`  = ${adopter.email} (adopter)`);
      return;
    }
    // Register answers 201 whether or not the email exists (anti-enumeration),
    // so an unverified account from an earlier run is simply re-verified.
    await anon.post('/api/v1/auth/register', {
      ...adopter,
      password,
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });
    const { verificationToken } = await peekToken('/api/v1/test/auth-token', adopter.email);
    if (verificationToken) {
      await anon.post('/api/v1/auth/verify-email', { verificationToken });
    }
    await as(adopter.email);
    log(`  + ${adopter.email} (adopter)`);
  };

  const ensureStaff = async (staff, rescueId, superAdmin) => {
    if (await signIn(staff.email)) {
      log(`  = ${staff.email} (staff)`);
      return;
    }
    const pending = await anon.request(
      'GET',
      `/api/v1/test/invitation-token?email=${encodeURIComponent(staff.email)}&rescueId=${rescueId}`
    );
    const token =
      pending.status === 200
        ? pending.body.token
        : await (async () => {
            await superAdmin.post(`/api/v1/rescues/${rescueId}/invitations`, {
              email: staff.email,
              title: staff.title,
            });
            const fresh = await peekToken(
              '/api/v1/test/invitation-token',
              staff.email,
              `&rescueId=${rescueId}`
            );
            return fresh.token;
          })();
    await anon.post('/api/v1/invitations/accept', {
      token,
      password,
      firstName: staff.firstName,
      lastName: staff.lastName,
    });
    await as(staff.email);
    log(`  + ${staff.email} (staff)`);
  };

  // --- rescues + pets -----------------------------------------------------

  const ensureRescue = async (rescue, superAdmin) => {
    const { key, ...body } = rescue;
    const search = await superAdmin.get(
      `/api/v1/admin/rescues?search=${encodeURIComponent(rescue.name)}&limit=100`
    );
    const existing = (search.body.data ?? []).find(r => r.name === rescue.name);
    const rescueId =
      existing?.rescue_id ?? (await superAdmin.post('/api/v1/rescue', body)).body.rescue.rescueId;
    if (existing?.status !== 'verified') {
      await superAdmin.post(`/api/v1/rescue/${rescueId}/verify`, {
        toStatus: 'verified',
        verificationSource: 'manual',
      });
    }
    log(`  ${existing ? '=' : '+'} ${rescue.name}`);
    return [key, rescueId];
  };

  const findPet = async (session, rescueId, name) => {
    const res = await session.get(
      `/api/v1/pets?rescueId=${rescueId}&search=${encodeURIComponent(name)}&status=all&limit=100`
    );
    return (res.body.data ?? []).find(p => p.name === name);
  };

  const ensurePet = async (pet, rescueId) => {
    const staff = await as(pet.createdBy);
    const existing = await findPet(staff, rescueId, pet.name);
    const created =
      existing ??
      (
        await staff.post('/api/v1/pets', {
          name: pet.name,
          rescue_id: rescueId,
          type: pet.type,
          gender: pet.gender,
          size: pet.size,
          age_group: pet.ageGroup,
          short_description: pet.shortDescription,
        })
      ).body.data;
    const petId = created.pet_id;
    const hops = remainingStatusHops(created.status, pet.status);
    if (hops === null) {
      log(`  ! ${pet.name} is '${created.status}', not on the way to '${pet.status}' — left as is`);
      return [pet.name, petId];
    }
    for (const toStatus of hops) {
      await staff.post(`/api/v1/pets/${petId}/status`, { toStatus, reason: 'dev seed' });
    }
    log(`  ${existing ? '=' : '+'} ${pet.name} (${pet.status})`);
    return [pet.name, petId];
  };

  // --- adopter activity ---------------------------------------------------

  const ensureFavorite = async (favorite, petIds) => {
    const adopter = await as(favorite.adopter);
    await adopter.post(`/api/v1/pets/${petIds[favorite.pet]}/favorite`, {}, { allow: [409] });
    log(`  ♥ ${favorite.adopter} → ${favorite.pet}`);
  };

  const ensureApplication = async (application, petIds) => {
    const petId = petIds[application.pet];
    const adopter = await as(application.adopter);
    const mine = await adopter.get('/api/v1/applications?limit=100');
    const existing = (mine.body.data ?? []).find(a => a.petId === petId || a.pet_id === petId);
    const submitted = existing ?? (await adopter.post('/api/v1/applications', { petId })).body.data;
    const applicationId = submitted.id ?? submitted.applicationId ?? submitted.application_id;
    if (submitted.status === 'submitted') {
      const reviewer = await as(application.reviewedBy);
      await reviewer.post(`/api/v1/applications/${applicationId}/review`, {
        expectedVersion: submitted.version,
      });
    }
    log(`  ${existing ? '=' : '+'} application ${application.adopter} → ${application.pet}`);
  };

  const ensureEnquiry = async (enquiry, petIds) => {
    const adopter = await as(enquiry.adopter);
    const opened = await adopter.post('/api/v1/chats/enquiries', { petId: petIds[enquiry.pet] });
    const chatId = opened.body.chat.chatId;
    const history = await adopter.get(`/api/v1/chats/${chatId}/messages`);
    const existing = history.body.data ?? history.body.messages ?? [];
    if (existing.length > 0) {
      log(`  = chat ${enquiry.adopter} → ${enquiry.pet} (${existing.length} messages)`);
      return;
    }
    for (const message of enquiry.messages) {
      const sender = await as(message.from);
      await sender.post(`/api/v1/chats/${chatId}/messages`, { content: message.content });
    }
    log(`  + chat ${enquiry.adopter} → ${enquiry.pet} (${enquiry.messages.length} messages)`);
  };

  // --- the whole dataset, in dependency order ------------------------------

  const run = async data => {
    const superAdmin = await signIn(data.SUPER_ADMIN_EMAIL);
    if (!superAdmin) {
      throw new Error(
        `cannot log in as ${data.SUPER_ADMIN_EMAIL}. The SQL bootstrap ` +
          '(services/auth `pnpm db:seed`) must run first, with the same SEED_PASSWORD.'
      );
    }

    log('admins');
    for (const admin of data.ADMINS) {
      await ensureAdmin(admin, superAdmin);
    }

    log('rescues');
    const rescueIds = {};
    for (const rescue of data.RESCUES) {
      const [key, id] = await ensureRescue(rescue, superAdmin);
      rescueIds[key] = id;
    }

    log('rescue staff');
    for (const staff of data.STAFF) {
      await ensureStaff(staff, rescueIds[staff.rescue], superAdmin);
    }

    log('adopters');
    for (const adopter of data.ADOPTERS) {
      await ensureAdopter(adopter);
    }

    log('pets');
    const petIds = {};
    for (const pet of data.PETS) {
      const [name, id] = await ensurePet(pet, rescueIds[pet.rescue]);
      petIds[name] = id;
    }

    log('favourites');
    for (const favorite of data.FAVORITES) {
      await ensureFavorite(favorite, petIds);
    }

    log('applications');
    for (const application of data.APPLICATIONS) {
      await ensureApplication(application, petIds);
    }

    log('chats');
    for (const enquiry of data.ENQUIRIES) {
      await ensureEnquiry(enquiry, petIds);
    }

    return { rescueIds, petIds };
  };

  return { run };
};
