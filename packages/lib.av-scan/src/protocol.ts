// clamd's INSTREAM wire protocol (the `n`-prefixed, newline-terminated
// variant — see https://docs.clamav.net, "clamd usage"):
//
//   1. Send the command "nINSTREAM\n".
//   2. Send the payload as one or more chunks, each a 4-byte big-endian
//      unsigned length prefix immediately followed by that many bytes.
//   3. Send a zero-length chunk (4 zero bytes) to terminate the stream.
//   4. Read the reply — a single line such as "stream: OK",
//      "stream: <signature> FOUND" or "stream: <message> ERROR" — until
//      the socket closes.
//
// This is the only file that touches node:net directly; everything else in
// the package goes through the injectable SendInstreamFn seam.
import net from 'node:net';

import type { SendInstreamFn } from './types.js';

const COMMAND = 'nINSTREAM\n';

export const defaultSendInstream: SendInstreamFn = (buffer, { host, port, timeoutMs }) =>
  new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const received: Buffer[] = [];

    // Runs exactly once per call: whichever of 'error' / 'end' / the
    // timeout fires first tears the socket down and settles the promise.
    // The other two triggers can't subsequently fire — removeAllListeners()
    // strips them synchronously, before any later event's callback could
    // run — so no re-entrancy guard is needed here; clearTimeout /
    // removeAllListeners / destroy are all safe to call once by
    // construction, and native Promises silently ignore a second
    // resolve/reject in any case.
    const settle = (run: () => void): void => {
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.destroy();
      run();
    };

    const timer = setTimeout(() => {
      settle(() => reject(new Error(`AV scan timed out after ${timeoutMs}ms (${host}:${port})`)));
    }, timeoutMs);

    socket.on('error', (err) => settle(() => reject(err)));

    socket.on('connect', () => {
      socket.write(COMMAND);
      if (buffer.length > 0) {
        const lengthPrefix = Buffer.alloc(4);
        lengthPrefix.writeUInt32BE(buffer.length, 0);
        socket.write(lengthPrefix);
        socket.write(buffer);
      }
      socket.write(Buffer.alloc(4)); // zero-length terminator chunk
    });

    // The socket is never put into string mode (no setEncoding() call), so
    // `chunk` is always a Buffer at runtime — the `string` half of Socket's
    // 'data' event type only models that unused mode.
    socket.on('data', (chunk: Buffer | string) => {
      received.push(chunk as Buffer);
    });

    // clamd closes its end (a clean FIN) once it has written the full
    // reply, which is what 'end' fires on. An abrupt reset instead of a
    // clean close raises 'error' above, rejecting rather than trusting a
    // possibly-truncated read — the safer call given scanBytes()'s own
    // fail-closed default.
    socket.on('end', () => settle(() => resolve(Buffer.concat(received).toString('utf8'))));
  });
