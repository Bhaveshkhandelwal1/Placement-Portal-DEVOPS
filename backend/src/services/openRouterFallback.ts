export async function callOpenRouter(
  systemInstruction: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
  model: string = "google/gemini-2.0-flash-001"
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
    let errorMessage = `OpenRouter API error: ${response.status} - ${errorBody}`;
    
    if (response.status === 401) {
      errorMessage = `OpenRouter Authentication Failed (401): The API key is invalid or the user was not found. Please check your OPENROUTER_API_KEY in .env. Details: ${errorBody}`;
    } else if (response.status === 403) {
      errorMessage = `OpenRouter Access Forbidden (403): Your API key might not have permission for this model or has been restricted. Details: ${errorBody}`;
    }
    
    throw new Error(errorMessage);
  }

  const json = await response.json();
  if (!json.choices?.[0]?.message?.content) {
    throw new Error('Empty response from OpenRouter');
  }
  return json.choices[0].message.content.trim();
}
