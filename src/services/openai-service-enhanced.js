// Enhanced Google Gemini AI Service with Retry and Fallback
export class OpenAIService {
  constructor() {
    this.apiKey = '';
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.rateLimit = {
      remaining: 100,
      reset: null,
      lastCheck: null
    };
    // Add retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 2000, // 2 seconds
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2
    };
    // Model fallback chain for when primary model is overloaded
    this.modelFallbackChain = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash-exp'
    ];
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  // Enhanced retry mechanism with exponential backoff
  async retryWithBackoff(fn, retries = 0, lastError = null) {
    const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = this.retryConfig;
    
    if (retries >= maxRetries) {
      throw lastError || new Error('Max retries exceeded');
    }
    
    try {
      return await fn();
    } catch (error) {
      console.log(`Attempt ${retries + 1} failed:`, error.message);
      
      // Check if it's a rate limit or overload error
      const isOverloaded = error.message?.includes('overloaded') || 
                          error.message?.includes('rate') ||
                          error.message?.includes('quota') ||
                          error.message?.includes('429') ||
                          error.message?.includes('503');
      
      if (!isOverloaded && retries > 0) {
        // If it's not an overload error and we've tried at least once, throw
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, retries),
        maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;
      
      console.log(`Retrying after ${Math.round(totalDelay / 1000)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
      
      return this.retryWithBackoff(fn, retries + 1, error);
    }
  }

  // Try different models if primary is overloaded
  async callWithFallback(params, modelIndex = 0) {
    if (modelIndex >= this.modelFallbackChain.length) {
      throw new Error('All models are currently overloaded. Please try again later.');
    }
    
    const model = this.modelFallbackChain[modelIndex];
    console.log(`Trying model: ${model}`);
    
    try {
      // Try the current model with retry
      return await this.retryWithBackoff(async () => {
        return await this.callOpenAI({ ...params, model });
      });
    } catch (error) {
      console.error(`Model ${model} failed:`, error.message);
      
      // If overloaded, try next model
      if (error.message?.includes('overloaded') || 
          error.message?.includes('quota')) {
        console.log(`Model ${model} is overloaded, trying next model...`);
        return this.callWithFallback(params, modelIndex + 1);
      }
      
      throw error;
    }
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

    const systemPrompt = this.buildSystemPrompt(tone);
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
      // Use fallback mechanism
      const response = await this.callWithFallback({
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
      
      // Provide a fallback template if AI fails completely
      if (error.message?.includes('overloaded')) {
        return this.getFallbackProposal(jobDescription, clientName);
      }
      
      throw error;
    }
  }

  // Fallback proposal template when AI is unavailable
  getFallbackProposal(jobDescription, clientName) {
    const greeting = clientName && clientName !== 'Client' 
      ? `Dear ${clientName},` 
      : 'Hello,';
    
    return `${greeting}

I noticed your project requirements and I'm confident I can deliver excellent results for you.

With extensive experience in web scraping and automation, I specialize in:
• Building robust, anti-bot resistant scrapers (Cloudflare, Akamai bypass)
• Handling complex SPAs and dynamic content
• Creating reliable data pipelines with proper error handling
• Delivering clean, structured data through APIs or dashboards

For your project, I would:
1. Analyze the target site's structure and anti-bot measures
2. Develop a resilient scraping solution with retry logic
3. Implement data validation and quality checks
4. Deliver the data in your preferred format

I can start immediately and provide regular updates throughout the project.

Looking forward to discussing your specific requirements in detail.

Best regards,
[Your name]

Note: This is a template proposal generated offline due to temporary API limitations. Please customize it based on the specific job requirements.`;
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
    let formatted = content.trim();
    formatted = formatted.replace(/\[.*?\]/g, '');
    formatted = formatted.replace(/\(Note:.*?\)/gi, '');
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
      const response = await this.callWithFallback({
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
      
      // Return basic analysis if AI fails
      if (error.message?.includes('overloaded')) {
        return {
          difficulty: 'Unable to analyze',
          requirements: ['AI service temporarily unavailable'],
          redFlags: [],
          greenFlags: [],
          approach: 'Please analyze manually',
          successRate: 0,
          proposalPoints: ['Review job details carefully', 'Match your skills to requirements']
        };
      }
      
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
      const difficultyMatch = content.match(/Difficulty.*?:\s*(Easy|Medium|Hard|Expert)/i);
      if (difficultyMatch) {
        analysis.difficulty = difficultyMatch[1];
      }

      const reqMatch = content.match(/Key Requirements:?\s*\n([\s\S]*?)(?=\n\d\.|\nRed Flags|\nGreen Flags|$)/i);
      if (reqMatch) {
        analysis.requirements = this.extractBulletPoints(reqMatch[1]);
      }

      const redMatch = content.match(/Red Flags:?\s*\n([\s\S]*?)(?=\n\d\.|\nGreen Flags|\nRecommended|$)/i);
      if (redMatch) {
        analysis.redFlags = this.extractBulletPoints(redMatch[1]);
      }

      const greenMatch = content.match(/Green Flags:?\s*\n([\s\S]*?)(?=\n\d\.|\nRecommended|\nEstimated|$)/i);
      if (greenMatch) {
        analysis.greenFlags = this.extractBulletPoints(greenMatch[1]);
      }

      const approachMatch = content.match(/Recommended Approach:?\s*\n([\s\S]*?)(?=\n\d\.|\nEstimated|\nSuggested|$)/i);
      if (approachMatch) {
        analysis.approach = approachMatch[1].trim();
      }

      const successMatch = content.match(/Success Rate:?\s*(\d+)%?/i);
      if (successMatch) {
        analysis.successRate = parseInt(successMatch[1]);
      }

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

    let geminiModel = (params.model || 'gemini-1.5-flash').trim();

    const allowedModels = new Set([
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp'
    ]);
    
    const modelMapping = {
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemini-1.5-flash-latest': 'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b': 'gemini-1.5-flash-8b',
      'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
      'gemini-1.5-pro': 'gemini-1.5-flash',
      'gemini-pro': 'gemini-1.5-flash',
      'gpt-4': 'gemini-1.5-flash',
      'gpt-3.5-turbo': 'gemini-1.5-flash'
    };
    
    geminiModel = modelMapping[geminiModel] || geminiModel;
    if (!allowedModels.has(geminiModel)) {
      geminiModel = 'gemini-1.5-flash';
    }
    
    const apiEndpoint = `${this.apiUrl}/${geminiModel}:generateContent?key=${this.apiKey}`;
    
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
      const errorMessage = error.error?.message || 'Google AI API error';
      
      // Log detailed error for debugging
      console.error('API Error Response:', {
        status: response.status,
        message: errorMessage,
        model: geminiModel,
        error: error
      });
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    return {
      choices: [{
        message: {
          content: result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        }
      }]
    };
  }

  // Queue management for rate limiting
  async queueRequest(fn) {
    // Simple queue to prevent concurrent requests
    if (this.requestInProgress) {
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.requestInProgress) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    this.requestInProgress = true;
    try {
      return await fn();
    } finally {
      this.requestInProgress = false;
    }
  }

  async generateTemplates(jobCategory) {
    const systemPrompt = `Generate 3 different Upwork proposal templates for ${jobCategory} jobs.
Each template should be unique in approach but professional and effective.
Templates should have clear sections that can be customized.`;

    const userPrompt = `Create 3 winning proposal templates for ${jobCategory} freelance jobs on Upwork.`;

    try {
      const response = await this.callWithFallback({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2500
      });

      return this.parseTemplates(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating templates:', error);
      
      // Return default templates if AI fails
      if (error.message?.includes('overloaded')) {
        return this.getDefaultTemplates(jobCategory);
      }
      
      throw error;
    }
  }

  getDefaultTemplates(category) {
    return [
      {
        name: 'Professional Template',
        content: `Dear [Client Name],

I reviewed your ${category} project requirements with great interest. With extensive experience in similar projects, I can deliver exceptional results for you.

[Specific reference to job details]

My approach:
• [Step 1]
• [Step 2]
• [Step 3]

Timeline: [Estimated timeline]
Budget: [Your rate]

I'm available to start immediately and would love to discuss your project in detail.

Best regards,
[Your name]`
      },
      {
        name: 'Expertise-Focused Template',
        content: `Hello [Client Name],

Your ${category} project aligns perfectly with my expertise in [relevant skills].

Recent similar work:
• [Project 1 brief description]
• [Project 2 brief description]

For your project, I would:
1. [Detailed approach]
2. [Quality assurance]
3. [Delivery method]

I guarantee [specific deliverables] with [timeline].

Looking forward to collaborating with you.

Best,
[Your name]`
      },
      {
        name: 'Value-Driven Template',
        content: `Hi [Client Name],

I can help you achieve [specific goal from job posting] efficiently and effectively.

Why choose me:
✓ [Unique value proposition 1]
✓ [Unique value proposition 2]
✓ [Unique value proposition 3]

Deliverables:
- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

I'm ready to start today and committed to exceeding your expectations.

Regards,
[Your name]`
      }
    ];
  }

  parseTemplates(content) {
    // Parse the generated templates
    const templates = [];
    const sections = content.split(/Template \d+:|###/i).filter(s => s.trim());
    
    sections.forEach((section, index) => {
      templates.push({
        name: `Template ${index + 1}`,
        content: section.trim()
      });
    });
    
    return templates.length > 0 ? templates : this.getDefaultTemplates('general');
  }

  async rankJobs(jobs, preferences = {}) {
    if (!jobs || jobs.length === 0) {
      return [];
    }

    const {
      preferredSkills = [],
      minBudget = 0,
      maxBudget = Infinity,
      experienceLevel = 'all',
      keywords = []
    } = preferences;

    try {
      // Use AI to rank if available, with fallback
      const systemPrompt = `You are a job matching expert. Rank these Upwork jobs based on:
1. Match with preferred skills: ${preferredSkills.join(', ')}
2. Budget range: $${minBudget} - $${maxBudget}
3. Experience level: ${experienceLevel}
4. Keywords: ${keywords.join(', ')}
5. Overall opportunity quality

Return a JSON array of job IDs in order of best to worst match, with scores 0-100.`;

      const jobSummaries = jobs.map(job => ({
        id: job.id,
        title: job.title,
        budget: job.budget,
        skills: job.skills,
        description: job.description?.substring(0, 200)
      }));

      const userPrompt = `Rank these jobs:\n${JSON.stringify(jobSummaries, null, 2)}`;

      const response = await this.callWithFallback({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const rankings = JSON.parse(response.choices[0].message.content);
      return rankings;
    } catch (error) {
      console.error('Error ranking jobs with AI, using fallback:', error);
      
      // Fallback to simple scoring algorithm
      return this.rankJobsFallback(jobs, preferences);
    }
  }

  rankJobsFallback(jobs, preferences) {
    const {
      preferredSkills = [],
      minBudget = 0,
      maxBudget = Infinity,
      keywords = []
    } = preferences;

    const scoredJobs = jobs.map(job => {
      let score = 50; // Base score
      
      // Skill matching
      if (job.skills && preferredSkills.length > 0) {
        const matchedSkills = job.skills.filter(skill => 
          preferredSkills.some(pref => 
            skill.toLowerCase().includes(pref.toLowerCase())
          )
        );
        score += matchedSkills.length * 10;
      }
      
      // Budget scoring
      const budget = job.budget?.amount || 0;
      if (budget >= minBudget && budget <= maxBudget) {
        score += 20;
      }
      
      // Keyword matching
      if (keywords.length > 0 && job.description) {
        const description = job.description.toLowerCase();
        const matchedKeywords = keywords.filter(keyword => 
          description.includes(keyword.toLowerCase())
        );
        score += matchedKeywords.length * 5;
      }
      
      // Recency bonus
      if (job.createdDateTime) {
        const hoursAgo = (Date.now() - new Date(job.createdDateTime)) / (1000 * 60 * 60);
        if (hoursAgo < 1) score += 15;
        else if (hoursAgo < 6) score += 10;
        else if (hoursAgo < 24) score += 5;
      }
      
      return {
        ...job,
        score: Math.min(100, score)
      };
    });

    return scoredJobs.sort((a, b) => b.score - a.score);
  }
}
