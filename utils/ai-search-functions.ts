// utils/ai-functions.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchUsers } from "~/services/search";
import { router } from "expo-router";
import {contactsRepository} from "~/db/contacts";

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);

export type AIAction = 'bio' | 'chat' | 'search' | 'payment';

export const processAICommand = async (input: string) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Detect the user's intent from input
  const intentPrompt = `Classify this input into one category: bio, chat, search, payment: "${input}"`;
  const intentResult = await model.generateContent(intentPrompt);
  const intent = (await intentResult.response.text()).toLowerCase().trim() as AIAction;

  switch (intent) {
    case 'bio':
      return handleBioGeneration(input, model);
    case 'chat':
      return handleChatComposition(input, model);
    case 'search':
      return handleContactSearch(input);
    default:
      throw new Error('Unsupported action');
  }
};

// handlers for each action
const handleBioGeneration = async (input: string, model: any) => {
  const result = await model.generateContent(
    `Create a professional bio (max 150 chars) based on: ${input}`
  );
  const bio = await result.response.text();
  router.push('/profile/bio');
  return { type: 'bio', content: bio };
};

const handleChatCompositionOld = async (input: string, model: any) => {
  const result = await model.generateContent(
    `Compose a natural chat message for: ${input}`
  );
  const message = await result.response.text();
  return { type: 'chat', content: message };
};

const handleChatComposition = async (input: string, model: any) => {
  // First, analyze the input to extract recipient info
  const recipientPrompt = `Analyze this message and return a JSON object with "recipient" and "message" keys. Input: "${input}"`;
  const recipientResult = await model.generateContent(recipientPrompt);

  // Clean and parse the response
  const responseText = (await recipientResult.response.text())
    .replace(/^```json\s*/, '')  // Remove leading ```json
    .replace(/\s*```$/, '')      // Remove trailing ```
    // .replace(/[`'"]/g, '"')      // Replace any quotes/backticks with double quotes
    .replace(/`/g, '')      // Replace any quotes/backticks with double quotes
    .replace(/\n/g, '')          // Remove newlines
    .trim();                     // Remove extra whitespace

  console.log("Chat composition - Cleaned response:", responseText);

  try {
    const parsedResult = JSON.parse(responseText);

    // Search for the recipient user
    // const potentialRecipients = await searchUsers(parsedResult.recipient);
    // const potentialRecipients = await contactsRepository.getContactByName(parsedResult.recipient);
    const myContacts = await contactsRepository.myContacts();
    const phoneToContact = myContacts?.phoneToContact;
    // const potentialRecipients = await contactsRepository.getContactByName(parsedResult.recipient);
    // const potentialRecipients = myContacts?.phoneToContact.forEach((value, key, map) => value.name.toLowerCase() === parsedResult.recipient.toLowerCase());
    const potentialRecipients = Array.from(myContacts?.phoneToContact.values() || []).find(
      (value) => value.name.toLowerCase() === parsedResult.recipient.toLowerCase()
    );
    console.log("potential Recipients", potentialRecipients);
    const recipient = potentialRecipients;

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Rest of the function remains the same
    const messagePrompt = `Compose a natural chat message for: ${parsedResult.message}`;
    const messageResult = await model.generateContent(messagePrompt);
    const message = await messageResult.response.text();

    return {
      type: 'chat',
      content: message,
      recipient: {
        id: recipient.id,
        userData: recipient
      }
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error, responseText);
    throw new Error('Failed to process chat composition');
  }
};

const handleContactSearch = async (input: string) => {
  const results = await searchUsers(input);
  return { type: 'search', content: results };
};
