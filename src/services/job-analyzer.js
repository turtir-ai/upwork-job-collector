// Job Analyzer Service - Analyzes job postings
export class JobAnalyzer {
  constructor() {
    this.redFlagKeywords = [
      'urgent', 'asap', 'immediately', 'rockstar', 'ninja', 'guru',
      'unlimited revisions', 'no budget', 'exposure', 'portfolio building',
      'test project', 'unpaid', 'equity only', 'revenue share only'
    ];
    
    this.greenFlagKeywords = [
      'long-term', 'ongoing', 'established company', 'well-funded',
      'clear requirements', 'detailed', 'professional', 'experienced client',
      'verified payment', 'milestone', 'hourly'
    ];
  }

  async analyzeJob(params) {
    const { jobDescription, apiKey, model } = params;
    
    // Perform basic analysis without AI
    const basicAnalysis = this.performBasicAnalysis(jobDescription);

    // Always compute project suggestions from description
    const suggestions = this.generateSuggestedProjects(jobDescription);
    
    // If API key is provided, enhance with AI analysis
    if (apiKey) {
      const { OpenAIService } = await import('./openai-service.js');
      const openAI = new OpenAIService();
      openAI.setApiKey(apiKey);
      
      try {
        const aiAnalysis = await openAI.analyzeJob(jobDescription, model);
        const merged = this.mergeAnalyses(basicAnalysis, aiAnalysis);
        merged.suggestedProjects = suggestions;
        return merged;
      } catch (error) {
        console.error('AI analysis failed, returning basic analysis:', error);
        return { ...basicAnalysis, suggestedProjects: suggestions };
      }
    }
    
    return { ...basicAnalysis, suggestedProjects: suggestions };
  }

  performBasicAnalysis(jobDescription) {
    const analysis = {
      difficulty: this.assessDifficulty(jobDescription),
      requirements: this.extractRequirements(jobDescription),
      redFlags: this.findRedFlags(jobDescription),
      greenFlags: this.findGreenFlags(jobDescription),
      approach: '',
      successRate: this.calculateSuccessRate(jobDescription),
      proposalPoints: [],
      wordCount: jobDescription.split(/\s+/).length,
      estimatedReadTime: Math.ceil(jobDescription.split(/\s+/).length / 200),
      clarity: this.assessClarity(jobDescription)
    };
    
    return analysis;
  }

  assessDifficulty(jobDescription) {
    const desc = jobDescription.toLowerCase();
    
    // Check for complexity indicators
    const complexKeywords = ['complex', 'advanced', 'expert', 'senior', 'architect', 
                            'lead', 'principal', 'extensive experience'];
    const simpleKeywords = ['simple', 'basic', 'beginner', 'junior', 'entry-level', 
                           'straightforward', 'easy'];
    
    let complexityScore = 0;
    
    complexKeywords.forEach(keyword => {
      if (desc.includes(keyword)) complexityScore += 2;
    });
    
    simpleKeywords.forEach(keyword => {
      if (desc.includes(keyword)) complexityScore -= 2;
    });
    
    // Check technical requirements
    const techKeywords = ['api', 'database', 'architecture', 'scalable', 'microservices',
                         'machine learning', 'ai', 'blockchain', 'cloud', 'devops'];
    techKeywords.forEach(keyword => {
      if (desc.includes(keyword)) complexityScore += 1;
    });
    
    // Determine difficulty based on score
    if (complexityScore <= -2) return 'Easy';
    if (complexityScore <= 2) return 'Medium';
    if (complexityScore <= 6) return 'Hard';
    return 'Expert';
  }

  extractRequirements(jobDescription) {
    const requirements = [];
    const lines = jobDescription.split('\n');
    
    // Look for bullet points or numbered lists
    const requirementPatterns = [
      /^[-•*]\s+(.+)/,
      /^\d+[.)]\s+(.+)/,
      /^[a-z][.)]\s+(.+)/i,
      /requirement[s]?:(.+)/i,
      /must have:(.+)/i,
      /should have:(.+)/i,
      /skills?:(.+)/i
    ];
    
    lines.forEach(line => {
      requirementPatterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match && match[1]) {
          requirements.push(match[1].trim());
        }
      });
    });
    
    // If no structured requirements found, extract key phrases
    if (requirements.length === 0) {
      const keyPhrases = this.extractKeyPhrases(jobDescription);
      requirements.push(...keyPhrases.slice(0, 5));
    }
    
    return requirements;
  }

  extractKeyPhrases(text) {
    const phrases = [];
    const techTerms = [
      'JavaScript', 'Python', 'React', 'Node.js', 'Django', 'Flask',
      'Vue', 'Angular', 'TypeScript', 'GraphQL', 'REST API', 'MongoDB',
      'PostgreSQL', 'MySQL', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'
    ];
    
    techTerms.forEach(term => {
      if (text.includes(term)) {
        phrases.push(term);
      }
    });
    
    return phrases;
  }

  findRedFlags(jobDescription) {
    const flags = [];
    const desc = jobDescription.toLowerCase();
    
    this.redFlagKeywords.forEach(keyword => {
      if (desc.includes(keyword)) {
        flags.push(`Contains "${keyword}"`);
      }
    });
    
    // Check for unrealistic expectations
    if (desc.includes('10+ years') && desc.includes('entry level')) {
      flags.push('Unrealistic experience requirements');
    }
    
    // Check for vague descriptions
    if (jobDescription.length < 100) {
      flags.push('Very short description - may lack details');
    }
    
    // Check for missing budget
    if (!desc.includes('$') && !desc.includes('budget') && !desc.includes('hourly')) {
      flags.push('No budget information provided');
    }
    
    // Check for too many skills
    const skillCount = this.extractKeyPhrases(jobDescription).length;
    if (skillCount > 10) {
      flags.push('Requires too many different skills');
    }
    
    return flags;
  }

  findGreenFlags(jobDescription) {
    const flags = [];
    const desc = jobDescription.toLowerCase();
    
    this.greenFlagKeywords.forEach(keyword => {
      if (desc.includes(keyword)) {
        flags.push(`Mentions "${keyword}"`);
      }
    });
    
    // Check for clear structure
    if (jobDescription.includes('\n') && jobDescription.length > 200) {
      flags.push('Well-structured description');
    }
    
    // Check for budget clarity
    if (desc.includes('$') || desc.includes('budget:') || desc.includes('/hour')) {
      flags.push('Clear budget information');
    }
    
    // Check for project timeline
    if (desc.includes('timeline') || desc.includes('deadline') || desc.includes('duration')) {
      flags.push('Includes timeline information');
    }
    
    return flags;
  }

  calculateSuccessRate(jobDescription) {
    let score = 50; // Base score
    
    const redFlags = this.findRedFlags(jobDescription);
    const greenFlags = this.findGreenFlags(jobDescription);
    
    // Adjust based on flags
    score -= redFlags.length * 5;
    score += greenFlags.length * 7;
    
    // Adjust based on clarity
    const clarity = this.assessClarity(jobDescription);
    if (clarity === 'High') score += 10;
    if (clarity === 'Low') score -= 10;

    // Expertise boost: if job mentions these, increase suitability (we specialize here)
    const expertiseKeywords = [
      'cloudflare', 'akamai', 'imperva', 'anti-bot', 'captcha', 'login required',
      'javascript rendering', 'dynamic content', 'spa', 'react', 'vue', 'angular',
      'playwright', 'puppeteer', 'crawler', 'scraper', 'scraping', 'bypass'
    ];
    const text = jobDescription.toLowerCase();
    const hits = expertiseKeywords.filter(k => text.includes(k)).length;
    score += Math.min(12, hits * 3); // up to +12
    
    // Ensure score is within bounds
    score = Math.max(10, Math.min(90, score));
    
    return score;
  }

  assessClarity(jobDescription) {
    // Check for structure
    const hasLineBreaks = jobDescription.includes('\n');
    const hasBulletPoints = /[-•*]\s+/.test(jobDescription);
    const hasNumberedList = /\d+[.)]\s+/.test(jobDescription);
    
    // Check for appropriate length
    const wordCount = jobDescription.split(/\s+/).length;
    const isGoodLength = wordCount >= 50 && wordCount <= 500;
    
    // Check for sections
    const hasSections = /requirements?:|responsibilities?:|skills?:/i.test(jobDescription);
    
    let clarityScore = 0;
    if (hasLineBreaks) clarityScore++;
    if (hasBulletPoints || hasNumberedList) clarityScore++;
    if (isGoodLength) clarityScore++;
    if (hasSections) clarityScore++;
    
    if (clarityScore >= 3) return 'High';
    if (clarityScore >= 2) return 'Medium';
    return 'Low';
  }

  mergeAnalyses(basicAnalysis, aiAnalysis) {
    // Merge the basic and AI analyses, preferring AI when available
    return {
      difficulty: aiAnalysis.difficulty || basicAnalysis.difficulty,
      requirements: [...new Set([...(basicAnalysis.requirements || []), ...(aiAnalysis.requirements || [])])],
      redFlags: [...new Set([...(basicAnalysis.redFlags || []), ...(aiAnalysis.redFlags || [])])],
      greenFlags: [...new Set([...(basicAnalysis.greenFlags || []), ...(aiAnalysis.greenFlags || [])])],
      approach: aiAnalysis.approach || basicAnalysis.approach,
      successRate: aiAnalysis.successRate || basicAnalysis.successRate,
      proposalPoints: aiAnalysis.proposalPoints || basicAnalysis.proposalPoints,
      wordCount: basicAnalysis.wordCount,
      estimatedReadTime: basicAnalysis.estimatedReadTime,
      clarity: basicAnalysis.clarity
    };
  }

  // Generate concrete project suggestions based on job description and your Project Chimera phases
  generateSuggestedProjects(jobDescription) {
    if (!jobDescription || typeof jobDescription !== 'string') return [];
    const text = jobDescription.toLowerCase();

    const SUGGESTIONS = [
      {
        id: 'phase1',
        title: 'Ghost Protocol — Stealth Data Pipeline (Phase 1)',
        pitch: 'Stealth Playwright + RSS tabanlı iki aşamalı (Listener/Sniper) veri boru hattı. Cloudflare’a yakalanmadan sürekli ve güvenilir veri akışı.',
        keywords: ['scrape', 'scraping', 'crawler', 'crawl', 'rss', 'feed', 'playwright', 'selenium', 'automation', 'cloudflare', 'stealth', 'bypass'],
        deliverables: ['rss_listener.py', 'hunter.py (stealth Playwright)', 'chimera.db (jobs tablosu)', 'Doğrulama logları'],
        timeline: '3–5 gün'
      },
      {
        id: 'phase2',
        title: 'Heuristic Co‑Pilot — AI Analysis & Scoring (Phase 2)',
        pitch: 'Gemini ile ilanları JSON’a normalize eden “Brain” ve bütçe/müşteri/uyum faktörleriyle puanlayan “Strategist”. Günlük en iyi iş listesi.',
        keywords: ['gemini', 'llm', 'json', 'normalize', 'analysis', 'ranking', 'score', 'scoring', 'nlp', 'structure'],
        deliverables: ['brain.py (GeminiAnalyzer)', 'strategist.py (HeuristicScorer)', 'cli.py (Top N job brief)'],
        timeline: '5–7 gün'
      },
      {
        id: 'phase3',
        title: 'Learning Engine — ML Score + Proposal Assistant (Phase 3)',
        pitch: 'Geçmiş başarılardan öğrenen ML skoru ve kişisel stile göre AI teklif yazarı.',
        keywords: ['machine learning', 'ml', 'model', 'train', 'predict', 'randomforest', 'proposal', 'writer'],
        deliverables: ['ml_trainer.py (model)', 'strategist.py (ML skor)', 'proposal_assistant.py (AI teklif yazarı)'],
        timeline: '1–2 hafta'
      }
    ];

    // Score by keyword matches
    const scored = SUGGESTIONS.map(s => {
      const matches = (s.keywords || []).filter(k => text.includes(k));
      return {
        ...s,
        score: matches.length,
        whyFit: matches.length ? `İlanda geçen anahtarlar: ${matches.slice(0,5).join(', ')}` : ''
      };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

    return scored;
  }

  // Score a job based on various factors
  scoreJob(jobData) {
    let score = 0;
    const weights = {
      budget: 25,
      description: 20,
      client: 20,
      competition: 15,
      skills: 10,
      timeline: 10
    };
    
    // Budget score
    if (jobData.budget) {
      const budgetValue = this.extractBudgetValue(jobData.budget);
      if (budgetValue > 1000) score += weights.budget;
      else if (budgetValue > 500) score += weights.budget * 0.7;
      else if (budgetValue > 100) score += weights.budget * 0.4;
    }
    
    // Description score
    if (jobData.description) {
      const clarity = this.assessClarity(jobData.description);
      if (clarity === 'High') score += weights.description;
      else if (clarity === 'Medium') score += weights.description * 0.5;
    }
    
    // Client score
    if (jobData.clientRating) {
      const rating = parseFloat(jobData.clientRating);
      if (rating >= 4.8) score += weights.client;
      else if (rating >= 4.5) score += weights.client * 0.7;
      else if (rating >= 4.0) score += weights.client * 0.4;
    }
    
    // Competition score (lower is better)
    if (jobData.proposals) {
      const proposalCount = parseInt(jobData.proposals);
      if (proposalCount < 5) score += weights.competition;
      else if (proposalCount < 15) score += weights.competition * 0.6;
      else if (proposalCount < 30) score += weights.competition * 0.3;
    }
    
    // Skills match score
    if (jobData.skills && jobData.userSkills) {
      const matchRate = this.calculateSkillMatch(jobData.skills, jobData.userSkills);
      score += weights.skills * matchRate;
    }
    
    // Timeline score
    if (jobData.duration) {
      if (jobData.duration.toLowerCase().includes('long') || 
          jobData.duration.toLowerCase().includes('ongoing')) {
        score += weights.timeline;
      } else if (jobData.duration.toLowerCase().includes('month')) {
        score += weights.timeline * 0.6;
      }
    }
    
    return Math.round(score);
  }

  extractBudgetValue(budgetString) {
    const match = budgetString.match(/\$?([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(',', ''));
    }
    return 0;
  }

  calculateSkillMatch(requiredSkills, userSkills) {
    if (!requiredSkills || !userSkills) return 0;
    
    const required = requiredSkills.map(s => s.toLowerCase());
    const user = userSkills.map(s => s.toLowerCase());
    
    let matches = 0;
    required.forEach(skill => {
      if (user.includes(skill)) matches++;
    });
    
    return matches / required.length;
  }
}
