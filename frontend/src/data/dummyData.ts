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
