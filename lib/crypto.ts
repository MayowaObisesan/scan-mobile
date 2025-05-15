import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'

// Use shared key (ECDH + symmetric encrypt)
export function encryptMessageUsingShared(message: string, senderSecret: Uint8Array, recipientPublic: Uint8Array) {
  try {
    const slicedSenderSecret = senderSecret.slice(0, 32)  // NaCl expects 32-byte secret
    console.log("Encrypt message - senderSecret:", senderSecret);
    console.log("Encrypt message - recipientPublic:", recipientPublic);
    const nonce = nacl.randomBytes(24)
    console.log("Encrypt message - nonce:", nonce);
    const shared = nacl.box.before(recipientPublic, slicedSenderSecret)
    console.log("Encrypt message - shared:", shared);
    const messageUint8 = naclUtil.decodeUTF8(message)
    console.log("Encrypt message - messageUint8:", messageUint8);
    // const encrypted = nacl.box.after(messageUint8, nonce, shared)
    const encrypted = nacl.secretbox(messageUint8, nonce, shared)
    console.log("Encrypt message - encrypted:", encrypted);
    const signature = nacl.sign.detached(messageUint8, senderSecret)
    console.log("Encrypt message - signature:", signature);

    return {
      nonce: naclUtil.encodeBase64(nonce),
      cipher: naclUtil.encodeBase64(encrypted),
      signature: naclUtil.encodeBase64(signature)
    }
  } catch (e) {
    console.error(e);
    throw new Error(e.message)
  }
}

export function decryptMessageUsingShared(cipher: string, nonce: string, sig: string, recipientSecret: Uint8Array, senderPublic: Uint8Array) {
  try {
    console.log("Decrypt message - recipientSecret:", recipientSecret);
    console.log("Decrypt message - senderPublic:", senderPublic);
    const nonceBytes = naclUtil.decodeBase64(nonce)
    console.log("Decrypt message - nonceBytes:", nonceBytes);
    const cipherBytes = naclUtil.decodeBase64(cipher)
    console.log("Decrypt message - cipherBytes:", cipherBytes);
    const shared = nacl.box.before(senderPublic, recipientSecret)
    console.log("Decrypt message - shared:", shared);
    const slicedCipherBytes = cipherBytes.slice(0, 32)  // NaCl expects 32-byte secret
    console.log("Decrypt message - slicedCipherBytes:", slicedCipherBytes);
    const plain = nacl.box.open.after(cipherBytes, nonceBytes, shared)
    console.log("Decrypt message - plain:", plain);
    const signatureBytes = naclUtil.decodeBase64(sig)

    if (!plain) {
      throw new Error("Decryption failed")
    }

    const isVerified = nacl.sign.detached.verify(plain, signatureBytes, senderPublic);
    if (!isVerified) {
      throw new Error("Signature verification failed")
    }
    console.log("Decrypt message - isVerified:", isVerified);

    return naclUtil.encodeUTF8(plain)
  } catch (e) {
    console.error(e);
  }
}

export function encryptMessageUsingSecret(message: string, threadId: string) {
  try {
    const key = naclUtil.decodeUTF8(threadId).slice(0, 32);
    console.log("encrypt message using secret - key", key)
    const nonce = nacl.randomBytes(24);
    const messageUint8 = naclUtil.decodeUTF8(message);
    const encrypted = nacl.secretbox(messageUint8, nonce, key);

    return {
      nonce: naclUtil.encodeBase64(nonce),
      cipher: naclUtil.encodeBase64(encrypted),
    }
  } catch (e) {
    console.error("encrypt message using secret - error", e);
    throw new Error("Encryption failed")
  }
}

export function decryptMessageUsingSecret(cipher: string, nonce: string, threadId: string) {
  const nonceBytes = naclUtil.decodeBase64(nonce);
  const cipherBytes = naclUtil.decodeBase64(cipher);
  const keyBytes = naclUtil.decodeUTF8(threadId).slice(0, 32);

  const decrypted = nacl.secretbox.open(cipherBytes, nonceBytes, keyBytes);

  if (!decrypted) {
    throw new Error("Decryption failed");
  }

  return naclUtil.encodeUTF8(decrypted);
}
