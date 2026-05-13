/**
 * Parse natural language queries into structured filter objects.
 * Example: "refunds over $50 in April" → {type: 'refund', amount_min: 50, from: '2026-04-01', to: '2026-04-30'}
 */

export interface NLFilters {
  type?: 'sale' | 'refund';
  amount_min?: number;
  amount_max?: number;
  from?: string;
  to?: string;
  customer_email?: string;
  status?: string;
  limit?: number;
}

const OPEN_AI_URL = process.env.OPEN_AI_URL;
const OPEN_AI_KEY = process.env.OPEN_AI_KEY;
const OPEN_AI_MODEL = process.env.OPEN_AI_MODEL;
const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT;
const TEMPERATURE = Number(process.env.TEMPERATURE)

function getConfig() {
  if (!OPEN_AI_URL || !OPEN_AI_KEY || !OPEN_AI_MODEL || !SYSTEM_PROMPT || isNaN(TEMPERATURE)) {
    throw new Error(
      'Missing required environment variables: OPEN_AI_URL, OPEN_AI_KEY, OPEN_AI_MODEL, SYSTEM_PROMPT, TEMPERATURE'
    );
  }
  return { OPEN_AI_URL, OPEN_AI_KEY, OPEN_AI_MODEL, SYSTEM_PROMPT, TEMPERATURE };
}

async function chatHelper(userPrompt: string): Promise<string> {
  const { OPEN_AI_URL, OPEN_AI_KEY, OPEN_AI_MODEL, SYSTEM_PROMPT, TEMPERATURE } = getConfig();
  
  const response = await fetch(OPEN_AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPEN_AI_KEY}`,
    },
    body: JSON.stringify({
      model: OPEN_AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: TEMPERATURE,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content: string = data.choices[0].message.content;
  console.log('prompt:', userPrompt);
  console.log('OpenAI response:', content);
  return content;
}

export async function parseNaturalLanguageQuery(nlQuery: string): Promise<NLFilters> {
  const response = await chatHelper(nlQuery);
  
  try {
    const filters: NLFilters = JSON.parse(response);
    return filters;
    
  } catch (e) {
    console.error('Error parsing OpenAI response as JSON:', e);
    throw new Error('Invalid response format from OpenAI');
  }
}