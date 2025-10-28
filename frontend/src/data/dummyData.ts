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

export const dummyEvidenceSteps = {
  planInfo: [
    {
      id: '1',
      title: 'Detected intent: Plan Information',
      description: 'Identified that you\'re asking about specific plan details (deductible, premium, or coverage).',
      source: { name: 'Intent Classification', timestamp: 'Just now' }
    },
    {
      id: '2',
      title: 'Extracted plan name: Molina Silver 1 HMO',
      description: 'Found plan identifier in your query and matched it to the official plan database.',
      source: { name: 'Entity Extraction', timestamp: 'Just now' }
    },
    {
      id: '3',
      title: 'Retrieved plan data from healthcare.gov',
      description: 'Fetched official 2025 plan details including deductible ($500), OOP max ($8,000), and copays.',
      source: { name: 'healthcare.gov', timestamp: 'Just now' }
    }
  ],
  provider: [
    {
      id: '1',
      title: 'Detected intent: Provider Network Search',
      description: 'Identified that you\'re checking if a specific provider accepts a plan.',
      source: { name: 'Intent Classification', timestamp: 'Just now' }
    },
    {
      id: '2',
      title: 'Found provider: Dr. Anjali Patel',
      description: 'Located provider in Cigna\'s directory. Specialty: Psychiatry, Location: Orlando, FL.',
      source: { name: 'cigna.com/providers', timestamp: 'Just now' }
    }
  ],
  comparison: [
    {
      id: '1',
      title: 'Detected intent: Plan Comparison',
      description: 'Identified that you want to compare multiple plans side-by-side.',
      source: { name: 'Intent Classification', timestamp: 'Just now' }
    },
    {
      id: '2',
      title: 'Extracted plans: Florida Blue Silver, Molina Silver 1',
      description: 'Found 2 plans to compare from your query.',
      source: { name: 'Entity Extraction', timestamp: 'Just now' }
    },
    {
      id: '3',
      title: 'Retrieved comparison data',
      description: 'Fetched deductibles, premiums, copays, and network details for both plans.',
      source: { name: 'healthcare.gov', timestamp: 'Just now' }
    },
    {
      id: '4',
      title: 'Calculated best value',
      description: 'Analyzed total estimated costs based on average usage. Molina Silver 1 offers better value for most scenarios.',
      source: { name: 'Cost Analysis', timestamp: 'Just now' }
    }
  ]
};
