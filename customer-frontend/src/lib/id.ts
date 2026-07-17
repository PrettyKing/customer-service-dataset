let fallbackSequence = 0;


function formatUuid(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createClientId(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") return webCrypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    // Only used as a compatibility fallback for anonymous demo identifiers in
    // browsers without Web Crypto. These IDs are not an authentication token.
    fallbackSequence += 1;
    const seed = `${Date.now()}-${globalThis.performance?.now() ?? 0}-${fallbackSequence}-${Math.random()}`;
    for (let index = 0; index < bytes.length; index += 1) {
      const char = seed.charCodeAt(index % seed.length);
      bytes[index] = (char + Math.floor(Math.random() * 256) + index * 17) & 0xff;
    }
  }
  return formatUuid(bytes);
}
