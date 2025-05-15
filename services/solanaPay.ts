import BigNumber from 'bignumber.js';
import { encodeURL, createQR, parseURL } from '@solana/pay'
import {Keypair, PublicKey} from '@solana/web3.js'

// Add buffer polyfill
import { Buffer } from 'buffer';
global.Buffer = Buffer;

export function createSolanaPayLink(
  recipient: PublicKey,
  amount: BigNumber,
  label?: string,
  message?: string,
  memo?: string
): string {
  const url = encodeURL({
    recipient: new PublicKey(recipient),
    amount,
    reference: new Keypair().publicKey,
    label,
    message,
    memo
  })
  return url.toString()
}
