import { http, createConfig } from 'wagmi'
import { harmonyOne } from 'wagmi/chains'
import { getDefaultConfig } from "connectkit";
import {appConfig} from "./config.ts";
import { type Chain} from 'viem'

export const harmonyOneTestnet
  = {
  id: 1666700000,
  name: 'Harmony One',
  nativeCurrency: {
    name: 'Harmony',
    symbol: 'ONE',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://api.s0.b.hmny.io'] },
  },
  blockExplorers: {
    default: { name: 'Harmony Explorer', url: 'https://explorer.testnet.harmony.one'},
  },
  contracts: {},
} as const satisfies Chain


export const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [harmonyOne, harmonyOneTestnet],
    transports: {
      [harmonyOne.id]: http(),
      [harmonyOneTestnet.id]: http(),
    },
    walletConnectProjectId: appConfig.walletConnectProjectId,
    appName: "Pump.One",
    appDescription: "Pump.One",
    appUrl: "https://pump-app.netlify.app",
    appIcon: "https://cryptologos.cc/logos/harmony-one-logo.png?v=040", // your app's icon, no bigger than 1024x1024px (max. 1MB)
  }),
);

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
