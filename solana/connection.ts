import { Connection, clusterApiUrl } from '@solana/web3.js'

// Change to 'devnet' or 'mainnet-beta'
export const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
