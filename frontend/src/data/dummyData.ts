import { Plan } from '../components/entity-collection/PlanAutocomplete';
import { County } from '../components/entity-collection/CountySearch';

export const dummyPlans: Plan[] = [
  {
    id: '1',
    name: 'Molina Silver 1 HMO',
    carrier: 'Molina Healthcare',
    type: 'HMO',
    monthlyPremium: 350,
    deductible: 500,
    features: ['Low copays', 'Prescription coverage', 'Telehealth included']
  },
  {
    id: '2',
    name: 'Florida Blue Silver 2',
    carrier: 'Florida Blue',
    type: 'PPO',
    monthlyPremium: 425,
    deductible: 750,
    features: ['Wide network', 'Dental included', 'Vision care']
  },
  {
    id: '3',
    name: 'Ambetter Balanced Care 5',
    carrier: 'Ambetter',
    type: 'HMO',
    monthlyPremium: 310,
    deductible: 1000,
    features: ['Affordable premiums', 'Preventive care', 'Mental health']
  },
  {
    id: '4',
    name: 'Oscar Simple Gold',
    carrier: 'Oscar Health',
    type: 'EPO',
    monthlyPremium: 480,
    deductible: 250,
    features: ['Concierge teams', 'Virtual care', 'Low deductible']
  },
  {
    id: '5',
    name: 'Cigna Connect 6500',
    carrier: 'Cigna',
    type: 'PPO',
    monthlyPremium: 520,
    deductible: 650,
    features: ['Global coverage', 'Specialist access', 'Wellness programs']
  }
];

export const dummyCounties: County[] = [
  {
    name: 'Broward',
    state: 'FL',
    population: 1952778,
    availablePlans: 45
  },
  {
    name: 'Miami-Dade',
    state: 'FL',
    population: 2716940,
    availablePlans: 52
  },
  {
    name: 'Palm Beach',
    state: 'FL',
    population: 1496770,
    availablePlans: 38
  },
  {
    name: 'Hillsborough',
    state: 'FL',
    population: 1459762,
    availablePlans: 41
  },
  {
    name: 'Orange',
    state: 'FL',
    population: 1429908,
    availablePlans: 47
  }
];

export const dummyProviders = [
  {
    id: '1',
    name: 'Dr. Anjali Patel',
    specialty: 'Psychiatry',
    location: 'Orlando, FL',
    acceptingNewPatients: true,
    coveredPlans: ['Cigna Silver HMO', 'Florida Blue PPO', 'Molina Silver 1']
  },
  {
    id: '2',
    name: 'Dr. Michael Chen',
    specialty: 'Cardiology',
    location: 'Miami, FL',
    acceptingNewPatients: true,
    coveredPlans: ['Florida Blue Silver', 'Cigna Connect']
  }
];

export const dummyNews = [
  {
    headline: 'Florida ACA Open Enrollment Extended to January 31',
    summary: 'The Biden administration announced an extension of the Affordable Care Act open enrollment period for Florida residents.',
    source: 'Healthcare.gov',
    date: 'Oct 15, 2025',
    url: 'https://healthcare.gov/news/enrollment-extension'
  },
  {
    headline: 'Mental Health Coverage Expanded in 2025 Plans',
    summary: 'All Florida marketplace plans now required to cover mental health services with no prior authorization for first 6 visits.',
    source: 'CMS.gov',
    date: 'Oct 10, 2025',
    url: 'https://cms.gov/mental-health-coverage'
  },
  {
    headline: 'Cigna Expands Provider Network in Central Florida',
    summary: 'Cigna adds 150 new providers across Orange and Seminole counties, improving access to specialists.',
    source: 'Cigna.com',
    date: 'Oct 5, 2025',
    url: 'https://cigna.com/network-expansion'
  }
];

export const dummyFAQs = {
  coinsurance: {
    term: 'Coinsurance',
    definition: 'Coinsurance is the percentage of costs you pay after meeting your deductible. For example, if your plan has 20% coinsurance, you pay 20% of the cost and your insurance pays 80%.',
    example: {
      title: 'Example',
      description: 'You need a $1,000 procedure. After meeting your deductible, with 20% coinsurance, you pay $200 and your insurance pays $800.'
    }
  },
  deductible: {
    term: 'Deductible',
    definition: 'A deductible is the amount you pay for covered health care services before your insurance plan starts to pay. After you meet your deductible, you typically pay only a copayment or coinsurance for covered services.',
    example: {
      title: 'Example',
      description: 'With a $1,500 deductible, you pay the first $1,500 of covered services yourself. After that, your insurance starts sharing costs.'
    }
  },
  outOfPocketMax: {
    term: 'Out-of-Pocket Maximum',
    definition: 'The most you have to pay for covered services in a plan year. After you reach this amount, your insurance pays 100% of covered services for the rest of the year.',
    example: {
      title: 'Example',
      description: 'With a $6,000 out-of-pocket max, once you\'ve paid $6,000 in deductibles, copays, and coinsurance, your plan pays 100% for the rest of the year.'
    }
  }
};

// Reasoning steps for inline display
export const dummyReasoningSteps = {
  planInfo: [
    {
      id: '1',
      label: 'Detected intent: Plan Information',
      description: 'Identified that you\'re asking about specific plan details (deductible, premium, or coverage).'
    },
    {
      id: '2',
      label: 'Extracted plan name: Molina Silver 1 HMO',
      description: 'Found plan identifier in your query and matched it to the official plan database.'
    },
    {
      id: '3',
      label: 'Retrieved plan data from healthcare.gov',
      description: 'Fetched official 2025 plan details including deductible ($500), OOP max ($8,000), and copays.'
    }
  ],
  provider: [
    {
      id: '1',
      label: 'Detected intent: Provider Network Search',
      description: 'Identified that you\'re checking if a specific provider accepts a plan.'
    },
    {
      id: '2',
      label: 'Found provider: Dr. Anjali Patel',
      description: 'Located provider in Cigna\'s directory. Specialty: Psychiatry, Location: Orlando, FL.'
    }
  ],
  comparison: [
    {
      id: '1',
      label: 'Detected intent: Plan Comparison',
      description: 'Identified that you want to compare multiple plans side-by-side.'
    },
    {
      id: '2',
      label: 'Extracted plans: Florida Blue Silver, Molina Silver 1',
      description: 'Found 2 plans to compare from your query.'
    },
    {
      id: '3',
      label: 'Retrieved comparison data',
      description: 'Fetched deductibles, premiums, copays, and network details for both plans.'
    },
    {
      id: '4',
      label: 'Calculated best value',
      description: 'Analyzed total estimated costs based on average usage. Molina Silver 1 offers better value for most scenarios.'
    }
  ],
  news: [
    {
      id: '1',
      label: 'Detected intent: News & Updates',
      description: 'Identified that you\'re looking for the latest health insurance news.'
    },
    {
      id: '2',
      label: 'Searched verified news sources',
      description: 'Queried healthcare.gov, CMS.gov, and major carrier websites for recent updates.'
    },
    {
      id: '3',
      label: 'Filtered for Florida-specific news',
      description: 'Found 3 relevant articles about enrollment extensions, coverage changes, and network expansions.'
    }
  ],
  faq: [
    {
      id: '1',
      label: 'Detected intent: Definition Request',
      description: 'Identified that you\'re asking for an explanation of an insurance term.'
    },
    {
      id: '2',
      label: 'Retrieved term definition',
      description: 'Found official definition and examples from healthcare.gov glossary.'
    }
  ]
};

// Full content for content viewer
export const dummyFullContent = {
  news: [
    {
      type: 'news' as const,
      headline: 'Florida ACA Open Enrollment Extended to January 31',
      date: 'Oct 15, 2025',
      source: 'Healthcare.gov',
      author: 'CMS Communications Team',
      content: `The Biden administration announced today a significant extension of the Affordable Care Act (ACA) open enrollment period for Florida residents, moving the deadline from December 15 to January 31, 2026.

This extension comes in response to Hurricane damage and recovery efforts across several Florida counties, giving residents more time to evaluate their health insurance options for 2026.

"We understand that many Floridians are still recovering from recent natural disasters," said CMS Administrator Chiquita Brooks-LaSure. "This extension ensures that no one has to choose between rebuilding their homes and securing health coverage for their families."

Key Points:
• New deadline: January 31, 2026 (previously December 15, 2025)
• Applies to all Florida residents purchasing through the federal marketplace
• Coverage can still begin as early as January 1, 2026 for those enrolling by December 15
• Special enrollment periods remain available for qualifying life events

The extension affects approximately 3.2 million Floridians who purchase health insurance through the federal marketplace. Florida has consistently had one of the highest enrollment numbers in the nation, with over 4 million residents enrolled in ACA plans during the 2025 coverage year.

Insurance carriers operating in Florida have been notified of the extension and have confirmed their participation through the extended period. Premium subsidies and cost-sharing reductions remain available for eligible households.

For more information or to begin the enrollment process, visit HealthCare.gov or call 1-800-318-2596.`,
      url: 'https://healthcare.gov/news/enrollment-extension'
    },
    {
      type: 'news' as const,
      headline: 'Mental Health Coverage Expanded in 2025 Plans',
      date: 'Oct 10, 2025',
      source: 'CMS.gov',
      author: 'Policy & Regulations Division',
      content: `The Centers for Medicare & Medicaid Services (CMS) announced new mental health coverage requirements for all marketplace plans in Florida, effective for the 2025 plan year.

Under the new regulations, all qualified health plans (QHPs) sold through the federal marketplace must now cover mental health and substance abuse services with no prior authorization required for the first six visits per calendar year.

Major Changes Include:
• No prior authorization for first 6 mental health visits
• Telehealth mental health services covered at same rate as in-person
• Substance abuse treatment covered without deductible
• Crisis intervention services available 24/7 with no copay

"Mental health parity has been a priority for this administration," said HHS Secretary Xavier Becerra. "These new requirements ensure that mental health care is treated with the same urgency and accessibility as physical health care."

The changes affect approximately 2.8 million Floridians enrolled in marketplace plans. Insurance carriers have updated their provider networks to accommodate the expected increase in mental health service utilization.

Dr. Sarah Mitchell, a psychiatrist in Tampa, welcomed the changes: "This removes a significant barrier to care. Many patients would delay treatment while waiting for prior authorization. Now they can get help immediately."

All marketplace plans have been required to update their Summary of Benefits and Coverage (SBC) documents to reflect these changes. Consumers can review updated plan documents on HealthCare.gov.`,
      url: 'https://cms.gov/mental-health-coverage'
    },
    {
      type: 'news' as const,
      headline: 'Cigna Expands Provider Network in Central Florida',
      date: 'Oct 5, 2025',
      source: 'Cigna.com',
      author: 'Cigna Corporate Communications',
      content: `Cigna Health Insurance announced a major expansion of its provider network in Central Florida, adding 150 new healthcare providers across Orange and Seminole counties.

The expansion includes 75 primary care physicians, 45 specialists, and 30 mental health providers, significantly improving access to care for Cigna members in the Orlando metropolitan area.

Network Expansion Details:
• 75 primary care physicians (family medicine, internal medicine, pediatrics)
• 45 specialists (cardiology, orthopedics, endocrinology, gastroenterology)
• 30 mental health providers (psychiatrists, psychologists, licensed therapists)
• 12 new urgent care facilities
• 3 additional imaging centers

"We're committed to ensuring our members have convenient access to high-quality care," said Lisa Bacus, Executive Vice President of Cigna's Government Business. "This expansion reduces wait times and travel distances for thousands of our Florida members."

The new providers are accepting new patients and are available to all Cigna marketplace plan members, including those enrolled in Connect, LocalPlus, and Open Access Plus plans.

Dr. Michael Chen, one of the newly added cardiologists, expressed enthusiasm about joining the network: "Cigna's commitment to value-based care aligns with our practice philosophy. We're excited to serve more patients in our community."

Members can search for new providers using Cigna's online provider directory at myCigna.com or by calling customer service at 1-800-244-6224. All new providers are accepting appointments beginning November 1, 2025.

The expansion is part of Cigna's broader strategy to increase provider access in high-growth markets across Florida, with similar expansions planned for Miami-Dade and Broward counties in early 2026.`,
      url: 'https://cigna.com/network-expansion'
    }
  ],
  providers: [
    {
      type: 'provider' as const,
      name: 'Dr. Anjali Patel',
      specialty: 'Psychiatry',
      location: '1234 Medical Plaza Dr, Suite 200, Orlando, FL 32801',
      phone: '(407) 555-0123',
      email: 'apatel@orlandopsych.com',
      bio: 'Dr. Anjali Patel is a board-certified psychiatrist with over 12 years of experience treating adults with mood disorders, anxiety, and ADHD. She takes a holistic, patient-centered approach to mental health care, combining medication management with evidence-based psychotherapy techniques. Dr. Patel is particularly interested in women\'s mental health and has specialized training in perinatal psychiatry.',
      education: [
        'MD - University of Florida College of Medicine (2011)',
        'Psychiatry Residency - Johns Hopkins Hospital (2015)',
        'Fellowship in Women\'s Mental Health - Massachusetts General Hospital (2016)'
      ],
      acceptingPatients: true,
      languages: ['English', 'Hindi', 'Gujarati'],
      coveredPlans: [
        'Cigna Silver HMO',
        'Cigna Connect 6500',
        'Florida Blue PPO',
        'Florida Blue Silver 2',
        'Molina Silver 1 HMO',
        'Ambetter Balanced Care 5',
        'Oscar Simple Gold'
      ]
    },
    {
      type: 'provider' as const,
      name: 'Dr. Michael Chen',
      specialty: 'Cardiology',
      location: '5678 Heart Center Blvd, Miami, FL 33101',
      phone: '(305) 555-0456',
      email: 'mchen@miamiheartcare.com',
      bio: 'Dr. Michael Chen is an interventional cardiologist specializing in the treatment of coronary artery disease, heart failure, and structural heart conditions. With over 15 years of experience, he has performed thousands of cardiac catheterizations and interventional procedures. Dr. Chen is committed to preventive cardiology and works closely with patients to manage risk factors and improve cardiovascular health.',
      education: [
        'MD - Harvard Medical School (2008)',
        'Internal Medicine Residency - Brigham and Women\'s Hospital (2011)',
        'Cardiology Fellowship - Cleveland Clinic (2014)',
        'Interventional Cardiology Fellowship - Mayo Clinic (2015)'
      ],
      acceptingPatients: true,
      languages: ['English', 'Mandarin', 'Spanish'],
      coveredPlans: [
        'Florida Blue Silver 2',
        'Florida Blue PPO',
        'Cigna Connect 6500',
        'Cigna LocalPlus',
        'Aetna CVS Health',
        'UnitedHealthcare'
      ]
    }
  ]
};
