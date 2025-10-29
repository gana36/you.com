/**
 * Configuration Service
 * 
 * Fetches and manages dynamic intent and entity configuration from the backend.
 * This replaces hardcoded entity lists and makes the system more flexible.
 */

import { API_BASE_URL } from '../config';

export interface EntityConfig {
  type: string;
  description: string;
  examples: string[];
}

export interface IntentConfig {
  description: string;
  required_entities: string[];
  optional_entities: string[];
}

export interface AppConfig {
  intents: Record<string, IntentConfig>;
  entities: Record<string, EntityConfig>;
}

class ConfigService {
  private config: AppConfig | null = null;
  private configPromise: Promise<AppConfig> | null = null;

  /**
   * Get configuration (cached or fetch from server)
   */
  async getConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = this.fetchConfig();
    this.config = await this.configPromise;
    this.configPromise = null;
    
    return this.config;
  }

  /**
   * Fetch configuration from backend
   */
  private async fetchConfig(): Promise<AppConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/config`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.config) {
        return data.config;
      }

      throw new Error('Invalid configuration response from server');
    } catch (error) {
      console.error('Error fetching configuration:', error);
      
      // Fallback to default configuration
      return this.getDefaultConfig();
    }
  }

  /**
   * Get all valid entity names
   */
  async getAllEntities(): Promise<string[]> {
    const config = await this.getConfig();
    return Object.keys(config.entities);
  }

  /**
   * Get required entities for a specific intent
   */
  async getRequiredEntities(intent: string): Promise<string[]> {
    const config = await this.getConfig();
    const intentConfig = config.intents[intent];
    
    if (!intentConfig) {
      console.warn(`Intent ${intent} not found in configuration`);
      return [];
    }

    return intentConfig.required_entities;
  }

  /**
   * Get optional entities for a specific intent
   */
  async getOptionalEntities(intent: string): Promise<string[]> {
    const config = await this.getConfig();
    const intentConfig = config.intents[intent];
    
    if (!intentConfig) {
      console.warn(`Intent ${intent} not found in configuration`);
      return [];
    }

    return intentConfig.optional_entities || [];
  }

  /**
   * Get entity configuration
   */
  async getEntityConfig(entityName: string): Promise<EntityConfig | null> {
    const config = await this.getConfig();
    return config.entities[entityName] || null;
  }

  /**
   * Reload configuration from server
   */
  async reloadConfig(): Promise<void> {
    this.config = null;
    this.configPromise = null;
    await this.getConfig();
  }

  /**
   * Default fallback configuration (used if server is unavailable)
   */
  private getDefaultConfig(): AppConfig {
    return {
      intents: {
        PlanInfo: {
          description: "User wants information about a specific health insurance plan",
          required_entities: ["plan_name", "insurer", "year", "county", "age"],
          optional_entities: ["income", "family_size"]
        },
        CoverageDetail: {
          description: "User wants details about what a plan covers",
          required_entities: ["plan_name", "insurer", "year", "coverage_item", "subtype", "county"],
          optional_entities: []
        },
        ProviderNetwork: {
          description: "User wants to know about doctors/hospitals in a plan's network",
          required_entities: ["provider_name", "specialty", "plan_name", "insurer", "county"],
          optional_entities: []
        },
        Comparison: {
          description: "User wants to compare multiple plans",
          required_entities: ["plan_name", "insurer", "year", "county"],
          optional_entities: ["age", "features"]
        },
        FAQ: {
          description: "User has a general question about health insurance",
          required_entities: ["topic"],
          optional_entities: ["state"]
        },
        News: {
          description: "User wants recent news or updates about plans/insurers",
          required_entities: ["topic", "year"],
          optional_entities: ["insurer", "plan_name", "state"]
        }
      },
      entities: {
        plan_name: {
          type: "string",
          description: "Name of the health insurance plan",
          examples: ["Molina Silver 1 HMO", "Aetna Gold"]
        },
        insurer: {
          type: "string",
          description: "Insurance company name",
          examples: ["Molina", "Aetna", "UnitedHealthcare"]
        },
        year: {
          type: "integer",
          description: "Year of coverage",
          examples: ["2024", "2025"]
        },
        county: {
          type: "string",
          description: "County name",
          examples: ["Broward", "Miami-Dade", "Leon"]
        },
        age: {
          type: "integer",
          description: "Age of the person",
          examples: ["43", "65"]
        },
        coverage_item: {
          type: "string",
          description: "Specific coverage type",
          examples: ["dental", "vision", "prescription drugs"]
        },
        subtype: {
          type: "string",
          description: "Subtype or specific aspect of coverage",
          examples: ["preventive care", "specialist visits"]
        },
        provider_name: {
          type: "string",
          description: "Name of a doctor or hospital",
          examples: ["Dr. Smith", "Memorial Hospital"]
        },
        specialty: {
          type: "string",
          description: "Medical specialty",
          examples: ["cardiology", "pediatrics", "dermatology"]
        },
        features: {
          type: "string",
          description: "Plan features to compare",
          examples: ["premiums", "deductibles", "copays"]
        },
        topic: {
          type: "string",
          description: "Topic or subject matter",
          examples: ["open enrollment", "subsidies"]
        },
        state: {
          type: "string",
          description: "State name",
          examples: ["Florida", "Texas", "California"]
        },
        income: {
          type: "integer",
          description: "Annual income",
          examples: ["50000", "75000"]
        },
        family_size: {
          type: "integer",
          description: "Number of people to be covered",
          examples: ["1", "4"]
        },
        zip_code: {
          type: "string",
          description: "ZIP code",
          examples: ["33301", "90210"]
        }
      }
    };
  }
}

// Export singleton instance
export const configService = new ConfigService();

