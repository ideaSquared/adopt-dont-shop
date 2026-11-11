// Typed stand-in for a gRPC client in route and middleware tests.
//
// A route only calls a few of a client's methods, and the generated clients
// grow a method per RPC, so a test lists just the ones it exercises. Each listed
// method is still checked against the real client type; the rest are left
// undefined (calling one throws a TypeError, which is the signal the test needs
// to stub it too).

export const stubClient = <Client>(methods: Partial<Client>): Client =>
  // The one place a partial client is widened: the unlisted methods are
  // deliberately absent, so TS cannot see a full Client here.
  methods as Client;
