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
import { dummyPlans, dummyCounties, dummyProviders, dummyNews, dummyFAQs, dummyEvidenceSteps } from './data/dummyData';

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
  const [evidenceSteps, setEvidenceSteps] = useState<any[]>([]);

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

    // Reset state
    setCollectedEntities({});
    setCurrentEntityIndex(0);

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

    // Simulate thinking progression
    setTimeout(() => {
      updateThinkingStep(thinkingId, 'intent', 'complete');
      
      setTimeout(() => {
        updateThinkingStep(thinkingId, 'entities', 'active');
        
        setTimeout(() => {
          const missing = getMissingEntities(intent, text);
          setMissingEntities(missing);
          
          if (missing.length > 0) {
            updateThinkingStep(thinkingId, 'entities', 'complete');
            updateThinkingStep(thinkingId, 'collection', 'active');
            startEntityCollection(thinkingId, intent, missing);
          } else {
            updateThinkingStep(thinkingId, 'entities', 'complete');
            updateThinkingStep(thinkingId, 'collection', 'complete');
            constructQuery(thinkingId, intent, {});
          }
        }, 600);
      }, 500);
    }, 400);
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

  const getMissingEntities = (intent: string, query: string): string[] => {
    const missing: string[] = [];
    const lower = query.toLowerCase();
    
    if (intent === 'Comparison') {
      if (!lower.includes('molina') && !lower.includes('aetna') && !lower.includes('cigna')) {
        missing.push('plans');
      }
    } else {
      if (!lower.includes('broward') && !lower.includes('miami') && !lower.includes('palm beach')) {
        missing.push('county');
      }
      if (!lower.match(/\d{2}/)) {
        missing.push('age');
      }
    }
    
    return missing;
  };

  const startEntityCollection = (messageId: string, intent: string, missing: string[]) => {
    setMessages(prev => [...prev, {
      id: messageId + '-collect',
      type: 'agent',
      content: (
        <ProgressiveEntityCollector
          entityType={missing[0]}
          onCollect={(value) => handleEntityValue(messageId, intent, missing[0], value)}
          plans={dummyPlans}
          counties={dummyCounties}
        />
      )
    }]);
  };

  const handleEntityValue = (messageId: string, intent: string, entityType: string, value: any) => {
    const newCollected = { ...collectedEntities, [entityType]: value };
    setCollectedEntities(newCollected);

    // Remove the entity collector message
    setMessages(prev => prev.filter(msg => msg.id !== messageId + '-collect'));

    const nextIndex = currentEntityIndex + 1;
    setCurrentEntityIndex(nextIndex);

    if (nextIndex < missingEntities.length) {
      // Ask for next entity
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: messageId + '-collect',
          type: 'agent',
          content: (
            <ProgressiveEntityCollector
              entityType={missingEntities[nextIndex]}
              onCollect={(value) => handleEntityValue(messageId, intent, missingEntities[nextIndex], value)}
              plans={dummyPlans}
              counties={dummyCounties}
            />
          )
        }]);
      }, 200);
    } else {
      // All entities collected
      updateThinkingStep(messageId, 'collection', 'complete');
      constructQuery(messageId, intent, newCollected);
    }
  };

  const constructQuery = (messageId: string, intent: string, data: any) => {
    updateThinkingStep(messageId, 'query', 'active');

    // Build query string
    const queryParts: string[] = [];
    if (data.county) queryParts.push(`county:"${data.county.name}"`);
    if (data.age) queryParts.push(`age:${data.age}`);
    if (data.plans) queryParts.push(`plans:${data.plans.length}`);
    
    const queryString = `search(${queryParts.join(', ')}) site:healthcare.gov`;

    setMessages(prev => [...prev, {
      id: messageId + '-query',
      type: 'agent',
      content: <QueryConstructor query={queryString} isConstructing={true} />
    }]);

    setTimeout(() => {
      updateThinkingStep(messageId, 'query', 'complete');
      updateThinkingStep(messageId, 'search', 'active');
      
      setTimeout(() => {
        updateThinkingStep(messageId, 'search', 'complete');
        // Remove query constructor
        setMessages(prev => prev.filter(msg => msg.id !== messageId + '-query'));
        showResults(messageId, intent, data);
      }, 1000);
    }, 800);
  };

  const showResults = (messageId: string, intent: string, data: any) => {
    // Remove thinking message
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    let resultContent: React.ReactNode;
    let evidenceStepsToShow: any[] = [];

    // Handle different intents with specialized components
    if (intent === 'News') {
      resultContent = (
        <div className="space-y-8">
          <p className="text-gray-700">
            Here's the latest health insurance news for Florida:
          </p>
          <NewsCards articles={dummyNews} />
          <QuickActionChips 
            actions={['Set up enrollment reminder', 'Compare plans', 'Find providers']}
            onActionClick={(action) => console.log('Action:', action)}
          />
        </div>
      );
    } else if (intent === 'FAQ') {
      const faqKey = 'coinsurance'; // Default, could be extracted from query
      const faq = dummyFAQs[faqKey as keyof typeof dummyFAQs];
      resultContent = (
        <div className="space-y-8">
          <FAQCard
            term={faq.term}
            definition={faq.definition}
            example={faq.example}
          />
          <QuickActionChips 
            actions={['Show example', 'Compare rates', 'See related terms']}
            onActionClick={(action) => console.log('Action:', action)}
          />
        </div>
      );
    } else if (intent === 'ProviderNetwork') {
      const provider = dummyProviders[0];
      evidenceStepsToShow = dummyEvidenceSteps.provider;
      resultContent = (
        <div className="space-y-8">
          <p className="text-gray-700">
            Found provider information:
          </p>
          <ProviderCard
            name={provider.name}
            specialty={provider.specialty}
            location={provider.location}
            acceptingNewPatients={provider.acceptingNewPatients}
            coveredPlans={provider.coveredPlans}
          />
          <QuickActionChips 
            actions={['See full provider directory', 'Compare plan coverage', 'Book appointment']}
            onActionClick={(action) => console.log('Action:', action)}
          />
        </div>
      );
    } else if (intent === 'Comparison') {
      const plansArray = Array.isArray(data.plans) 
        ? data.plans 
        : dummyPlans.slice(0, 2);
      evidenceStepsToShow = dummyEvidenceSteps.comparison;
      resultContent = (
        <div className="space-y-8">
          <p className="text-gray-700">
            Here's a detailed comparison of the plans:
          </p>
          <PlanComparisonTable 
            plans={plansArray}
            recommendedPlanId={plansArray[0]?.id}
          />
          <QuickActionChips 
            actions={['Export comparison', 'Add another plan', 'See provider networks']}
            onActionClick={(action) => console.log('Action:', action)}
          />
        </div>
      );
    } else {
      // Default: PlanInfo
      const plansArray = Array.isArray(data.plans) 
        ? data.plans 
        : data.plans 
          ? [data.plans] 
          : dummyPlans.slice(0, 3);
      evidenceStepsToShow = dummyEvidenceSteps.planInfo;
      resultContent = (
        <div className="space-y-8">
          <p className="text-gray-700">
            Found {intent === 'Comparison' ? 'plans to compare' : 'plan information'} based on your criteria.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plansArray.map((plan: any, idx: number) => (
              <CompactPlanCard
                key={plan.id}
                plan={plan}
                isRecommended={idx === 0}
              />
            ))}
          </div>
          <QuickActionChips 
            actions={['Compare to other plans', 'See full SBC PDF', 'Find providers nearby']}
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
