import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js'
import * as SecureStore from 'expo-secure-store'
import {connection} from './connection'
import { encodeURL, validateTransfer, parseURL, TransferRequestURL, findReference } from '@solana/pay';

// Store multiple accounts (optional feature)
const ACCOUNT_KEY = 'solana_wallets'

export async function getFaucet(publicKey: PublicKey | string, amount: number = 1): Promise<string> {
  console.log("Requesting faucet")
  try {
    const signature = await connection.requestAirdrop(
      new PublicKey(publicKey),
      amount * LAMPORTS_PER_SOL
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // await connection.confirmTransaction(signature, 'confirmed');
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    }, 'confirmed');
    alert(`Airdrop successful! Transaction signature: ${signature}`);
    return `Airdrop successful! Transaction signature: ${signature}`;
  } catch (error) {
    console.error("get Faucet", error);
    throw new Error(`Failed to get faucet: ${(error as Error).message}`);
  }
}

export async function generateWalletOld() {
  const keypair = Keypair.generate()
  await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify([[...keypair.secretKey]]))
  return keypair
}

export async function generateWallet(phoneNumber?: string) {
  const keypair = Keypair.generate();
  const stored = await SecureStore.getItemAsync(ACCOUNT_KEY);
  const wallets = stored ? JSON.parse(stored) : [];
  wallets.push([...keypair.secretKey]);
  const phoneNumberWallets = {phoneNumber: wallets}
  await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(wallets));
  return keypair;
}

export async function getWallets(phoneNumber?: string): Promise<Keypair[]> {
  const stored = await SecureStore.getItemAsync(ACCOUNT_KEY)
  if (!stored) return []

  const secretArrays = JSON.parse(stored) as number[][]
  // if (!phoneNumber) return [];
  // const phoneNumbeSecretArrays = secretArrays.find(secret => secret[phoneNumber]);
  return secretArrays.map(secret => Keypair.fromSecretKey(Uint8Array.from(secret)))
}

export async function getWalletBalance(publicKey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(publicKey)
  return balance / LAMPORTS_PER_SOL
}

export async function sendSol(sender: Keypair, to: PublicKey, amount: number) {
  /*await checkRiskBeforeSend({
    to: to.toBase58(),
    amount
  })*/

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: to,
      lamports: amount * LAMPORTS_PER_SOL
    })
  )

  const signature = await sendAndConfirmTransaction(connection, transaction, [sender])
  console.log(`Tx: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  return signature

  // const signature = await connection.sendTransaction(transaction, [sender])
  // await connection.confirmTransaction(signature)
  // return signature
}

export async function processPaymentUrl(url: URL, payer: Keypair) {
  // Parse the payment request link
  console.log('2. Parse the payment request link');
  const { recipient, amount, reference, label, message, memo } = parseURL(url) as TransferRequestURL;
  if (!recipient || !amount || !reference) throw new Error('Invalid payment request link');

  console.log('3. Assemble the transaction');
  const tx = new Transaction();

  // Append the memo instruction if a memo is provided
  if (memo != null) {
    tx.add(
      new TransactionInstruction({
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        keys: [],
        data: Buffer.from(memo, 'utf8'),
      })
    );
  }
  // Create a transfer instruction
  const ix = SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: recipient,
    lamports: amount.multipliedBy(LAMPORTS_PER_SOL).integerValue(BigNumber.ROUND_FLOOR).toNumber()
  });
  // Add the reference key to the instruction, if provided
  if (reference) {
    const ref = Array.isArray(reference) ? reference : [reference];
    for (const pubkey of ref) {
      ix.keys.push({ pubkey, isWritable: false, isSigner: false });
    }
  }
  // Add the transfer instruction to the transaction
  tx.add(ix);

  // Send the transaction to the Solana network and confirm it has been processed
  console.log('4. 🚀 Send and Confirm Transaction');
  const txId = await sendAndConfirmTransaction(connection, tx, [payer]);
  console.log(`      Tx: https://explorer.solana.com/tx/${txId}?cluster=devnet`);
}

async function verifyTx(
  recipient: PublicKey,
  amount: BigNumber,
  reference: PublicKey,
  memo: string
) {
  console.log(`5. Verifying the payment`);
  // Merchant app locates the transaction signature from the unique reference address it provided in the transfer link
  const found = await findReference(connection, reference);

  // Merchant app should always validate that the transaction transferred the expected amount to the recipient
  const response = await validateTransfer(
    connection,
    found.signature,
    {
      recipient,
      amount,
      splToken: undefined,
      reference,
      memo
    },
    { commitment: 'confirmed' }
  );
  return response;
}

const ACTIVE_WALLET_KEY = 'active_wallet_pubkey'

export async function setActiveWallet(pubkey: string) {
  await SecureStore.setItemAsync(ACTIVE_WALLET_KEY, pubkey)
}

export async function getActiveWallet(): Promise<Keypair | null> {
  const pubkey = await SecureStore.getItemAsync(ACTIVE_WALLET_KEY)
  // if (!pubkey) return null

  const all = await getWallets()

  // If no active wallet, set the first wallet as the active wallet.
  if (!pubkey) setActiveWallet(all[0].publicKey.toBase58())

  const found = all.find(k => k.publicKey.toBase58() === pubkey)
  return found ?? all[0] ?? null
}

// Add these constants
const WALLET_NAMES_KEY = 'wallet_names'

// Add these functions
export async function setWalletName(pubkey: string, name: string) {
  try {
    const stored = await SecureStore.getItemAsync(WALLET_NAMES_KEY)
    const names = stored ? JSON.parse(stored) : {}
    names[pubkey] = name
    await SecureStore.setItemAsync(WALLET_NAMES_KEY, JSON.stringify(names))
  } catch (error) {
    console.error('Error setting wallet name:', error)
    throw new Error('Failed to save wallet name')
  }
}

export async function getWalletNames(): Promise<{ [key: string]: string }> {
  try {
    const stored = await SecureStore.getItemAsync(WALLET_NAMES_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error getting wallet names:', error)
    return {}
  }
}

// Add this to the clearWallets function
export async function clearWallets() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCOUNT_KEY),
    SecureStore.deleteItemAsync(ACTIVE_WALLET_KEY),
    SecureStore.deleteItemAsync(WALLET_NAMES_KEY)
  ])
}

export async function deleteWallet(pubkey: string) {
  const stored = await SecureStore.getItemAsync(ACCOUNT_KEY)
  if (!stored) return

  const wallets = JSON.parse(stored) as number[][]
  const updatedWallets = wallets.filter(wallet => {
    const keypair = Keypair.fromSecretKey(Uint8Array.from(wallet))
    return keypair.publicKey.toBase58() !== pubkey
  })

  await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(updatedWallets))
}

export async function addWalletFromKeypair(keypair: Keypair) {
  const stored = await SecureStore.getItemAsync(ACCOUNT_KEY)
  const wallets = stored ? JSON.parse(stored) : []
  wallets.push([...keypair.secretKey])
  await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(wallets))
}

async function checkRiskBeforeSend(
  {
    to,
    amount,
    programId
  }: {
    to: string
    amount: number
    programId?: string
  }) {
  const res = await fetch(`${process.env.EXPO_PUBLIC_AI_API_URL}/analyze-tx`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      to,
      amount,
      program_ids: [programId].filter(Boolean)
    })
  })

  const json = await res.json()
  if (json.score >= 70) {
    throw new Error(`⚠️ Risky Transaction: ${json.reason || 'Suspicious activity detected.'}`)
  }
}
