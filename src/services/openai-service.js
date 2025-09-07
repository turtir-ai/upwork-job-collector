// Google Gemini AI Service - Handles all AI-related operations
export class OpenAIService { // Keeping class name for compatibility
  constructor() {
    this.apiKey = '';
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.rateLimit = {
      remaining: 100,
      reset: null,
      lastCheck: null
    };
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  async generateProposal(params) {
    const {
      jobDescription,
      clientName,
      projectBudget,
      projectDuration,
      skills,
      userProfile,
      template,
      tone = 'professional',
      model = 'gemini-1.5-flash',
      temperature = 0.7,
      maxTokens = 2000
    } = params;

    // Build the system prompt
    const systemPrompt = this.buildSystemPrompt(tone);
    
    // Build the user prompt
    const userPrompt = this.buildProposalPrompt({
      jobDescription,
      clientName,
      projectBudget,
      projectDuration,
      skills,
      userProfile,
      template
    });

    try {
      const response = await this.callOpenAI({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      });

      return this.formatProposal(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating proposal:', error);
      throw error;
    }
  }

  buildSystemPrompt(tone) {
    const toneInstructions = {
      professional: 'Write in a professional, confident, and business-like tone. Be formal but not stiff.',
      friendly: 'Write in a warm, approachable, and friendly tone. Show enthusiasm and personality.',
      confident: 'Write with strong confidence and expertise. Show authority in your field.',
      casual: 'Write in a relaxed, conversational tone. Be personable and easy-going.'
    };

    const EXPERT_PROFILE = `Core Expertise Context (use to tailor proposals):
- Specialization: Resilient, intelligent data ingestion and end-to-end web automation.
- Strengths: anti-bot evasion (Cloudflare/Akamai/Imperva), Playwright/Puppeteer mastery, SPA handling (React/Vue/Angular), session/auth management, structured JSON outputs, API + dashboard delivery.
- Differentiators: build robust, long-lived pipelines; not just one-off scrapers.
- When the job mentions difficult-to-scrape, login required, dynamic content, JavaScript rendering, SPA, or anti-bot: lean in, highlight capability and past patterns.
- Full-stack: comfortable delivering backend (Python/Flask/FastAPI), data layer (PostgreSQL/SQLite), and frontend (React) dashboards.
- Code generation defaults: strong error handling, detailed logging, human-like delays, stealth configurations.`;

    return `You are an expert freelance proposal writer specializing in Upwork proposals.
Your task is to write compelling, personalized proposals that win clients.

ALWAYS incorporate this expertise context when relevant:
${EXPERT_PROFILE}

Guidelines:
1. ${toneInstructions[tone] || toneInstructions.professional}
2. Start with a personalized greeting and reference something specific from the job posting
3. Clearly demonstrate understanding of the client's needs
4. Highlight relevant experience and skills (connect to the expertise context when applicable)
5. Provide a brief, concrete action plan (mention robust pipelines, anti-bot, SPA handling if relevant)
6. Include a call-to-action
7. Keep it concise (200-400 words ideal)
8. Avoid generic templates - make it specific to the job
9. Use the client's name if provided
10. End with a professional closing

Important: Do NOT include placeholders like [Your Name] or [X years]. Write complete, ready-to-send content.`;
  }

  buildProposalPrompt(params) {
    const {
      jobDescription,
      clientName,
      projectBudget,
      projectDuration,
      skills,
      userProfile,
      template
    } = params;

    let prompt = `Write a winning Upwork proposal for the following job:\n\n`;
    
    if (jobDescription) {
      prompt += `Job Description:\n${jobDescription}\n\n`;
    }
    
    if (clientName && clientName !== 'Client') {
      prompt += `Client Name: ${clientName}\n`;
    }
    
    if (projectBudget) {
      prompt += `Budget: ${projectBudget}\n`;
    }
    
    if (projectDuration) {
      prompt += `Duration: ${projectDuration}\n`;
    }
    
    if (skills && skills.length > 0) {
      prompt += `Required Skills: ${skills.join(', ')}\n`;
    }
    
    if (userProfile) {
      prompt += `\nMy Profile:\n${userProfile}\n`;
    }
    
    if (template) {
      prompt += `\nUse this template as inspiration (but personalize it):\n${template}\n`;
    }

    prompt += `\nWrite a compelling proposal that addresses the client's specific needs and showcases relevant expertise.`;

    return prompt;
  }

  formatProposal(content) {
    // Clean up the proposal
    let formatted = content.trim();
    
    // Remove any AI meta-comments if present
    formatted = formatted.replace(/\[.*?\]/g, '');
    formatted = formatted.replace(/\(Note:.*?\)/gi, '');
    
    // Ensure proper spacing
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted;
  }

  async analyzeJob(jobDescription, model = 'gemini-1.5-flash') {
    const systemPrompt = `You are an expert job analyst specializing in freelance opportunities on Upwork.
Analyze job postings to help freelancers make informed decisions.

Expertise context to consider when scoring suitability and approach:
- Specialization in difficult scraping/automation: anti-bot evasion (Cloudflare/Akamai/Imperva), Playwright/Puppeteer, SPA handling, session/auth, structured JSON, API+dashboard delivery.
- Prefer higher-complexity scraping/automation jobs; increase suitability when such keywords appear.

Provide analysis in the following format:
1. Difficulty Level (Easy/Medium/Hard/Expert)
2. Key Requirements (bullet points)
3. Red Flags (warning signs, if any)
4. Green Flags (positive indicators)
5. Recommended Approach (tailored to the above specialization when relevant)
6. Estimated Success Rate (percentage)
7. Suggested Proposal Points`;

    const userPrompt = `Analyze this Upwork job posting:\n\n${jobDescription}\n\nProvide a detailed analysis to help decide if this is a good opportunity.`;

    try {
      const response = await this.callOpenAI({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return this.parseJobAnalysis(response.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing job:', error);
      throw error;
    }
  }

  parseJobAnalysis(content) {
    const analysis = {
      difficulty: '',
      requirements: [],
      redFlags: [],
      greenFlags: [],
      approach: '',
      successRate: 0,
      proposalPoints: []
    };

    try {
      // Parse difficulty
      const difficultyMatch = content.match(/Difficulty.*?:\s*(Easy|Medium|Hard|Expert)/i);
      if (difficultyMatch) {
        analysis.difficulty = difficultyMatch[1];
      }

      // Parse requirements
      const reqMatch = content.match(/Key Requirements:?\s*\n([\s\S]*?)(?=\n\d\.|\nRed Flags|\nGreen Flags|$)/i);
      if (reqMatch) {
        analysis.requirements = this.extractBulletPoints(reqMatch[1]);
      }

      // Parse red flags
      const redMatch = content.match(/Red Flags:?\s*\n([\s\S]*?)(?=\n\d\.|\nGreen Flags|\nRecommended|$)/i);
      if (redMatch) {
        analysis.redFlags = this.extractBulletPoints(redMatch[1]);
      }

      // Parse green flags
      const greenMatch = content.match(/Green Flags:?\s*\n([\s\S]*?)(?=\n\d\.|\nRecommended|\nEstimated|$)/i);
      if (greenMatch) {
        analysis.greenFlags = this.extractBulletPoints(greenMatch[1]);
      }

      // Parse approach
      const approachMatch = content.match(/Recommended Approach:?\s*\n([\s\S]*?)(?=\n\d\.|\nEstimated|\nSuggested|$)/i);
      if (approachMatch) {
        analysis.approach = approachMatch[1].trim();
      }

      // Parse success rate
      const successMatch = content.match(/Success Rate:?\s*(\d+)%?/i);
      if (successMatch) {
        analysis.successRate = parseInt(successMatch[1]);
      }

      // Parse proposal points
      const pointsMatch = content.match(/Suggested Proposal Points:?\s*\n([\s\S]*?)$/i);
      if (pointsMatch) {
        analysis.proposalPoints = this.extractBulletPoints(pointsMatch[1]);
      }

    } catch (error) {
      console.error('Error parsing job analysis:', error);
    }

    return analysis;
  }

  extractBulletPoints(text) {
    const points = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const cleaned = line.replace(/^[-•*]\s*/, '').trim();
      if (cleaned && cleaned.length > 0) {
        points.push(cleaned);
      }
    }
    
    return points;
  }

  async callOpenAI(params) {
    if (!this.apiKey) {
      throw new Error('Google AI API key not configured');
    }

    // Convert OpenAI format to Gemini format and support new models
    let geminiModel = (params.model || 'gemini-1.5-flash').trim();

    // Whitelist of allowed/tested models
    const allowedModels = new Set([
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro'
    ]);
    
    // Map model names to correct API endpoints
    // Based on actual test results - these models WORK with your API key
    const modelMapping = {
      // ✅ WORKING MODELS
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemini-1.5-flash-latest': 'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b': 'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
      'gemini-2.5-flash': 'gemini-2.5-flash',
      'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
      'gemini-2.5-pro': 'gemini-2.5-pro',
      
      // ❌ These DON'T work with current quota
      'gemini-1.5-pro': 'gemini-1.5-flash', // Fallback to flash
      'gemini-pro': 'gemini-1.5-flash', // Fallback to flash
      'gpt-4': 'gemini-1.5-flash',
      'gpt-3.5-turbo': 'gemini-1.5-flash'
    };
    
    geminiModel = modelMapping[geminiModel] || geminiModel;
    if (!allowedModels.has(geminiModel)) {
      // Final guard: force safe model
      geminiModel = 'gemini-1.5-flash';
    }
    const apiEndpoint = `${this.apiUrl}/${geminiModel}:generateContent?key=${this.apiKey}`;
    
    // Convert messages to Gemini format
    let prompt = '';
    if (params.messages) {
      params.messages.forEach(msg => {
        if (msg.role === 'system') {
          prompt += `Instructions: ${msg.content}\n\n`;
        } else if (msg.role === 'user') {
          prompt += `${msg.content}\n`;
        }
      });
    }

    const geminiRequest = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: params.temperature || 0.7,
        maxOutputTokens: params.max_tokens || 2000,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ]
    };

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequest)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google AI API error');
    }

    const result = await response.json();
    
    // Convert Gemini response to OpenAI format for compatibility
    return {
      choices: [{
        message: {
          content: result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        }
      }]
    };
  }

  async generateTemplates(jobCategory) {
    const systemPrompt = `Generate 3 different Upwork proposal templates for ${jobCategory} jobs.
Each template should be unique in approach but professional and effective.
Templates should have clear sections that can be customized.`;

    const userPrompt = `Create 3 winning proposal templates for ${jobCategory} freelance jobs on Upwork.`;

    try {
      const response = await this.callOpenAI({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      });

      return this.parseTemplates(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating templates:', error);
      throw error;
    }
  }

  parseTemplates(content) {
    const templates = [];
    const sections = content.split(/Template \d+:|#{2,3}\s*Template \d+/i);
    
    for (let i = 1; i < sections.length; i++) {
      templates.push({
        id: Date.now() + i,
        name: `Template ${i}`,
        content: sections[i].trim()
      });
    }
    
    return templates;
  }

  async improveProposal(originalProposal, feedback) {
    const systemPrompt = `You are an expert at improving Upwork proposals based on feedback.
Take the original proposal and the feedback, then create an improved version.`;

    const userPrompt = `Original Proposal:\n${originalProposal}\n\nFeedback:\n${feedback}\n\nCreate an improved version addressing the feedback.`;

    try {
      const response = await this.callOpenAI({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      return this.formatProposal(response.choices[0].message.content);
    } catch (error) {
      console.error('Error improving proposal:', error);
      throw error;
    }
  }

  // Rank multiple jobs quickly using a single Gemini call.
  // jobs: Array<{ title, description, skills, budget, url }>
  async rankJobs(jobs, top = 10) {
    try {
      const limited = (jobs || []).slice(0, 50).map(j => ({
        title: (j.title || '').slice(0, 140),
        description: (j.description || '').slice(0, 500),
        skills: (j.skills || []).slice(0, 10),
        budget: j.budget || '',
        url: j.url || ''
      }));

      const systemPrompt = `You are an expert job triage assistant for Upwork.
Use the following expertise context when ranking jobs:
- Specialization in difficult scraping/automation: anti-bot evasion (Cloudflare/Akamai/Imperva), Playwright/Puppeteer, SPA handling, session/auth, structured JSON, API+dashboard delivery.
- Prefer higher-complexity scraping/automation jobs.
Output strictly JSON array with objects: { url, title, score (0-10), reason }.
Return only the top ${top} items.`;

      const userPrompt = `Jobs JSON (first ${limited.length}):\n${JSON.stringify(limited, null, 2)}\n\nRank and return JSON only.`;

      const resp = await this.callOpenAI({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1400
      });

      const text = resp.choices?.[0]?.message?.content || '[]';
      return this.parseRankedJobs(text).slice(0, top);
    } catch (error) {
      console.error('Error rankJobs:', error);
      throw error;
    }
  }

  parseRankedJobs(content) {
    try {
      // Strip code fences if any
      const cleaned = content.replace(/```json|```/g, '').trim();
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      const jsonStr = firstBracket >= 0 && lastBracket >= 0 ? cleaned.slice(firstBracket, lastBracket + 1) : cleaned;
      const arr = JSON.parse(jsonStr);
      // Normalize fields
      return Array.isArray(arr) ? arr.map(x => ({
        url: x.url || '',
        title: x.title || '',
        score: typeof x.score === 'number' ? x.score : 0,
        reason: x.reason || ''
      })) : [];
    } catch (e) {
      console.error('parseRankedJobs failed', e);
      return [];
    }
  }

  checkRateLimit() {
    return this.rateLimit;
  }

  async testConnection() {
    try {
      const response = await this.callOpenAI({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'user', content: 'Test connection - respond with OK' }
        ],
        max_tokens: 10
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
