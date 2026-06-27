import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { CHAIN_ID } from "../contracts/addresses";

export interface WalletState {
  account: string | null;
  chainId: number | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  connecting: boolean;
  error: string | null;
  hasMetaMask: boolean;
  onRightChain: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
}

const HARDHAT_CHAIN = {
  chainId: "0x" + CHAIN_ID.toString(16),
  chainName: "Hardhat Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
};

export function useWallet(): WalletState {
  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!window.ethereum) return;
    const p = new BrowserProvider(window.ethereum);
    const accounts = (await p.send("eth_accounts", [])) as string[];
    const net = await p.getNetwork();
    setProvider(p);
    setChainId(Number(net.chainId));
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setSigner(await p.getSigner());
    } else {
      setAccount(null);
      setSigner(null);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask가 설치되어 있지 않습니다.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const p = new BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      await refresh();
    } catch (e) {
      setError((e as { message?: string })?.message ?? "지갑 연결에 실패했습니다.");
    } finally {
      setConnecting(false);
    }
  }, [refresh]);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum?.request) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HARDHAT_CHAIN.chainId }],
      });
    } catch (e) {
      // 4902: 체인이 등록 안 됨 → 추가 시도
      if ((e as { code?: number })?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [HARDHAT_CHAIN],
        });
      }
    }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!window.ethereum?.on) return;
    refresh();
    const onAccounts = () => refresh();
    const onChain = () => refresh();
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  return {
    account,
    chainId,
    provider,
    signer,
    connecting,
    error,
    hasMetaMask,
    onRightChain: chainId === CHAIN_ID,
    connect,
    switchNetwork,
  };
}
