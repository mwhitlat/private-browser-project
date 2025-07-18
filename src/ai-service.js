const natural = require('natural');
const nlp = require('compromise');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

class AIService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.turndown = new TurndownService();
    this.summaryCache = new Map();
    this.speechSynthesis = null;
    this.currentSpeech = null;
    this.isSpeaking = false;
  }

  /**
   * Initialize speech synthesis
   */
  initSpeechSynthesis() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  /**
   * Speak text using browser's speech synthesis
   */
  speakText(text, options = {}) {
    if (!this.speechSynthesis) {
      this.initSpeechSynthesis();
    }

    if (!this.speechSynthesis) {
      console.warn('Speech synthesis not available');
      return false;
    }

    // Stop any current speech
    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set default options
    utterance.rate = options.rate || 0.9; // Slightly slower than default
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 0.8;
    utterance.lang = options.lang || 'en-US';

    // Set voice if specified
    if (options.voice) {
      utterance.voice = options.voice;
    } else {
      // Try to find a good default voice
      const voices = this.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Female') || voice.name.includes('Samantha'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    // Event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.currentSpeech = utterance;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentSpeech = null;
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      this.isSpeaking = false;
      this.currentSpeech = null;
    };

    this.speechSynthesis.speak(utterance);
    return true;
  }

  /**
   * Stop current speech
   */
  stopSpeaking() {
    if (this.speechSynthesis && this.isSpeaking) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentSpeech = null;
    }
  }

  /**
   * Get available voices
   */
  getAvailableVoices() {
    if (!this.speechSynthesis) {
      this.initSpeechSynthesis();
    }

    if (!this.speechSynthesis) {
      return [];
    }

    return this.speechSynthesis.getVoices().map(voice => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default
    }));
  }

  /**
   * Check if speech synthesis is supported
   */
  isSpeechSupported() {
    return typeof window !== 'undefined' && 
           window.speechSynthesis && 
           window.SpeechSynthesisUtterance;
  }

  /**
   * Extract main content from HTML
   */
  extractContent(html) {
    try {
      const $ = cheerio.load(html);
      
      // Remove script, style, and other non-content elements
      $('script, style, nav, header, footer, .ad, .advertisement, .sidebar, .comments').remove();
      
      // Try to find main content areas
      let content = '';
      const selectors = [
        'article',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content',
        'main',
        '.main-content'
      ];
      
      for (const selector of selectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }
      
      // Fallback to body if no main content found
      if (!content) {
        content = $('body').text();
      }
      
      return this.cleanText(content);
    } catch (error) {
      console.error('Error extracting content:', error);
      return '';
    }
  }

  /**
   * Clean and normalize text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit text length
  }

  /**
   * Generate a summary using TF-IDF and key phrase extraction
   */
  generateSummary(text, length = 'medium') {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(text + '_' + length);
      if (this.summaryCache.has(cacheKey)) {
        return this.summaryCache.get(cacheKey);
      }

      // Process text with compromise
      const doc = nlp(text);
      
      // Extract sentences
      const sentences = doc.sentences().out('array');
      
      // Determine max sentences based on length preference
      let maxSentences;
      switch (length) {
        case 'short':
          maxSentences = 2;
          break;
        case 'long':
          maxSentences = 6;
          break;
        default: // medium
          maxSentences = 4;
      }
      
      if (sentences.length <= maxSentences) {
        return sentences.join(' ');
      }

      // Calculate sentence importance using TF-IDF
      this.tfidf.addDocument(text);
      
      const sentenceScores = sentences.map((sentence, index) => {
        const words = this.tokenizer.tokenize(sentence.toLowerCase());
        let sentenceScore = 0;
        
        words.forEach(word => {
          if (word) {
            const tfidfScore = this.tfidf.tfidf(word, 0);
            sentenceScore += tfidfScore;
          }
        });
        
        return { sentence, score: sentenceScore, index };
      });
      
      // Sort by score and take top sentences
      sentenceScores.sort((a, b) => b.score - a.score);
      const topSentences = sentenceScores.slice(0, maxSentences);
      
      // Sort back by original order
      topSentences.sort((a, b) => a.index - b.index);
      
      const summary = topSentences.map(item => item.sentence).join(' ');
      
      // Cache the result
      this.summaryCache.set(cacheKey, summary);
      
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return text.substring(0, 200) + '...';
    }
  }

  /**
   * Generate cache key for text
   */
  generateCacheKey(text) {
    return text.substring(0, 100).replace(/\s+/g, '');
  }

  /**
   * Calculate readability score using Flesch Reading Ease
   */
  calculateReadabilityScore(text) {
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = this.tokenizer.tokenize(text);
      
      const sentenceCount = sentences.length;
      const wordCount = words.length;
      
      if (sentenceCount === 0 || wordCount === 0) {
        return {
          score: 0,
          category: 'Unknown',
          wordCount: 0,
          sentenceCount: 0,
          averageWordsPerSentence: 0
        };
      }
      
      // Count syllables (simplified)
      let syllableCount = 0;
      words.forEach(word => {
        // Add comprehensive null/undefined check for word
        if (!word || typeof word !== 'string') {
          syllableCount += 1; // Default to 1 syllable for undefined/null words
          return;
        }
        
        // Ensure word is a string and has content before processing
        const wordStr = String(word).trim();
        if (!wordStr) {
          syllableCount += 1;
          return;
        }
        
        const cleanWord = wordStr.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length <= 3) {
          syllableCount += 1;
        } else {
          // Simple syllable counting
          const vowels = cleanWord.match(/[aeiouy]+/g);
          syllableCount += vowels ? vowels.length : 1;
        }
      });
      
      // Flesch Reading Ease formula
      const fleschScore = 206.835 - (1.015 * (wordCount / sentenceCount)) - (84.6 * (syllableCount / wordCount));
      
      // Convert to a 0-100 scale and categorize
      let score = Math.max(0, Math.min(100, fleschScore));
      let category;
      
      if (score >= 90) category = 'Very Easy';
      else if (score >= 80) category = 'Easy';
      else if (score >= 70) category = 'Fairly Easy';
      else if (score >= 60) category = 'Standard';
      else if (score >= 50) category = 'Fairly Difficult';
      else if (score >= 30) category = 'Difficult';
      else category = 'Very Difficult';
      
      return {
        score: Math.round(score),
        category,
        wordCount,
        sentenceCount,
        averageWordsPerSentence: Math.round((wordCount / sentenceCount) * 10) / 10
      };
    } catch (error) {
      console.error('Error calculating readability score:', error);
      return {
        score: 0,
        category: 'Unknown',
        wordCount: 0,
        sentenceCount: 0,
        averageWordsPerSentence: 0
      };
    }
  }

  /**
   * Analyze political bias in content
   */
  analyzeBias(text) {
    try {
      const lowerText = text.toLowerCase();
      
      // Conservative/Republican indicators
      const conservativeTerms = [
        'conservative', 'republican', 'gop', 'trump', 'biden', 'democrat', 'liberal',
        'freedom', 'liberty', 'patriot', 'america first', 'traditional values',
        'free market', 'capitalism', 'constitution', 'second amendment', 'pro-life',
        'religious freedom', 'small government', 'tax cuts', 'deregulation',
        'border security', 'immigration', 'law and order', 'military', 'veterans'
      ];
      
      // Liberal/Democrat indicators
      const liberalTerms = [
        'liberal', 'democrat', 'progressive', 'socialist', 'biden', 'harris',
        'climate change', 'environmental', 'social justice', 'equality', 'diversity',
        'inclusion', 'lgbtq', 'reproductive rights', 'gun control', 'healthcare',
        'medicare', 'social security', 'education', 'student loans', 'minimum wage',
        'workers rights', 'unions', 'immigration reform', 'path to citizenship'
      ];
      
      // Neutral/balanced indicators
      const neutralTerms = [
        'bipartisan', 'compromise', 'moderate', 'centrist', 'independent',
        'fact-check', 'analysis', 'research', 'study', 'data', 'evidence',
        'balanced', 'objective', 'unbiased', 'fair', 'accurate'
      ];
      
      let conservativeScore = 0;
      let liberalScore = 0;
      let neutralScore = 0;
      
      conservativeTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        conservativeScore += matches;
      });
      
      liberalTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        liberalScore += matches;
      });
      
      neutralTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        neutralScore += matches;
      });
      
      const totalScore = conservativeScore + liberalScore + neutralScore;
      
      if (totalScore === 0) {
        return { bias: 'neutral', confidence: 0, scores: { conservative: 0, liberal: 0, neutral: 0 } };
      }
      
      const conservativePercent = (conservativeScore / totalScore) * 100;
      const liberalPercent = (liberalScore / totalScore) * 100;
      const neutralPercent = (neutralScore / totalScore) * 100;
      
      let bias;
      let confidence;
      
      if (neutralPercent > 50) {
        bias = 'neutral';
        confidence = neutralPercent;
      } else if (conservativePercent > liberalPercent) {
        bias = 'conservative';
        confidence = conservativePercent;
      } else if (liberalPercent > conservativePercent) {
        bias = 'liberal';
        confidence = liberalPercent;
      } else {
        bias = 'neutral';
        confidence = neutralPercent;
      }
      
      return {
        bias,
        confidence: Math.round(confidence),
        scores: {
          conservative: Math.round(conservativePercent),
          liberal: Math.round(liberalPercent),
          neutral: Math.round(neutralPercent)
        }
      };
    } catch (error) {
      console.error('Error analyzing bias:', error);
      return { bias: 'neutral', confidence: 0, scores: { conservative: 0, liberal: 0, neutral: 0 } };
    }
  }

  /**
   * Analyze emotional tone of content
   */
  analyzeEmotionalTone(text) {
    try {
      const lowerText = text.toLowerCase();
      
      // Positive/optimistic indicators
      const positiveTerms = [
        'happy', 'joy', 'excited', 'amazing', 'wonderful', 'fantastic', 'great',
        'excellent', 'brilliant', 'inspiring', 'hopeful', 'optimistic', 'positive',
        'success', 'achievement', 'victory', 'win', 'breakthrough', 'innovation',
        'progress', 'improvement', 'growth', 'opportunity', 'future', 'bright',
        'love', 'care', 'support', 'community', 'together', 'unity', 'peace'
      ];
      
      // Negative/pessimistic indicators
      const negativeTerms = [
        'sad', 'angry', 'furious', 'terrible', 'awful', 'horrible', 'disaster',
        'crisis', 'catastrophe', 'failure', 'defeat', 'loss', 'problem', 'issue',
        'worry', 'fear', 'anxiety', 'stress', 'depression', 'hopeless', 'despair',
        'doom', 'gloom', 'dark', 'evil', 'hate', 'violence', 'death', 'kill',
        'destroy', 'corrupt', 'scandal', 'corruption', 'greed', 'selfish'
      ];
      
      // Neutral/balanced indicators
      const neutralTerms = [
        'fact', 'data', 'information', 'report', 'study', 'research', 'analysis',
        'objective', 'balanced', 'fair', 'accurate', 'truth', 'reality', 'evidence',
        'statistics', 'numbers', 'results', 'findings', 'conclusion', 'summary'
      ];
      
      let positiveScore = 0;
      let negativeScore = 0;
      let neutralScore = 0;
      
      positiveTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        positiveScore += matches;
      });
      
      negativeTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        negativeScore += matches;
      });
      
      neutralTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        neutralScore += matches;
      });
      
      const totalScore = positiveScore + negativeScore + neutralScore;
      
      if (totalScore === 0) {
        return { tone: 'neutral', confidence: 0, scores: { positive: 0, negative: 0, neutral: 0 } };
      }
      
      const positivePercent = (positiveScore / totalScore) * 100;
      const negativePercent = (negativeScore / totalScore) * 100;
      const neutralPercent = (neutralScore / totalScore) * 100;
      
      let tone;
      let confidence;
      
      if (neutralPercent > 50) {
        tone = 'neutral';
        confidence = neutralPercent;
      } else if (positivePercent > negativePercent) {
        tone = 'positive';
        confidence = positivePercent;
      } else if (negativePercent > positivePercent) {
        tone = 'negative';
        confidence = negativePercent;
      } else {
        tone = 'neutral';
        confidence = neutralPercent;
      }
      
      return {
        tone,
        confidence: Math.round(confidence),
        scores: {
          positive: Math.round(positivePercent),
          negative: Math.round(negativePercent),
          neutral: Math.round(neutralPercent)
        }
      };
    } catch (error) {
      console.error('Error analyzing emotional tone:', error);
      return { tone: 'neutral', confidence: 0, scores: { positive: 0, negative: 0, neutral: 0 } };
    }
  }

  /**
   * Analyze content and return comprehensive insights
   */
  analyzeContent(content, options = {}) {
    const {
      enableSummary = true,
      enableReadingTime = true,
      enableKeyPoints = true,
      enableReadability = true,
      enableTopics = true,
      enableBiasAnalysis = true,
      enableEmotionalTone = true,
      summaryLength = 'medium'
    } = options;
    
    // Handle both HTML and plain text content
    let cleanContent;
    if (typeof content === 'string') {
      if (content.includes('<') && content.includes('>')) {
        // HTML content - extract text
        cleanContent = this.extractContent(content);
      } else {
        // Plain text content
        cleanContent = this.cleanText(content);
      }
    } else {
      cleanContent = this.cleanText(String(content));
    }
    
    // Check if we have enough content
    if (cleanContent.length < 50) {
      return null;
    }
    
    const analysis = {};
    
    if (enableSummary) {
      analysis.summary = this.generateSummary(cleanContent, summaryLength);
    }
    
    if (enableReadingTime) {
      analysis.readingTime = this.calculateReadingTime(cleanContent);
      analysis.readingTimeMinutes = this.estimateReadingTime(cleanContent);
    }
    
    if (enableKeyPoints) {
      analysis.keyPoints = this.extractKeyPoints(cleanContent);
    }
    
    if (enableReadability) {
      analysis.readability = this.calculateReadabilityScore(cleanContent);
    }
    
    if (enableTopics) {
      analysis.topics = this.extractTopics(cleanContent);
    }
    
    if (enableBiasAnalysis) {
      analysis.bias = this.analyzeBias(cleanContent);
    }
    
    if (enableEmotionalTone) {
      analysis.emotionalTone = this.analyzeEmotionalTone(cleanContent);
    }
    
    analysis.wordCount = this.tokenizer.tokenize(cleanContent).length;
    analysis.hasContent = cleanContent.length > 100;
    
    return analysis;
  }

  /**
   * Calculate reading time in minutes
   */
  calculateReadingTime(text) {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.tokenizer.tokenize(text).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Estimate reading time in minutes
   */
  estimateReadingTime(text) {
    return this.calculateReadingTime(text);
  }

  /**
   * Extract key points from text
   */
  extractKeyPoints(text) {
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const keyPoints = [];
      
      // Simple key point extraction based on sentence length and keywords
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && trimmed.length < 200) {
          const lowerSentence = trimmed.toLowerCase();
          const hasKeyWords = [
            'important', 'key', 'main', 'primary', 'essential', 'critical',
            'significant', 'major', 'crucial', 'vital', 'fundamental'
          ].some(word => lowerSentence.includes(word));
          
          if (hasKeyWords || trimmed.length > 50) {
            keyPoints.push(trimmed);
          }
        }
      });
      
      return keyPoints.slice(0, 5); // Limit to 5 key points
    } catch (error) {
      console.error('Error extracting key points:', error);
      return [];
    }
  }

  /**
   * Extract topics from text
   */
  extractTopics(text) {
    try {
      const words = this.tokenizer.tokenize(text.toLowerCase());
      const wordFreq = {};
      
      // Count word frequency (excluding common words)
      const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
      ]);
      
      words.forEach(word => {
        if (word && word.length > 3 && !stopWords.has(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
      
      // Get top topics
      const topics = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
      
      return topics;
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.summaryCache.clear();
  }
}

module.exports = AIService; 