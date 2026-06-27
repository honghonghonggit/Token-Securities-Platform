/// <reference types="vite/client" />

import type { Eip1193Provider } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

interface ImportMetaEnv {
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_REGISTRY_ADDRESS?: string;
  readonly VITE_TOKEN_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
