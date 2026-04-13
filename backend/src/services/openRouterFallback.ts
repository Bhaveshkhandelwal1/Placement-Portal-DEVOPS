export async function callOpenRouter(
  systemInstruction: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
  model: string = "google/gemini-2.5-flash"
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured for fallback.");

  const payload = {
    model,
    max_tokens: 1200,
    messages: [
      ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
      ...messages
    ]
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5000",
      "X-Title": "Placement Portal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
  }

  const json = await response.json();
  if (!json.choices?.[0]?.message?.content) {
    throw new Error('Empty response from OpenRouter');
  }
  return json.choices[0].message.content.trim();
}
