import { Contract, type ContractRunner } from "ethers";
import { REGISTRY_ADDRESS, TOKEN_ADDRESS } from "../contracts/addresses";
import tokenAbi from "../contracts/SecurityToken.abi.json";
import registryAbi from "../contracts/InvestorRegistry.abi.json";

// runner = 읽기는 provider, 쓰기는 signer.
export function getToken(runner: ContractRunner): Contract {
  return new Contract(TOKEN_ADDRESS, tokenAbi, runner);
}

export function getRegistry(runner: ContractRunner): Contract {
  return new Contract(REGISTRY_ADDRESS, registryAbi, runner);
}
