"""
Dynamic Intent and Entity Configuration Manager

This module provides a flexible system for managing intents and their required entities.
Configuration can be loaded from JSON files or potentially from a database in the future.
"""

import json
import os
from typing import Dict, List, Optional, Any
from pathlib import Path
import google.generativeai as genai


class IntentConfigManager:
    """Manages intent and entity configurations dynamically."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the configuration manager.
        
        Args:
            config_path: Path to the JSON configuration file. If None, uses default.
        """
        if config_path is None:
            # Default to intent_config.json in the same directory
            config_path = Path(__file__).parent / "intent_config.json"
        
        self.config_path = config_path
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file."""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in configuration file: {e}")
    
    def reload_config(self) -> None:
        """Reload configuration from file (useful for hot-reloading in production)."""
        self.config = self._load_config()
    
    def get_valid_intents(self) -> List[str]:
        """Get list of all valid intent names."""
        return list(self.config.get("intents", {}).keys())
    
    def get_valid_entities(self) -> List[str]:
        """Get list of all valid entity names."""
        return list(self.config.get("entities", {}).keys())
    
    def get_intent_config(self, intent: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific intent."""
        return self.config.get("intents", {}).get(intent)
    
    def get_entity_config(self, entity: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific entity."""
        return self.config.get("entities", {}).get(entity)
    
    def get_required_entities(self, intent: str) -> List[str]:
        """
        Get required entities for a given intent.
        
        Args:
            intent: The intent name
            
        Returns:
            List of required entity names in the order they should be collected
        """
        intent_config = self.get_intent_config(intent)
        if not intent_config:
            return []
        
        # Use entity_order if specified, otherwise fall back to required_entities
        return intent_config.get("entity_order", intent_config.get("required_entities", []))
    
    def get_optional_entities(self, intent: str) -> List[str]:
        """Get optional entities for a given intent."""
        intent_config = self.get_intent_config(intent)
        if not intent_config:
            return []
        return intent_config.get("optional_entities", [])
    
    def get_entity_question(
        self, 
        entity: str, 
        context: Optional[Dict[str, Any]] = None,
        use_llm: bool = False,
        llm_model: Optional[Any] = None
    ) -> str:
        """
        Get the question to ask for a specific entity.
        
        Args:
            entity: The entity name
            context: Optional context (collected entities, intent, etc.)
            use_llm: Whether to generate question dynamically using LLM
            llm_model: Gemini model instance for dynamic generation
            
        Returns:
            Question string to ask the user
        """
        entity_config = self.get_entity_config(entity)
        
        if not entity_config:
            return f"Could you please provide: {entity}?"
        
        # Check if dynamic question generation is enabled for this entity
        if use_llm and entity_config.get("use_dynamic_question", False) and llm_model:
            return self._generate_dynamic_question(entity, entity_config, context, llm_model)
        
        # Use template question
        question = entity_config.get("question_template", f"Could you please provide: {entity}?")
        
        # Add examples if available
        examples = entity_config.get("examples", [])
        if examples:
            question += f" (e.g., {', '.join(examples[:3])})"
        
        return question
    
    def _generate_dynamic_question(
        self, 
        entity: str, 
        entity_config: Dict[str, Any],
        context: Optional[Dict[str, Any]],
        llm_model: Any
    ) -> str:
        """
        Generate a contextual question using LLM.
        
        Args:
            entity: Entity name
            entity_config: Entity configuration
            context: Conversation context
            llm_model: Gemini model instance
            
        Returns:
            Dynamically generated question
        """
        context_str = ""
        if context:
            if context.get("intent"):
                context_str += f"Intent: {context['intent']}\n"
            if context.get("collected_entities"):
                context_str += f"Already collected: {context['collected_entities']}\n"
            if context.get("conversation_history"):
                recent = context['conversation_history'][-3:]  # Last 3 messages
                context_str += "Recent conversation:\n"
                for msg in recent:
                    context_str += f"- {msg.get('role', 'unknown')}: {msg.get('content', '')}\n"
        
        prompt = f"""Generate a natural, conversational question to ask the user for the following information:

Entity: {entity}
Description: {entity_config.get('description', '')}
Examples: {', '.join(entity_config.get('examples', []))}

Context:
{context_str}

Generate a friendly, contextual question that:
1. Feels natural given the conversation flow
2. Clearly asks for the needed information
3. Provides helpful examples
4. Is concise (1-2 sentences max)

Return ONLY the question text, no additional formatting or explanation.
"""
        
        try:
            response = llm_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            # Fallback to template if LLM fails
            print(f"LLM question generation failed: {e}")
            return entity_config.get("question_template", f"Could you please provide: {entity}?")
    
    def get_all_required_entities_by_intent(self) -> Dict[str, List[str]]:
        """
        Get mapping of all intents to their required entities.
        Useful for backward compatibility.
        
        Returns:
            Dictionary mapping intent names to lists of required entities
        """
        return {
            intent: self.get_required_entities(intent)
            for intent in self.get_valid_intents()
        }
    
    def validate_entities(self, entities: Dict[str, Any], intent: str) -> Dict[str, Any]:
        """
        Validate that collected entities meet requirements for an intent.
        
        Args:
            entities: Collected entities
            intent: Intent name
            
        Returns:
            Dictionary with 'valid', 'missing', and 'optional_missing' keys
        """
        required = self.get_required_entities(intent)
        optional = self.get_optional_entities(intent)
        
        missing_required = [e for e in required if e not in entities or not entities[e]]
        missing_optional = [e for e in optional if e not in entities or not entities[e]]
        
        return {
            "valid": len(missing_required) == 0,
            "missing": missing_required,
            "optional_missing": missing_optional,
            "has_all_optional": len(missing_optional) == 0
        }
    
    def export_config_for_frontend(self) -> Dict[str, Any]:
        """
        Export a frontend-friendly version of the configuration.
        
        Returns:
            Simplified configuration for frontend use
        """
        return {
            "intents": {
                intent: {
                    "description": config.get("description", ""),
                    "required_entities": config.get("required_entities", []),
                    "optional_entities": config.get("optional_entities", [])
                }
                for intent, config in self.config.get("intents", {}).items()
            },
            "entities": {
                entity: {
                    "type": config.get("type", "string"),
                    "description": config.get("description", ""),
                    "examples": config.get("examples", [])
                }
                for entity, config in self.config.get("entities", {}).items()
            }
        }


# Global instance (can be initialized once at startup)
_config_manager: Optional[IntentConfigManager] = None


def get_config_manager(config_path: Optional[str] = None) -> IntentConfigManager:
    """
    Get or create the global configuration manager instance.
    
    Args:
        config_path: Path to configuration file (only used on first call)
        
    Returns:
        IntentConfigManager instance
    """
    global _config_manager
    if _config_manager is None:
        _config_manager = IntentConfigManager(config_path)
    return _config_manager


def reload_config() -> None:
    """Reload configuration from file."""
    global _config_manager
    if _config_manager:
        _config_manager.reload_config()

