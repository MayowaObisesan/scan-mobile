import OpenAI from 'openai'
import {supabase} from "~/supabase/client";

const openai = new OpenAI({apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY})

const riskTool = [
  {
    name: 'analyze_tx_risk',
    description: 'Analyze a Solana transaction and return a risk score (0-100)',
    parameters: {
      type: 'object',
      properties: {
        to: {type: 'string', description: 'Destination wallet address'},
        amount: {type: 'number', description: 'Amount of SOL or token to send'},
        program_ids: {
          type: 'array',
          items: {type: 'string'},
          description: 'List of involved Solana program IDs'
        }
      },
      required: ['to', 'amount']
    }
  }
]

export async function scoreTransactionRisk(
  {
    to,
    amount,
    program_ids
  }: {
    to: string
    amount: number
    program_ids?: string[]
  }): Promise<{ score: number; reason?: string }> {
  const chat = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      {
        role: 'user',
        content: 'Analyze this Solana transaction for risk.'
      }
    ],
    tools: riskTool,
    tool_choice: 'auto',
    tool_calls: [
      {
        name: 'analyze_tx_risk',
        arguments: JSON.stringify({to, amount, program_ids: program_ids ?? []})
      }
    ]
  })

  const fnResult = chat.choices[0].message.tool_calls?.[0]?.function_call?.arguments
  if (!fnResult) throw new Error('No function result returned.')

  return JSON.parse(fnResult)
}

export async function logRiskyTx(
  {
    userId,
    to,
    amount,
    program_ids,
    score,
    reason
  }: {
    userId: string
    to: string
    amount: number
    program_ids?: string[]
    score: number
    reason?: string
  }) {
  await supabase.from('tx_risk_logs').insert({
    user_id: userId,
    to_address: to,
    amount,
    program_ids,
    risk_score: score,
    reason
  })
}
