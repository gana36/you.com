import React, { useState, useEffect } from 'react';
import { ChatLayout } from './components/conversation/ChatLayout';
import { ChatInput } from './components/conversation/ChatInput';
import { ConversationMessage } from './components/conversation/ConversationMessage';
import { AgenticThinking } from './components/conversation/AgenticThinking';
import { QueryConstructor } from './components/conversation/QueryConstructor';
import { ProgressiveEntityCollector } from './components/conversation/ProgressiveEntityCollector';
import { CompactPlanCard } from './components/results/CompactPlanCard';
import { ProviderCard } from './components/results/ProviderCard';
import { NewsCards } from './components/results/NewsCards';
import { FAQCard } from './components/results/FAQCard';
import { PlanComparisonTable } from './components/results/PlanComparisonTable';
import { QuickActionChips } from './components/conversation/QuickActionChips';
import { EvidenceDrawer } from './components/conversation/EvidenceDrawer';
import { dummyPlans, dummyCounties } from './data/dummyData';
import { API_BASE_URL } from './config';

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
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [evidenceSteps] = useState<any[]>([]);
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

          // Determine all possible entities that might be missing
          const allPossibleEntities = ['plan_name', 'insurer', 'year', 'county', 'age', 'income',
                                        'coverage_item', 'subtype', 'provider_name', 'specialty',
                                        'features', 'topic', 'state'];
          const missing = allPossibleEntities.filter(e => !data.collected_entities[e]);

          setMissingEntities(missing);

          // Start collecting the first missing entity
          if (missing.length > 0) {
            startEntityCollection(thinkingId, intent, missing, data.session_id);
          }
        } else if (data.status === 'complete' || data.search_results) {
          // Backend has completed gathering info and has results
          console.log('Backend has completed, showing results...');
          updateThinkingStep(thinkingId, 'collection', 'complete');
          performSearch(thinkingId, intent, data.session_id);
        } else {
          // No collection needed, proceed directly to search
          console.log('No entity collection needed, proceeding to search...');
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
      if (data.requires_input && data.next_question) {
        // Backend wants more info - show the acknowledgment/question
        setMessages(prev => [...prev, {
          id: messageId + '-ack-' + Date.now(),
          type: 'agent',
          content: <div className="text-gray-700">{data.response}</div>
        }]);

        // Determine what's still missing based on backend response
        const allPossibleEntities = ['plan_name', 'insurer', 'year', 'county', 'age', 'income',
                                      'coverage_item', 'subtype', 'provider_name', 'specialty',
                                      'features', 'topic', 'state'];
        const stillMissing = allPossibleEntities.filter(e => !data.collected_entities[e]);

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
        }
      } else {
        // Backend is done collecting, perform search
        console.log('All entities collected! Performing search...');
        updateThinkingStep(messageId, 'collection', 'complete');
        performSearch(messageId, intent, session);
      }
    } catch (error) {
      console.error('Error sending entity to backend:', error);
    }
  };

  const performSearch = async (messageId: string, intent: string, session: string) => {
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

      // Get search results from backend (they're already there)
      fetch(`${API_BASE_URL}/session/${session}`)
        .then(res => res.json())
        .then(sessionData => {
          setTimeout(() => {
            updateThinkingStep(messageId, 'search', 'complete');
            setMessages(prev => prev.filter(msg => msg.id !== messageId + '-query'));

            // Check if we have search results from backend
            const lastMessage = sessionData.conversation_history[sessionData.conversation_history.length - 1];
            const searchResults = lastMessage?.search_results;

            if (searchResults && searchResults.length > 0) {
              // Transform You.com results into insurance plan format for display
              showResultsFromSearch(messageId, intent, searchResults);
            } else {
              // No results, show empty state
              showResultsFromSearch(messageId, intent, []);
            }
          }, 1000);
        })
        .catch(error => {
          console.error('Error fetching session:', error);
          showResultsFromSearch(messageId, intent, []);
        });
    }, 800);
  };

  const showResultsFromSearch = (messageId: string, intent: string, searchResults: any[]) => {
    // Remove thinking message
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    let resultContent: React.ReactNode;

    // Handle different intents with specialized components
    if (intent === 'News') {
      // Transform search results to news article format
      const newsArticles = searchResults.map((result: any) => ({
        headline: result.title,
        source: new URL(result.url).hostname.replace('www.', ''),
        date: 'Recent',
        summary: result.description,
        url: result.url
      }));

      resultContent = (
        <div className="space-y-8">
          <p className="text-gray-700">
            Here's the latest health insurance news:
          </p>
          <NewsCards articles={newsArticles} />
          <QuickActionChips
            actions={['Set up enrollment reminder', 'Compare plans', 'Find providers']}
            onActionClick={(action) => console.log('Action:', action)}
          />
        </div>
      );
    } else if (intent === 'FAQ') {
      // For FAQ, show first result as featured card
      const firstResult = searchResults[0];
      resultContent = (
        <div className="space-y-8">
          <FAQCard
            term={firstResult?.title || 'Insurance Term'}
            definition={firstResult?.description || ''}
            example={firstResult?.snippets?.[0] || ''}
          />
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-600">Additional Resources:</p>
            {searchResults.slice(1, 4).map((result: any, idx: number) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium text-sm">
                  {result.title}
                </a>
              </div>
            ))}
          </div>
          <QuickActionChips
            actions={['Show example', 'Compare rates', 'See related terms']}
            onActionClick={(action) => console.log('Action:', action)}
          />
        </div>
      );
    } else {
      // For PlanInfo and other intents, show generic search results
      resultContent = (
        <div className="space-y-8">
          <p className="text-gray-700">
            Found {searchResults.length} insurance-related resources based on your criteria:
          </p>
          <div className="space-y-4">
            {searchResults.map((result: any, idx: number) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                <h4 className="font-semibold text-blue-600 mb-2">
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {result.title}
                  </a>
                </h4>
                <p className="text-sm text-gray-600 mb-3">{result.description}</p>
                {result.snippets && result.snippets.length > 0 && (
                  <div className="bg-gray-50 rounded p-3 text-xs text-gray-600 space-y-2">
                    {result.snippets.slice(0, 2).map((snippet: string, i: number) => (
                      <p key={i}>{snippet}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <QuickActionChips
            actions={['Refine search', 'Compare plans', 'Find providers']}
            onActionClick={(action) => console.log('Action:', action)}
          />
        </div>
      );
    }

    setMessages(prev => [...prev, {
      id: messageId + '-results',
      type: 'agent',
      content: resultContent
    }]);

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
      
      {/* Evidence Drawer */}
      <EvidenceDrawer
        isOpen={evidenceDrawerOpen}
        onClose={() => setEvidenceDrawerOpen(false)}
        steps={evidenceSteps}
      />
    </div>
  );
}

export default App;
