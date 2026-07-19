import { defineServiceConfig } from '../../vitest.shared.config';

// Server tests bind real ports and spin up upstream stubs — give them some
// headroom over the 5s default but keep them tight (see shared testTimeout).
export default defineServiceConfig();
