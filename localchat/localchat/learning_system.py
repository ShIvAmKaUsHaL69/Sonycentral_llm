"""
Advanced Learning System for Database Assistant
Implements self-learning capabilities to improve over time
"""

import json
import time
import re
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import os

class LearningManager:
    """Manages learning and adaptation for the database assistant"""
    
    def __init__(self, learning_data_file: str = "learning_data.json"):
        self.learning_data_file = learning_data_file
        self.learning_data = self._load_learning_data()
        
        # Learning components
        self.query_patterns = self.learning_data.get("query_patterns", {})
        self.user_intents = self.learning_data.get("user_intents", {})
        self.error_corrections = self.learning_data.get("error_corrections", {})
        self.schema_insights = self.learning_data.get("schema_insights", {})
        self.performance_metrics = self.learning_data.get("performance_metrics", [])
        self.user_preferences = self.learning_data.get("user_preferences", {})
        self.successful_queries = self.learning_data.get("successful_queries", [])
        
    def _load_learning_data(self) -> Dict[str, Any]:
        """Load existing learning data from file"""
        try:
            if os.path.exists(self.learning_data_file):
                with open(self.learning_data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load learning data: {e}")
        return {}
    
    def _save_learning_data(self):
        """Save learning data to file"""
        try:
            self.learning_data = {
                "query_patterns": self.query_patterns,
                "user_intents": self.user_intents,
                "error_corrections": self.error_corrections,
                "schema_insights": self.schema_insights,
                "performance_metrics": self.performance_metrics[-1000:],  # Keep last 1000
                "user_preferences": self.user_preferences,
                "successful_queries": self.successful_queries[-500:],  # Keep last 500
                "last_updated": datetime.now().isoformat()
            }
            with open(self.learning_data_file, 'w', encoding='utf-8') as f:
                json.dump(self.learning_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Could not save learning data: {e}")
    
    def learn_from_interaction(self, question: str, sql: str, success: bool, 
                             execution_time: float = 0, result_count: int = 0, 
                             error_message: str = None, user_feedback: str = None):
        """Learn from each user interaction"""
        
        # Extract patterns from the question
        intent = self._extract_user_intent(question)
        pattern = self._extract_query_pattern(question)
        
        # Track performance
        self._track_performance(question, sql, execution_time, result_count, success)
        
        if success:
            self._reinforce_successful_pattern(pattern, sql, intent)
            self.successful_queries.append({
                "question": question,
                "sql": sql,
                "intent": intent,
                "timestamp": time.time(),
                "execution_time": execution_time,
                "result_count": result_count
            })
        else:
            self._learn_from_error(pattern, sql, error_message, user_feedback)
        
        # Learn schema insights
        self._update_schema_insights(question, sql, success)
        
        # Learn user preferences
        self._learn_user_preferences(question, sql, success)
        
        # Save learning data periodically
        if len(self.successful_queries) % 10 == 0:
            self._save_learning_data()
    
    def _extract_user_intent(self, question: str) -> str:
        """Extract user intent from question"""
        question_lower = question.lower()
        
        # Define intent patterns
        intent_patterns = {
            "count": ["how many", "count", "number of", "total"],
            "list": ["show", "list", "get", "find", "display"],
            "filter": ["where", "from", "with", "having", "filter"],
            "aggregate": ["sum", "average", "avg", "max", "min", "group by"],
            "join": ["with", "and", "including", "together"],
            "time_series": ["daily", "monthly", "weekly", "yearly", "trend", "over time"],
            "comparison": ["compare", "vs", "versus", "difference", "better", "worse"],
            "top": ["top", "best", "highest", "most", "first"],
            "recent": ["recent", "latest", "new", "last"]
        }
        
        for intent, patterns in intent_patterns.items():
            if any(pattern in question_lower for pattern in patterns):
                return intent
        
        return "general"
    
    def _extract_query_pattern(self, question: str) -> str:
        """Extract query pattern from question"""
        # Normalize question for pattern matching
        normalized = re.sub(r'\b\d+\b', 'NUMBER', question.lower())
        normalized = re.sub(r'\b[a-zA-Z]+\b', 'WORD', normalized)
        normalized = re.sub(r'[^\w\s]', '', normalized)
        
        # Extract key words that indicate query type
        key_words = []
        words = normalized.split()
        
        for word in words:
            if word in ['customers', 'orders', 'products', 'stores', 'variants']:
                key_words.append(word)
            elif word in ['count', 'sum', 'avg', 'max', 'min']:
                key_words.append('AGGREGATE')
            elif word in ['where', 'filter', 'having']:
                key_words.append('FILTER')
            elif word in ['join', 'with', 'together']:
                key_words.append('JOIN')
        
        return ' '.join(key_words[:3])  # Limit to 3 key words
    
    def _track_performance(self, question: str, sql: str, execution_time: float, 
                          result_count: int, success: bool):
        """Track performance metrics"""
        self.performance_metrics.append({
            "question": question,
            "sql": sql,
            "execution_time": execution_time,
            "result_count": result_count,
            "success": success,
            "timestamp": time.time()
        })
    
    def _reinforce_successful_pattern(self, pattern: str, sql: str, intent: str):
        """Reinforce successful query patterns"""
        if pattern not in self.query_patterns:
            self.query_patterns[pattern] = {
                "sql_examples": [],
                "success_count": 0,
                "intents": set(),
                "last_used": time.time()
            }
        
        self.query_patterns[pattern]["success_count"] += 1
        self.query_patterns[pattern]["intents"].add(intent)
        self.query_patterns[pattern]["last_used"] = time.time()
        
        # Add SQL example if not already present
        if sql not in self.query_patterns[pattern]["sql_examples"]:
            self.query_patterns[pattern]["sql_examples"].append(sql)
            # Keep only last 5 examples
            if len(self.query_patterns[pattern]["sql_examples"]) > 5:
                self.query_patterns[pattern]["sql_examples"] = self.query_patterns[pattern]["sql_examples"][-5:]
    
    def _learn_from_error(self, pattern: str, sql: str, error_message: str, user_feedback: str):
        """Learn from errors and corrections"""
        error_key = f"{pattern}:{error_message[:50]}" if error_message else pattern
        
        if error_key not in self.error_corrections:
            self.error_corrections[error_key] = {
                "failed_sql": [],
                "corrections": [],
                "error_count": 0,
                "last_seen": time.time()
            }
        
        self.error_corrections[error_key]["error_count"] += 1
        self.error_corrections[error_key]["last_seen"] = time.time()
        
        if sql not in self.error_corrections[error_key]["failed_sql"]:
            self.error_corrections[error_key]["failed_sql"].append(sql)
    
    def _update_schema_insights(self, question: str, sql: str, success: bool):
        """Learn schema relationships and usage patterns"""
        # Extract table names from SQL
        table_pattern = r'\bFROM\s+(\w+)|JOIN\s+(\w+)'
        tables = re.findall(table_pattern, sql, re.IGNORECASE)
        tables = [t[0] or t[1] for t in tables if t[0] or t[1]]
        
        if len(tables) > 1:
            # Learn table relationships
            for i in range(len(tables)):
                for j in range(i+1, len(tables)):
                    table_pair = tuple(sorted([tables[i], tables[j]]))
                    if table_pair not in self.schema_insights:
                        self.schema_insights[table_pair] = {
                            "usage_count": 0,
                            "success_rate": 0,
                            "last_used": time.time()
                        }
                    
                    self.schema_insights[table_pair]["usage_count"] += 1
                    if success:
                        self.schema_insights[table_pair]["success_rate"] = (
                            self.schema_insights[table_pair]["success_rate"] * 
                            (self.schema_insights[table_pair]["usage_count"] - 1) + 1
                        ) / self.schema_insights[table_pair]["usage_count"]
                    self.schema_insights[table_pair]["last_used"] = time.time()
    
    def _learn_user_preferences(self, question: str, sql: str, success: bool):
        """Learn user preferences and patterns"""
        question_lower = question.lower()
        
        # Learn display preferences
        if any(phrase in question_lower for phrase in ["full list", "all details", "show all"]):
            self.user_preferences["prefers_full_details"] = True
        elif any(phrase in question_lower for phrase in ["limit", "first", "top", "few"]):
            self.user_preferences["prefers_limited_results"] = True
        
        # Learn query complexity preferences
        if "JOIN" in sql.upper() or "GROUP BY" in sql.upper():
            self.user_preferences["handles_complex_queries"] = True
        
        # Learn time-based preferences
        if any(word in question_lower for word in ["recent", "latest", "today", "yesterday"]):
            self.user_preferences["frequently_asks_time_based"] = True
    
    def get_learned_examples(self, question: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Get relevant learned examples for a question"""
        intent = self._extract_user_intent(question)
        pattern = self._extract_query_pattern(question)
        
        examples = []
        
        # Get examples from successful queries
        for query_data in self.successful_queries[-50:]:  # Last 50 queries
            if (intent in query_data.get("intent", "") or 
                pattern in self._extract_query_pattern(query_data["question"])):
                examples.append({
                    "question": query_data["question"],
                    "sql": query_data["sql"],
                    "type": "successful_example"
                })
        
        # Get examples from query patterns
        if pattern in self.query_patterns:
            for sql_example in self.query_patterns[pattern]["sql_examples"][-2:]:
                examples.append({
                    "question": f"Example for pattern: {pattern}",
                    "sql": sql_example,
                    "type": "pattern_example"
                })
        
        return examples[:limit]
    
    def get_error_prevention_tips(self, question: str) -> List[str]:
        """Get error prevention tips based on learned patterns"""
        pattern = self._extract_query_pattern(question)
        tips = []
        
        # Check for common errors in this pattern
        for error_key, error_data in self.error_corrections.items():
            if pattern in error_key and error_data["error_count"] > 2:
                tips.append(f"Common error in this pattern: {error_key.split(':')[1]}")
        
        return tips
    
    def get_user_preferences_context(self) -> str:
        """Get user preferences context for prompts"""
        context_parts = []
        
        if self.user_preferences.get("prefers_full_details"):
            context_parts.append("User prefers full details when available")
        
        if self.user_preferences.get("prefers_limited_results"):
            context_parts.append("User often requests limited results")
        
        if self.user_preferences.get("handles_complex_queries"):
            context_parts.append("User can handle complex queries with JOINs")
        
        if self.user_preferences.get("frequently_asks_time_based"):
            context_parts.append("User frequently asks time-based questions")
        
        return "; ".join(context_parts) if context_parts else ""
    
    def get_optimal_query_suggestions(self, question: str) -> List[str]:
        """Get optimal query suggestions based on learned patterns"""
        pattern = self._extract_query_pattern(question)
        suggestions = []
        
        # Find similar successful patterns
        for p, data in self.query_patterns.items():
            if (pattern in p or p in pattern) and data["success_count"] > 3:
                suggestions.extend(data["sql_examples"][-2:])
        
        return suggestions[:3]
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Get learning statistics"""
        return {
            "total_patterns_learned": len(self.query_patterns),
            "total_successful_queries": len(self.successful_queries),
            "total_errors_learned": len(self.error_corrections),
            "schema_relationships_learned": len(self.schema_insights),
            "user_preferences": self.user_preferences,
            "recent_success_rate": self._calculate_recent_success_rate()
        }
    
    def _calculate_recent_success_rate(self) -> float:
        """Calculate recent success rate"""
        recent_metrics = self.performance_metrics[-50:]  # Last 50 interactions
        if not recent_metrics:
            return 0.0
        
        successful = sum(1 for m in recent_metrics if m.get("success", False))
        return successful / len(recent_metrics)
    
    def export_learning_data(self, filename: str = None):
        """Export learning data for analysis"""
        if filename is None:
            filename = f"learning_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.learning_data, f, indent=2, ensure_ascii=False)
        
        return filename
