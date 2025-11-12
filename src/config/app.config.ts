import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";

export const appConfig = {
  title: "Midnight Mine Donation Tool",
  logo: {
    path: "/nocturniq-logo.svg",
    alt: "nocturniq logo",
  },
  network: NetworkType.MAINNET,
  lucidNetwork: "Mainnet",
  api: "https://scavenger.prod.gd.midnighttge.io",
} as const;
