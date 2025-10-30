import React, { useState, useEffect } from 'react';
import { ChatLayout } from './components/conversation/ChatLayout';
import { ChatInput } from './components/conversation/ChatInput';
import { ConversationMessage } from './components/conversation/ConversationMessage';
import { AgenticThinking } from './components/conversation/AgenticThinking';
import { QueryConstructor } from './components/conversation/QueryConstructor';
import { ProgressiveEntityCollector } from './components/conversation/ProgressiveEntityCollector';
import { NewsCards } from './components/results/NewsCards';
import { FAQCard } from './components/results/FAQCard';
import { ContentViewer } from './components/conversation/ContentViewer';
import { InlineReasoning } from './components/conversation/InlineReasoning';
import { ChevronRight } from 'lucide-react';
import { dummyPlans, dummyCounties, dummyNews, dummyReasoningSteps } from './data/dummyData';
import { API_BASE_URL } from './config';
import { configService } from './services/configService';

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: React.ReactNode;
}

interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
  substeps?: ThinkingStep[];
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [collectedEntities, setCollectedEntities] = useState<Record<string, any>>({});
  const [currentEntityIndex, setCurrentEntityIndex] = useState(0);
  const [missingEntities, setMissingEntities] = useState<string[]>([]);
  const [contentViewerOpen, setContentViewerOpen] = useState(false);
  const [viewerContent, setViewerContent] = useState<any>(null);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [evidenceSteps, setEvidenceSteps] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    setMessages([{
      id: '0',
      type: 'agent',
      content: (
        <div className="space-y-3">
          <p className="text-gray-700">
            Hi! I'm your Health Insurance Copilot. I can help you:
          </p>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#2563EB] mt-0.5">•</span>
              <span>Find and compare health insurance plans</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2563EB] mt-0.5">•</span>
              <span>Check coverage details and benefits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2563EB] mt-0.5">•</span>
              <span>Search for in-network providers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2563EB] mt-0.5">•</span>
              <span>Explain insurance terms and concepts</span>
            </li>
          </ul>
          <p className="text-gray-500 text-sm">
            Try asking a question or click one of the suggestions below.
          </p>
        </div>
      )
    }]);
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: <div>{text}</div>
    };
    setMessages(prev => [...prev, userMessage]);

    // Reset state for new query
    setCollectedEntities({});
    setCurrentEntityIndex(0);
    setMissingEntities([]);

    // Start agentic thinking
    const thinkingId = (Date.now() + 1).toString();
    const intent = detectIntent(text);

    const thinkingMessage: Message = {
      id: thinkingId,
      type: 'agent',
      content: <AgenticThinking steps={getInitialThinkingSteps(intent)} />
    };
    setMessages(prev => [...prev, thinkingMessage]);
    setActiveMessageId(thinkingId);

    // Call backend to detect intent and extract entities
    setTimeout(async () => {
      updateThinkingStep(thinkingId, 'intent', 'complete');
      updateThinkingStep(thinkingId, 'entities', 'active');

      try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, query: text })
        });

        const data = await response.json();

        // DEBUG: Log backend response
        console.log('=== DEBUG: Backend Response ===');
        console.log('Intent:', intent);
        console.log('Requires input:', data.requires_input);
        console.log('Next question:', data.next_question);
        console.log('Collected entities:', data.collected_entities);
        console.log('Status:', data.status);

        if (!sessionId) setSessionId(data.session_id);

        updateThinkingStep(thinkingId, 'entities', 'complete');

        // Check if backend requires any more information
        if (data.requires_input && data.next_question) {
          console.log('Backend requires input! Starting entity collection...');
          // Backend is asking for more info - trust the backend's determination
          // Don't try to filter entities on frontend, backend knows what's needed
          updateThinkingStep(thinkingId, 'collection', 'active');

          // Show the question from backend
          setMessages(prev => [...prev, {
            id: thinkingId + '-question',
            type: 'agent',
            content: <div className="text-gray-700">{data.response}</div>
          }]);

          // Fetch ONLY the required entities for THIS specific intent
          configService.getRequiredEntities(intent).then(requiredForIntent => {
            const missing = requiredForIntent.filter(e => !data.collected_entities[e]);
            setMissingEntities(missing);

            // Start collecting the first missing entity
            if (missing.length > 0) {
              startEntityCollection(thinkingId, intent, missing, data.session_id);
            }
          }).catch(error => {
            console.error('Error fetching entity configuration:', error);
            // Fallback: trust backend's determination
            // Backend already calculated what's missing, so we don't add more
            console.log('Using backend-provided missing entities');
          });
        } else if (data.status === 'complete' && data.search_results) {
          // Backend has completed AND returned search results - use them directly!
          console.log('✅ Backend returned search results:', data.search_results);
          console.log('✅ Search results count:', data.search_results.length);
          console.log('✅ Intent:', intent);
          updateThinkingStep(thinkingId, 'collection', 'complete');
          updateThinkingStep(thinkingId, 'query', 'complete');
          updateThinkingStep(thinkingId, 'search', 'complete');
          
          // Show results immediately without another API call
          showResultsFromSearch(thinkingId, intent, data.search_results, data.collected_entities, text);
        } else if (data.status === 'complete') {
          // Backend completed but no results yet - fetch them
          console.log('⚠️ Backend completed but NO search_results in response');
          console.log('⚠️ Full response data:', data);
          updateThinkingStep(thinkingId, 'collection', 'complete');
          performSearch(thinkingId, intent, data.session_id);
        } else {
          // No collection needed, proceed to search
          console.log('ℹ️ No entity collection needed, proceeding to search...');
          console.log('ℹ️ Data status:', data.status);
          updateThinkingStep(thinkingId, 'collection', 'complete');
          performSearch(thinkingId, intent, data.session_id);
        }
      } catch (error) {
        console.error('Backend error:', error);
        setMessages(prev => prev.filter(msg => msg.id !== thinkingId));
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'agent',
          content: <div className="text-red-600">Error connecting to backend at {API_BASE_URL}</div>
        }]);
        setActiveMessageId(null);
      }
    }, 500);
  };

  const detectIntent = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('compare')) return 'Comparison';
    if (lower.includes('provider') || lower.includes('doctor') || lower.includes('dr.')) return 'ProviderNetwork';
    if (lower.includes('news') || lower.includes('latest') || lower.includes('update')) return 'News';
    if (lower.includes('explain') || lower.includes('what is') || lower.includes('define')) return 'FAQ';
    if (lower.includes('cover')) return 'CoverageDetail';
    return 'PlanInfo';
  };

  const getInitialThinkingSteps = (intent: string): ThinkingStep[] => [
    { id: 'intent', label: `Detected intent: ${intent}`, status: 'active' },
    { 
      id: 'entities', 
      label: 'Extracting entities from query', 
      status: 'pending',
      substeps: [
        { id: 'parse', label: 'Parsing query structure', status: 'pending' },
        { id: 'identify', label: 'Identifying missing information', status: 'pending' }
      ]
    },
    { id: 'collection', label: 'Gathering required information', status: 'pending' },
    { id: 'query', label: 'Constructing search query', status: 'pending' },
    { id: 'search', label: 'Searching verified sources', status: 'pending' }
  ];

  const updateThinkingStep = (messageId: string, stepId: string, status: 'active' | 'complete') => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      
      const updateSteps = (steps: ThinkingStep[]): ThinkingStep[] => {
        return steps.map(step => {
          if (step.id === stepId) {
            return { ...step, status };
          }
          if (step.substeps) {
            return { ...step, substeps: updateSteps(step.substeps) };
          }
          return step;
        });
      };

      const currentSteps = (msg.content as any)?.props?.steps || [];
      return {
        ...msg,
        content: <AgenticThinking steps={updateSteps(currentSteps)} />
      };
    }));
  };

  const startEntityCollection = (messageId: string, intent: string, missing: string[], session: string) => {
    setMessages(prev => [...prev, {
      id: messageId + '-collect',
      type: 'agent',
      content: (
        <ProgressiveEntityCollector
          entityType={missing[0]}
          onCollect={(value) => handleEntityValue(messageId, intent, missing[0], value, session)}
          plans={dummyPlans}
          counties={dummyCounties}
        />
      )
    }]);
  };

  const handleEntityValue = async (messageId: string, intent: string, entityType: string, value: any, session: string) => {
    const newCollected = { ...collectedEntities, [entityType]: value };
    setCollectedEntities(newCollected);

    // Remove the entity collector message
    setMessages(prev => prev.filter(msg => msg.id !== messageId + '-collect'));

    // Send the collected value to backend
    const valueStr = entityType === 'age' || entityType === 'income'
      ? String(value)
      : entityType === 'county'
        ? value.name || value
        : String(value);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session,
          query: valueStr
        })
      });

      const data = await response.json();

      console.log('=== Entity collected, backend response ===');
      console.log('Requires input:', data.requires_input);
      console.log('Status:', data.status);
      console.log('Collected entities:', data.collected_entities);

      // Update collected entities from backend
      setCollectedEntities(data.collected_entities);

      // Check if backend needs more info or is ready to search
      if (data.requires_input) {
        // Backend explicitly says it needs more input - TRUST IT!
        console.log('Backend requires more input, waiting for next entity...');
        
        // Show the backend's response/question
        setMessages(prev => [...prev, {
          id: messageId + '-ack-' + Date.now(),
          type: 'agent',
          content: <div className="text-gray-700">{data.response}</div>
        }]);

        // Determine what's still missing - check only required entities for THIS intent
        configService.getRequiredEntities(intent).then(requiredForIntent => {
          const stillMissing = requiredForIntent.filter(e => !data.collected_entities[e]);
          
          console.log('Required for intent:', requiredForIntent);
          console.log('Still missing:', stillMissing);

          if (stillMissing.length > 0) {
            setMissingEntities(stillMissing);
            // Ask for next entity
            setTimeout(() => {
              setMessages(prev => [...prev, {
                id: messageId + '-collect',
                type: 'agent',
                content: (
                  <ProgressiveEntityCollector
                    entityType={stillMissing[0]}
                    onCollect={(value) => handleEntityValue(messageId, intent, stillMissing[0], value, session)}
                    plans={dummyPlans}
                  counties={dummyCounties}
                />
              )
            }]);
          }, 500);
          } else {
            // Frontend thinks we have everything, but backend says requires_input
            // This means backend knows about something we don't - trust the backend!
            console.warn('⚠️ Frontend thinks all entities collected but backend says requires_input!');
            console.warn('⚠️ Trusting backend - NOT calling performSearch');
            // Don't call performSearch - wait for backend to tell us it's complete
          }
        }).catch(error => {
          console.error('Error fetching required entities:', error);
        });
      } else {
        // Backend is done collecting (requires_input = false), perform search
        console.log('Backend says no more input needed! Performing search...');
        updateThinkingStep(messageId, 'collection', 'complete');
        performSearch(messageId, intent, session);
      }
    } catch (error) {
      console.error('Error sending entity to backend:', error);
    }
  };

  const performSearch = async (messageId: string, intent: string, session: string) => {
    console.log('🔍 performSearch called - Intent:', intent, 'Session:', session);
    updateThinkingStep(messageId, 'query', 'active');

    // Build query string with only collected entities (no undefined values)
    const queryParts: string[] = [];
    if (collectedEntities.age) queryParts.push(`age:${collectedEntities.age}`);
    if (collectedEntities.income) queryParts.push(`income:${collectedEntities.income}`);
    if (collectedEntities.county) {
      const countyName = typeof collectedEntities.county === 'object' ? collectedEntities.county.name : collectedEntities.county;
      queryParts.push(`county:"${countyName}"`);
    }

    const queryString = queryParts.length > 0
      ? `search(${queryParts.join(', ')}) site:healthcare.gov`
      : `search(health insurance) site:healthcare.gov`;

    setMessages(prev => [...prev, {
      id: messageId + '-query',
      type: 'agent',
      content: <QueryConstructor query={queryString} isConstructing={true} />
    }]);

    setTimeout(() => {
      updateThinkingStep(messageId, 'query', 'complete');
      updateThinkingStep(messageId, 'search', 'active');

      console.log('🔍 Fetching session data from backend...');
      // Get search results from backend (they're already there)
      fetch(`${API_BASE_URL}/session/${session}`)
        .then(res => res.json())
        .then(sessionData => {
          console.log('🔍 Session data received:', sessionData);
          setTimeout(() => {
            updateThinkingStep(messageId, 'search', 'complete');
            setMessages(prev => prev.filter(msg => msg.id !== messageId + '-query'));

            // Check if we have search results from backend
            const lastMessage = sessionData.conversation_history[sessionData.conversation_history.length - 1];
            const searchResults = lastMessage?.search_results;
            const collectedEntities = sessionData.collected_entities || {};
            
            console.log('🔍 Last message from session:', lastMessage);
            console.log('🔍 Search results from session:', searchResults);
            console.log('🔍 Collected entities from session:', collectedEntities);

            if (searchResults && searchResults.length > 0) {
              console.log('🔍 Found search results, displaying them');
              // Transform You.com results into insurance plan format for display
              showResultsFromSearch(messageId, intent, searchResults, collectedEntities);
            } else {
              console.log('🔍 No search results found, showing empty state');
              // No results, show empty state
              showResultsFromSearch(messageId, intent, [], collectedEntities);
            }
          }, 1000);
        })
        .catch(error => {
          console.error('❌ Error fetching session:', error);
          showResultsFromSearch(messageId, intent, [], {});
        });
    }, 800);
  };

  const showResultsFromSearch = (messageId: string, intent: string, searchResults: any[], collectedEntities: any = {}, originalQuery: string = '') => {
    // Remove thinking message
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    let resultContent: React.ReactNode;
    let reasoningSteps: any[] = [];
    let evidenceStepsToShow: any[] = [];
    
    console.log('DEBUG showResultsFromSearch - collectedEntities:', collectedEntities);

    // Handle different intents with specialized components
    if (intent === 'News') {
      console.log('News Intent - searchResults:', searchResults);
      console.log('News Intent - searchResults.length:', searchResults.length);
      
      // Transform search results to news article format
      const newsArticles = searchResults.length > 0 ? searchResults.map((result: any) => {
        try {
          const urlObj = new URL(result.url);
          return {
            headline: result.title || 'Untitled Article',
            source: urlObj.hostname.replace('www.', ''),
            date: 'Recent',
            summary: result.description || result.snippets?.[0] || 'No description available',
            url: result.url
          };
        } catch (e) {
          return {
            headline: result.title || 'Untitled Article',
            source: 'Unknown Source',
            date: 'Recent',
            summary: result.description || 'No description available',
            url: result.url || '#'
          };
        }
      }) : dummyNews;
      
      // Generate reasoning steps based on actual search
      reasoningSteps = searchResults.length > 0 ? [
        {
          id: '1',
          label: 'Intent Detection',
          description: `Identified your query as a News search about "${collectedEntities.topic || 'health insurance'}" for ${collectedEntities.year || 'recent'} articles.`
        },
        {
          id: '2',
          label: 'Information Gathering',
          description: `Collected required information: Topic (${collectedEntities.topic}), Year (${collectedEntities.year})${collectedEntities.state ? `, State (${collectedEntities.state})` : ''}.`
        },
        {
          id: '3',
          label: 'Search Execution',
          description: `Queried You.com API for relevant health insurance news articles matching your criteria.`
        },
        {
          id: '4',
          label: 'Results Retrieved',
          description: `Found ${searchResults.length} relevant news articles from verified sources. Filtered and ranked by relevance.`
        }
      ] : dummyReasoningSteps.news;
      
      console.log('News Intent - Using:', searchResults.length > 0 ? 'REAL SEARCH RESULTS' : 'DUMMY DATA');
      resultContent = (
        <div className="space-y-6">
          <div className="text-gray-700">
            {searchResults.length > 0 ? (
              <p>Found <span className="font-semibold text-gray-900">{searchResults.length}</span> recent articles about <span className="font-semibold text-gray-900">{collectedEntities.topic}</span>:</p>
            ) : (
              <p>Here's the latest health insurance news:</p>
            )}
          </div>
          
          <NewsCards 
            articles={newsArticles}
            onArticleClick={async (idx) => {
              const article = newsArticles[idx];
              const originalResult = searchResults[idx];
              if (article && article.url) {
                // Open viewer with initial data
                setViewerContent({
                  type: 'news',
                  title: article.headline,
                  headline: article.headline,
                  source: article.source,
                  url: article.url,
                  date: article.date || originalResult?.page_age || 'Recent',
                  content: article.summary,
                  snippets: originalResult?.snippets || [],
                  authors: originalResult?.authors || [],
                  thumbnail: originalResult?.thumbnail_url,
                  loading: true,
                  enhancedSummary: null,
                  keyPoints: null
                });
                setContentViewerOpen(true);
                
                // Enhance article content with Gemini in background
                try {
                  console.log('Enhancing article with AI...');
                  const response = await fetch(`${API_BASE_URL}/enhance-article`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: article.headline,
                      description: article.summary,
                      snippets: originalResult?.snippets || [],
                      source: article.source
                    })
                  });
                  const data = await response.json();
                  
                  if (data.status === 'success' || data.status === 'partial') {
                    console.log('Article enhanced successfully');
                    // Update viewer with enhanced content
                    setViewerContent((prev: any) => prev ? {
                      ...prev,
                      loading: false,
                      enhancedSummary: data.summary,
                      keyPoints: data.key_points || [],
                      insights: data.insights
                    } : null);
                  } else {
                    setViewerContent((prev: any) => prev ? { ...prev, loading: false } : null);
                  }
                } catch (error) {
                  console.error('Error enhancing article:', error);
                  setViewerContent((prev: any) => prev ? { ...prev, loading: false } : null);
                }
              }
            }}
          />
          
          <InlineReasoning steps={reasoningSteps} />
        </div>
      );
    } else if (intent === 'FAQ') {
      const topic = collectedEntities.topic || 'Health Insurance';
      
      // Generate reasoning based on actual search
      reasoningSteps = searchResults.length > 0 ? [
        { id: '1', label: 'Detected intent', description: 'FAQ' },
        { id: '2', label: 'Identified topic', description: topic },
        { id: '3', label: 'Searched verified sources', description: `Found ${searchResults.length} authoritative sources` },
        { id: '4', label: 'Prepared answer', description: 'Extracted clean definition from authoritative sources' }
      ] : dummyReasoningSteps.faq;

      resultContent = (
        <div className="space-y-6">
          <FAQCard
            topic={topic}
            searchResults={searchResults}
            onViewerOpen={(briefDefinition) => {
              // Show loading state in viewer
              setViewerContent({
                type: 'faq',
                topic: topic,
                definition: briefDefinition,
                explanation: '',
                example: '',
                keyPoints: [],
                relatedTopics: [],
                sources: [],
                loading: true
              });
              setContentViewerOpen(true);

              // Synthesize full answer in background
              fetch(`${API_BASE_URL}/synthesize-faq`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic: topic,
                  search_results: searchResults
                })
              })
                .then(response => response.json())
                .then(data => {
                  if (data.status === 'success') {
                    setViewerContent({
                      type: 'faq',
                      topic: data.topic,
                      definition: data.definition,
                      explanation: data.explanation,
                      example: data.example,
                      keyPoints: data.key_points || [],
                      relatedTopics: data.related_topics || [],
                      sources: data.sources || [],
                      loading: false
                    });
                  }
                })
                .catch(error => {
                  console.error('Error synthesizing FAQ:', error);
                  setViewerContent((prev: any) => prev ? { ...prev, loading: false } : null);
                });
            }}
          />
          <InlineReasoning steps={reasoningSteps} />
        </div>
      );
    } else {
      // General intent - use combined dataset + API search with AI summarization
      const resultsMessageId = messageId + '-results';
      
      resultContent = (
        <div className="space-y-8">
          <p className="text-gray-700">
            Searching datasets and web sources for comprehensive information...
          </p>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      );
      
      // Call the new /search-general endpoint asynchronously
      setTimeout(() => {
        fetch(`${API_BASE_URL}/search-general`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: originalQuery || 'health insurance',
            entities: collectedEntities
          })
        })
          .then(response => response.json())
          .then(data => {
            console.log('General search response:', data);
            if (data.status === 'success' || data.status === 'partial') {
              // Analyze the data to determine best UI presentation
              const hasMultiplePlans = data.raw_results?.dataset_results?.filter((r: any) => r.type === 'plan').length > 1;
              const isComparison = originalQuery.toLowerCase().includes('compare') || hasMultiplePlans;
              
              // Update the message with clean, professional UI
              const synthesizedContent = (
                <div className="space-y-6">
                  {/* Main Answer Card - Clean white card like FAQ */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-6">
                      <div className="text-base text-gray-800 leading-relaxed space-y-4">
                        {data.summary.split('\n\n').map((para: string, idx: number) => (
                          <p key={idx}>{para}</p>
                        ))}
                      </div>
                    </div>

                    {/* View Details CTA */}
                    <button
                      onClick={() => {
                        setViewerContent({
                          type: 'sources',
                          title: 'Detailed Information & Sources',
                          sources: data.sources,
                          raw_results: data.raw_results,
                          summary: data.summary,
                          key_findings: data.key_findings,
                          recommendations: data.recommendations
                        });
                        setContentViewerOpen(true);
                      }}
                      className="w-full px-6 py-3 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 transition-colors group flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-700 font-medium">
                        View detailed breakdown, pricing, and all sources
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </button>
                  </div>

                  {/* Comparison Table - if multiple plans detected */}
                  {isComparison && data.raw_results?.dataset_results && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">Quick Comparison</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Plan Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Monthly Premium</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Deductible</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {data.raw_results.dataset_results.filter((r: any) => r.type === 'plan').slice(0, 5).map((result: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900 text-sm">{result.data.plan_marketing_name || result.data.plan_name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{result.data.issuer_name || result.data.insurer}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs text-gray-600">
                                    {result.data.metal_level || result.data.metal_tier} {result.data.plan_type}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-medium text-gray-900">
                                    ${result.data.monthly_premium_adult_40 || result.data.premium_avg_40yr || 'N/A'}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-1">/month</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  ${result.data.deductible_individual_in_network || result.data.deductible_individual || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => {
                                      setViewerContent({
                                        type: 'plan',
                                        title: result.data.plan_marketing_name || result.data.plan_name,
                                        data: result.data,
                                        sources: data.sources
                                      });
                                      setContentViewerOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );

              // Replace the loading message with actual results
              setMessages(prev => prev.map(msg => 
                msg.id === resultsMessageId ? { ...msg, content: synthesizedContent } : msg
              ));
            }
          })
          .catch(error => {
            console.error('Error fetching general search results:', error);
            // Show error message
            const errorContent = (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-red-800">Sorry, I encountered an error while searching. Please try again.</p>
              </div>
            );
            setMessages(prev => prev.map(msg => 
              msg.id === resultsMessageId ? { ...msg, content: errorContent } : msg
            ));
          });
      }, 100);
      
      reasoningSteps = [
        { id: '1', label: 'Intent Detection', description: 'Identified as General query' },
        { id: '2', label: 'Dataset Search', description: 'Searching local insurance datasets' },
        { id: '3', label: 'Web Search', description: 'Querying You.com API for additional information' },
        { id: '4', label: 'AI Synthesis', description: 'Combining and summarizing results with Gemini' }
      ];
    }

    setMessages(prev => [...prev, {
      id: messageId + '-results',
      type: 'agent',
      content: resultContent
    }]);
    
    // Open evidence drawer if we have steps
    if (evidenceStepsToShow.length > 0) {
      setEvidenceSteps(evidenceStepsToShow);
      setEvidenceDrawerOpen(true);
    }
    
    setActiveMessageId(null);
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      <ChatLayout>
        {messages.map((message) => (
          <ConversationMessage
            key={message.id}
            type={message.type}
            content={message.content}
          />
        ))}
      </ChatLayout>
      
      {/* Fixed input at bottom */}
      <div className="flex-shrink-0">
        <ChatInput onSend={handleSendMessage} disabled={activeMessageId !== null} />
      </div>
      
      {/* Content Viewer */}
      <ContentViewer
        isOpen={contentViewerOpen}
        onClose={() => setContentViewerOpen(false)}
        content={viewerContent}
      />
    </div>
  );
}

export default App;
