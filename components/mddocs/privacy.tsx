import {Text} from "react-native";

export default function Privacy() {

  return (
    <Text>
        🛡 1. Privacy Policy for ChatFi

        Here’s a complete version you can use for your app store listing or website:

        ⸻

        📄 Privacy Policy – ChatFi

        Effective Date: [April 21, 2025]

        ChatFi (“we”, “our”, or “us”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the ChatFi mobile application (the “App”).

        ⸻

        🔍 Information We Collect
        •	Personal Information: Your phone number and Supabase user ID when you authenticate.
        •	Wallet Information: Your public Solana wallet address(es), balances, and transaction history.
        •	Messages: Encrypted messages stored securely via Supabase, not shared with third parties.
        •	Device Data: Basic device information and push notification tokens (Expo).
        •	Usage Data: Anonymous analytics for improving app performance and security.

        ⸻

        🛡 How We Use Your Information

        We use your information to:
        •	Authenticate users using Supabase
        •	Enable secure chat and financial transactions
        •	Prevent fraud and analyze transaction risk
        •	Send push notifications and important updates
        •	Improve the app’s features and performance

        ⸻

        🔐 Data Security

        All sensitive data is end-to-end encrypted where applicable. Wallet private keys never leave your device. We implement strict security measures using Supabase RLS, Expo SecureStore, and Solana’s cryptographic protocols.

        ⸻

        👥 Third-Party Services

        We use trusted third-party services:
        •	Supabase for backend storage and authentication
        •	OpenAI for transaction risk analysis (no user data stored)
        •	Expo Push for notifications

        ⸻

        ❌ No Selling of Personal Data

        We do not sell or share your personal data with third parties for marketing purposes.

        ⸻

        🧑‍⚖️ Your Rights

        You may:
        •	Delete your account via the app
        •	Request access or deletion of your data
        •	Opt out of risk alerts or push notifications

        ⸻

        📬 Contact Us

        For privacy-related inquiries, please contact:
        support@chatfi.app
    </Text>
  )
}
