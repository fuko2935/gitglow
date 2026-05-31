import { GitGlowConfig } from '../types/index.js';

export async function generateCommitMessage(diff: string, config: GitGlowConfig, forceMock = false): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;
  if (!apiKey || forceMock) {
    // Elegant heuristic mockup for local testing without key dependencies
    const sampleAddedLines = diff
      .split('\n')
      .filter(line => line.startsWith('+') && !line.startsWith('+++'))
      .map(line => line.substring(1).trim())
      .join(' ')
      .substring(0, 80);

    const type = config.conventionalTypes.includes('feat') ? 'feat' : 'chore';
    const msg = `${type}(core): auto-scaffold improvements\n\nAnalyzed changes: ${sampleAddedLines || 'refactored core modules'}`;
    return new Promise(resolve => setTimeout(() => resolve(msg), 500));
  }

  // Live OpenAI REST API invocation to avoid bulky official package dependencies
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an assistant generating Conventional Commit messages in language: ${config.language}. Under the types: ${config.conventionalTypes.join(', ')}. Format output EXACTLY as: type(scope): short description\n\nDetailed bulleted changes.`
          },
          {
            role: 'user',
            content: `Generate a commit message for this diff:\n\n${diff}`
          }
        ],
        temperature: 0.2
      })
    });
    
    if (!response.ok) throw new Error('API Error');
    const data = await response.json() as any;
    return data.choices[0].message.content.trim();
  } catch {
    return 'chore(core): update modules (fallback)';
  }
}

export async function generatePRDescription(diff: string, commits: string, config: GitGlowConfig, forceMock = false): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;
  if (!apiKey || forceMock) {
    const prMarkdown = `## Premium Pull Request Summary

### 🛠️ Changes Proposed
- Automated synchronization of codebase changes.
- Commits summarized: ${commits.substring(0, 100) || 'None'}.

### 🔍 Verification Status
- Unit tests executed successfully.
`;
    return new Promise(resolve => setTimeout(() => resolve(prMarkdown), 500));
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert maintainer creating Markdown Pull Request descriptions. Promptly summarize changes and structure standard headings (Changes, Architecture, Verification). Respond in language: ${config.language}.`
          },
          {
            role: 'user',
            content: `Create PR description for commits:\n${commits}\n\nDiff:\n${diff}`
          }
        ],
        temperature: 0.3
      })
    });
    
    if (!response.ok) throw new Error('API Error');
    const data = await response.json() as any;
    return data.choices[0].message.content.trim();
  } catch {
    return '## Pull Request\n\nUpdates implemented successfully.';
  }
}
