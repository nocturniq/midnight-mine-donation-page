export async function postDonationViaProxy(params: {
  destination: string;
  origin: string;
  signature: string;
}) {
  const res = await fetch("/api/donate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Proxy error: ${res.status}`);
  }
  return text;
}

/**
 * payload format:
 * {
 *   "destination_address": "...",
 *   "original_address": "...",
 *   "signature_hex": "..."
 * }
 */
export function parseDonationFields(signaturePayload: string) {
  const parsed = JSON.parse(signaturePayload) as {
    destination_address?: string;
    original_address?: string;
    signature_hex?: string;
  };

  if (!parsed?.destination_address || !parsed?.signature_hex) {
    throw new Error("Invalid signature payload");
  }

  return {
    destination: parsed.destination_address,
    signature: parsed.signature_hex,
  };
}
