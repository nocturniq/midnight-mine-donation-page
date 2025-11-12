import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { appConfig } from "../config/app.config";
import { Lucid, Emulator, generateEmulatorAccount } from "@lucid-evolution/lucid";
import { useRef } from "react";

export const useWallet = () => {
  const network = appConfig.network;
  const hasLogged = useRef(false);
  const lucidInstance = useRef<Awaited<ReturnType<typeof Lucid>> | null>(null);
  const lastInitTime = useRef<number>(0);
  const REFRESH_INTERVAL = 120000; // 120 seconds

  const {
    isConnected,
    connect,
    disconnect,
    signMessage,
    stakeAddress,
    accountBalance,
    installedExtensions,
    enabledWallet,
    usedAddresses,
    unusedAddresses,
  } = useCardano({
    limitNetwork: network,
  });

  const initLucid = async () => {
    if (!isConnected || !enabledWallet ) {
      lucidInstance.current = null;
      return null;
    }

    const now = Date.now();
    if (
      lucidInstance.current &&
      now - lastInitTime.current < REFRESH_INTERVAL
    ) {
      return lucidInstance.current;
    }

    try {
      // we do not need any provider, so we use the Emulator for Lucid initialization
      const emulator = new Emulator([
        generateEmulatorAccount({ lovelace: 100_000_000n })
      ]);
      console.log("🔄 Initializing Lucid...");
      const lucid = await Lucid(
        emulator,
        appConfig.lucidNetwork
      );

      // wallet API
      const api = await window.cardano[enabledWallet].enable();
      await lucid.selectWallet.fromAPI(api);

      if (!hasLogged.current) {
        console.log("✅ Lucid initialized successfully");
        console.log("✓ Wallet connected and ready");
        hasLogged.current = true;
      }

      lucidInstance.current = lucid;
      lastInitTime.current = now;
      return lucid;
    } catch (error) {
      console.error("❌ Lucid initialization error:", error);
      throw error;
    }
  };

  return {
    isConnected,
    connect,
    disconnect,
    signMessage,
    stakeAddress,
    accountBalance,
    installedExtensions,
    enabledWallet,
    usedAddresses,
    unusedAddresses,
    network,
    initLucid,
  };
};
