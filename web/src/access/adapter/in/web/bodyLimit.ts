// Request body limits. The legacy cap (server.js:29) counts characters of the decoded text.
export const BODY_LIMIT_CHARACTERS = 1_600_000;

// Next buffers a request body (up to this many bytes, twice in memory) BEFORE proxy() runs, so the guard's
// stream-and-stop cap cannot protect against many parallel big unauthenticated POSTs; this byte limit does.
// It must never reject a body the legacy portal accepts. One UTF-16 unit is at most 3 UTF-8 bytes (an invalid byte
// becomes U+FFFD, one unit), so a body of BODY_LIMIT_CHARACTERS units is at most 3 x that many bytes.
// Past the limit Next drops the chunk that crosses it and everything after (it does not reject): the margin keeps the
// kept prefix above the character cap even with 3-byte characters and a dropped chunk of up to 64 KiB (the largest read
// of a Node socket), so a too-long chunked body still ends in the legacy 413 and not in a 400 on truncated JSON.
export const BODY_LIMIT_BYTES = 3 * BODY_LIMIT_CHARACTERS + 3 * 65_536 + 3;
