import { useWallet } from "../hooks/useWallet";
import { theme } from "../config/theme";
import { appConfig } from "../config/app.config";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lucid } from "@lucid-evolution/lucid";
import { postDonationViaProxy, parseDonationFields } from "../api/donate";

function stringToHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const inputStyle: React.CSSProperties = {
  padding: "0.75rem 0.9rem",
  borderRadius: "8px",
  border: `1px solid ${theme.colors.border.secondary}`,
  background: theme.colors.background.secondary,
  color: theme.colors.text.primary,
  outline: "none",
  width: "100%",
};

const smallLabel: React.CSSProperties = {
  color: theme.colors.text.secondary,
  fontSize: "0.875rem",
};

const rowBetween: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const WalletConnect = () => {
  const {
    isConnected,
    unusedAddresses,
    usedAddresses,
    accountBalance,
    initLucid,
  } = useWallet();

  const [showCopiedWallet, setShowCopiedWallet] = useState(false);
  const [showCopiedUnused, setShowCopiedUnused] = useState(false);
  const hasLoggedAddress = useRef(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [unusedAddr, setUnusedAddr] = useState<string | null>(null);
  const [lucidInstance, setLucidInstance] = useState<
    Awaited<ReturnType<typeof Lucid>> | null
  >(null);

  const [useUnused, setUseUnused] = useState(false);
  const [fromInput, setFromInput] = useState<string>("");
  const [toInput, setToInput] = useState<string>("");

  const [signaturePayload, setSignaturePayload] = useState<string>("");
  const [showCopiedSignature, setShowCopiedSignature] = useState(false);
  const [showCopiedCurl, setShowCopiedCurl] = useState(false);

  const [isPosting, setIsPosting] = useState(false);
  const [postResult, setPostResult] = useState<string>("");

  const initialize = useCallback(async () => {
    try {
      const instance = await initLucid();
      if (instance) {
        setLucidInstance(instance);

        const candidateAddress = usedAddresses?.[0] ?? unusedAddresses?.[0];
        const firstUnused = unusedAddresses?.[0] ?? null;

        if (candidateAddress && candidateAddress !== walletAddress) {
          setWalletAddress(candidateAddress);
          if (!hasLoggedAddress.current) {
            hasLoggedAddress.current = true;
          }
        }
        if (firstUnused !== unusedAddr) {
          setUnusedAddr(firstUnused);
        }
      }
    } catch (error) {
      console.error("Error initializing Lucid:", error);
    }
  }, [initLucid, unusedAddr, unusedAddresses, usedAddresses, walletAddress]);

  useEffect(() => {
    if (isConnected) {
      initialize();
    } else {
      setWalletAddress(null);
      setLucidInstance(null);
      hasLoggedAddress.current = false;
    }
  }, [isConnected, initialize]);

  useEffect(() => {
    const src = useUnused ? unusedAddr : walletAddress;
    if (src) setFromInput(src);
  }, [useUnused, walletAddress, unusedAddr]);

  const handleCopyUnused = async () => {
    if (unusedAddr) {
      await navigator.clipboard.writeText(unusedAddr);
      setShowCopiedUnused(true);
      setTimeout(() => setShowCopiedUnused(false), 2000);
    }
  };

  const handleCopyWallet = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setShowCopiedWallet(true);
      setTimeout(() => setShowCopiedWallet(false), 2000);
    }
  };

  const handleCopySignature = async () => {
    if (signaturePayload) {
      await navigator.clipboard.writeText(signaturePayload);
      setShowCopiedSignature(true);
      setTimeout(() => setShowCopiedSignature(false), 2000);
    }
  };

  const buildCurlFromPayload = (): string | null => {
    if (!signaturePayload || !fromInput) return null;
    try {
      const data = JSON.parse(signaturePayload) as {
        destination_address?: string;
        original_address?: string;
        signature_hex?: string;
      };
      const destination = data.destination_address?.trim();
      const signature = data.signature_hex?.trim();
      const origin = fromInput.trim();

      if (!destination || !signature || !origin) return null;

      const base = (appConfig.api || "").replace(/\/+$/, "");
      const url = `${base}/donate_to/${encodeURIComponent(
        destination
      )}/${encodeURIComponent(origin)}/${encodeURIComponent(signature)}`;

      return `curl --location --request POST '${url}'`;
    } catch {
      return null;
    }
  };
 
  const handleCopyCurl = async () => {
    const cmd = buildCurlFromPayload();
    if (!cmd) return;
    await navigator.clipboard.writeText(cmd);
    setShowCopiedCurl(true);
    setTimeout(() => setShowCopiedCurl(false), 2000);
  };

  const handlePostNow = async () => {
    setPostResult("");
    if (!signaturePayload || !fromInput) {
      setPostResult("Generate a signature first.");
      return;
    }
    try {
      setIsPosting(true);
      const { destination, signature } = parseDonationFields(signaturePayload);
      const origin = fromInput.trim();
      const text = await postDonationViaProxy({ destination, origin, signature });

      try {
        const json = JSON.parse(text);
        setPostResult(JSON.stringify(json, null, 2));
      } catch {
        setPostResult(text || "Success");
      }
    } catch (err) {
      setPostResult((err as Error).message || "Request failed");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDonate = async () => {
    if (!toInput) {
      setSignaturePayload(
        JSON.stringify(
          { error: "Please provide a destination address." },
          null,
          2,
        ),
      );
      return;
    }
    if (!fromInput) {
      setSignaturePayload(
        JSON.stringify({ error: "Please provide a from address." }, null, 2),
      );
      return;
    }
    if (!lucidInstance) {
      setSignaturePayload(
        JSON.stringify(
          { error: "Lucid not initialized. Connect your wallet." },
          null,
          2,
        ),
      );
      return;
    }

    try {
      // The signed message remains the same protocol string.
      const message = `Assign accumulated Scavenger rights to: ${toInput}`;
      const hexMessage = stringToHex(message);

      // CIP-30 signData via Lucid wallet adapter
      const { signature /* key */ } = await lucidInstance.wallet().signMessage(
        fromInput,
        hexMessage,
      );

      const payload = {
        destination_address: toInput,
        original_address: fromInput,
        signature_hex: signature,
      };

      setSignaturePayload(JSON.stringify(payload, null, 2));
    } catch (e) {
      const err = e as Error;
      setSignaturePayload(
        JSON.stringify(
          { error: err.message || "Failed to sign message" },
          null,
          2,
        ),
      );
    }
  };

  if (!isConnected) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem",
          color: theme.colors.text.secondary,
          fontSize: "0.875rem",
          background: theme.colors.background.card,
          borderRadius: "12px",
          border: `1px solid ${theme.colors.border.primary}`,
        }}
      >
        Connect your wallet to continue
      </div>
    );
  }

  return (
    <div
      style={{
        background: theme.colors.background.card,
        borderRadius: "12px",
        border: `1px solid ${theme.colors.border.primary}`,
        overflow: "hidden",
        boxShadow: theme.effects.cardShadow,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.25rem",
          borderBottom: `1px solid ${theme.colors.border.primary}`,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: theme.colors.primary,
            boxShadow: `0 0 12px ${theme.colors.primary}`,
          }}
        />
        <span
          style={{ color: theme.colors.text.primary, fontSize: "0.875rem" }}
        >
          Wallet Connected
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "1.5rem" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Wallet Address */}
            <div style={rowBetween}>
              <span style={smallLabel}>Wallet Address</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    color: theme.colors.text.primary,
                    fontSize: "0.875rem",
                    background: theme.colors.background.secondary,
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: `1px solid ${theme.colors.border.secondary}`,
                  }}
                >
                  {walletAddress
                    ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}`
                    : "Not available"}
                </span>
                {walletAddress && (
                  <button
                    onClick={handleCopyWallet}
                    style={{
                      background: theme.colors.background.secondary,
                      border: `1px solid ${theme.colors.border.secondary}`,
                      borderRadius: "6px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: showCopiedWallet
                        ? theme.colors.primary
                        : theme.colors.text.secondary,
                      fontSize: "0.75rem",
                      transition: "all 0.2s ease",
                    }}
                    title="Copy wallet address"
                  >
                    {showCopiedWallet ? "✓" : "⎘"}
                  </button>
                )}
              </div>
            </div>

            {/* Unused Wallet Address */}
            <div style={rowBetween}>
              <span style={smallLabel}>Unused Wallet Address</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    color: theme.colors.text.primary,
                    fontSize: "0.875rem",
                    background: theme.colors.background.secondary,
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    border: `1px solid ${theme.colors.border.secondary}`,
                  }}
                >
                  {unusedAddr
                    ? `${unusedAddr.slice(0, 10)}...${unusedAddr.slice(-6)}`
                    : "Not available"}
                </span>
                {unusedAddr && (
                  <button
                    onClick={handleCopyUnused}
                    style={{
                      background: theme.colors.background.secondary,
                      border: `1px solid ${theme.colors.border.secondary}`,
                      borderRadius: "6px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: showCopiedUnused
                        ? theme.colors.primary
                        : theme.colors.text.secondary,
                      fontSize: "0.75rem",
                      transition: "all 0.2s ease",
                    }}
                    title="Copy unused wallet address"
                  >
                    {showCopiedUnused ? "✓" : "⎘"}
                  </button>
                )}
              </div>
            </div>

            {/* Ada Balance */}
            <div style={rowBetween}>
              <span style={smallLabel}>Ada Balance</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                <span
                  style={{
                    color: theme.colors.primary,
                    fontSize: "1.25rem",
                    fontWeight: 500,
                  }}
                >
                  {accountBalance || "0"}
                </span>
                <span
                  style={{
                    color: theme.colors.text.secondary,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                  }}
                >
                  ₳
                </span>
              </div>
            </div>
          </div>

          {/* Donate panel */}
          <div
            style={{
              marginTop: "1.75rem",
              paddingTop: "1.25rem",
              borderTop: `1px solid ${theme.colors.border.primary}`,
              display: "grid",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={smallLabel}>From Source</span>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: theme.colors.background.secondary,
                  border: `1px solid ${theme.colors.border.secondary}`,
                  borderRadius: "9999px",
                  padding: "0.25rem",
                  gap: "0.25rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setUseUnused(false)}
                  style={{
                    border: "none",
                    padding: "0.4rem 0.8rem",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    background: !useUnused ? theme.colors.primary : "transparent",
                    color: !useUnused ? "#fff" : theme.colors.text.secondary,
                  }}
                >
                  Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setUseUnused(true)}
                  style={{
                    border: "none",
                    padding: "0.4rem 0.8rem",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    background: useUnused ? theme.colors.primary : "transparent",
                    color: useUnused ? "#fff" : theme.colors.text.secondary,
                  }}
                >
                  Unused
                </button>
              </label>
            </div>

            <label style={{ display: "grid", gap: "0.4rem" }}>
              <span style={smallLabel}>From</span>
              <input
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                placeholder="From address"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: "0.4rem" }}>
              <span style={smallLabel}>To</span>
              <input
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder="Recipient address"
                style={inputStyle}
              />
            </label>

            <div>
              <button
                onClick={handleDonate}
                style={{
                  padding: "0.75rem 1.25rem",
                  borderRadius: "8px",
                  border: "none",
                  background: theme.colors.primary,
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                Donate
              </button>
            </div>

            {/* Copy-only signature field */}
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ ...rowBetween }}>
                <span style={smallLabel}>Donate payload (read-only)</span>
                <button
                  onClick={handleCopySignature}
                  disabled={!signaturePayload}
                  title={signaturePayload ? "Copy signature payload" : "No signature yet"}
                  style={{
                    border: `1px solid ${theme.colors.border.secondary}`,
                    background: theme.colors.background.card,
                    color: showCopiedSignature
                      ? theme.colors.primary
                      : theme.colors.text.secondary,
                    borderRadius: "6px",
                    padding: "0.35rem 0.6rem",
                    cursor: signaturePayload ? "pointer" : "not-allowed",
                    fontSize: "0.8rem",
                  }}
                >
                  {showCopiedSignature ? "✓ Copied" : "⎘ Copy"}
                </button>
                <button
                  onClick={handleCopyCurl}
                  disabled={!signaturePayload || !buildCurlFromPayload()}
                  title={
                    signaturePayload
                      ? "Copy curl command"
                      : "Generate a signature first"
                  }
                  style={{
                    border: `1px solid ${theme.colors.border.secondary}`,
                    background: theme.colors.background.card,
                    color: showCopiedCurl
                      ? theme.colors.primary
                      : theme.colors.text.secondary,
                    borderRadius: "6px",
                    padding: "0.35rem 0.6rem",
                    cursor:
                      signaturePayload && buildCurlFromPayload()
                        ? "pointer"
                        : "not-allowed",
                    fontSize: "0.8rem",
                  }}
                >
                  {showCopiedCurl ? "✓ curl copied" : "⎘ Copy curl"}
                 </button>
                <button
                  onClick={handlePostNow}
                  disabled={!signaturePayload || isPosting}
                  title={!signaturePayload ? "Generate a signature first" : "Send to server"}
                  style={{
                    border: `1px solid ${theme.colors.border.secondary}`,
                    background: theme.colors.background.card,
                    color: isPosting ? theme.colors.text.secondary : theme.colors.text.primary,
                    borderRadius: "6px",
                    padding: "0.35rem 0.6rem",
                    cursor: !signaturePayload || isPosting ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  {isPosting ? "Sending…" : "↗ Send now"}
                </button>
              </div>

              <textarea
                readOnly
                wrap="off"
                value={signaturePayload}
                placeholder={`{
  "destination_address": "addr1...",
  "original_address": "addr1...",
  "signature_hex": "8458..."
}`}
                rows={8}
                style={{
                  ...inputStyle,
                  marginTop: "0.5rem",
                  whiteSpace: "pre",
                  wordBreak: "normal",
                  overflowWrap: "normal",
                  overflow: "auto",
                  fontSize: "0.8rem",
                  lineHeight: 1.3,
                }}  
              />
              {postResult && (
                <textarea
                  readOnly
                  wrap="off"
                  value={postResult}
                  placeholder="Server response will appear here"
                  rows={8}
                  style={{
                    ...inputStyle,
                    marginTop: "0.5rem",
                    whiteSpace: "pre",
                    wordBreak: "normal",
                    overflowWrap: "normal",
                    overflow: "auto",
                    fontSize: "0.8rem",
                    lineHeight: 1.3,
                    borderStyle: "dashed",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
