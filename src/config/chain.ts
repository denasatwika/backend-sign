import type { Address, Hex } from 'viem'
import { getEnv } from './env.ts'

export type ChainConfig = {
  rpcUrl?: string
  chainId?: number
  forwarderAddress?: Address
  leaveCoreAddress?: Address
  companyMultisigAddress?: Address
  relayerPrivateKey?: Hex
  relayerAddress?: Address
}

const toAddress = (value?: string | null): Address | undefined => {
  if (!value) return undefined
  return (value.startsWith('0x') ? value : `0x${value}`) as Address
}

const toHex = (value?: string | null): Hex | undefined => {
  if (!value) return undefined
  const normalized = value.startsWith('0x') ? value : `0x${value}`
  return normalized as Hex
}

export const getChainConfig = (): ChainConfig => {
  const env = getEnv()
  return {
    rpcUrl: env.RPC_URL,
    chainId: env.CHAIN_ID,
    forwarderAddress: toAddress(env.FORWARDER_ADDRESS),
    leaveCoreAddress: toAddress(env.LEAVE_CORE_ADDRESS),
    companyMultisigAddress: toAddress(env.COMPANY_MULTISIG_ADDRESS),
    relayerPrivateKey: toHex(env.RELAYER_PRIVATE_KEY),
    relayerAddress: toAddress(env.RELAYER_ADDRESS),
  }
}
