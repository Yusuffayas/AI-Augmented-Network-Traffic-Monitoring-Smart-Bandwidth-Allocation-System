#!/usr/bin/env python3
"""
AI-Based Bandwidth Prediction Service
Uses LSTM neural network to predict bandwidth requirements
"""

import numpy as np
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import TensorFlow/Keras, fallback to simple rule-based model
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logger.warning("TensorFlow not available, using rule-based prediction")


@dataclass
class TrafficMetrics:
    """Traffic metrics for prediction"""
    traffic_type: str
    packet_count: int
    byte_count: int
    average_packet_size: float
    packet_rate: float  # packets per second
    current_throughput: float  # Mbps
    timestamp: datetime


class BandwidthPredictor:
    """Predict bandwidth requirements using ML or rule-based methods"""
    
    def __init__(self, use_ml: bool = True):
        """
        Initialize bandwidth predictor
        
        Args:
            use_ml: Whether to use ML model (if available)
        """
        self.use_ml = use_ml and TENSORFLOW_AVAILABLE
        self.model = None
        self.scaler = None
        self.traffic_history: Dict[str, List[float]] = {
            'video': [],
            'voice': [],
            'file': [],
            'background': []
        }
        
        if self.use_ml:
            self._build_model()
    
    def _build_model(self):
        """Build LSTM model for bandwidth prediction"""
        if not TENSORFLOW_AVAILABLE:
            return
        
        # Simple LSTM model for time series prediction
        self.model = keras.Sequential([
            layers.LSTM(64, activation='relu', input_shape=(10, 1), return_sequences=True),
            layers.Dropout(0.2),
            layers.LSTM(32, activation='relu', return_sequences=False),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1)
        ])
        
        self.model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        logger.info("LSTM model built successfully")
    
    def _rule_based_prediction(self, metrics: TrafficMetrics) -> Tuple[float, float]:
        """
        Rule-based bandwidth prediction
        
        Returns: (predicted_bandwidth_mbps, confidence_0_to_100)
        """
        traffic_type = metrics.traffic_type
        
        # Base bandwidth requirements by traffic type
        base_bandwidth = {
            'video': 5.0,      # 5 Mbps minimum for video
            'voice': 0.1,      # 0.1 Mbps for voice
            'file': 2.0,       # 2 Mbps for file transfer
            'background': 0.5  # 0.5 Mbps for background
        }
        
        base = base_bandwidth.get(traffic_type, 1.0)
        
        # Adjust based on packet rate
        packet_rate_factor = min(metrics.packet_rate / 1000.0, 2.0)  # Cap at 2x
        
        # Adjust based on average packet size
        packet_size_factor = min(metrics.average_packet_size / 1500.0, 1.5)  # Cap at 1.5x
        
        # Calculate predicted bandwidth
        predicted = base * packet_rate_factor * packet_size_factor
        
        # Calculate confidence based on consistency
        if traffic_type in self.traffic_history:
            history = self.traffic_history[traffic_type]
            if len(history) > 5:
                variance = np.var(history[-5:])
                confidence = max(50, min(95, 100 - variance * 10))
            else:
                confidence = 70
        else:
            confidence = 60
        
        return predicted, confidence
    
    def _ml_based_prediction(self, metrics: TrafficMetrics) -> Tuple[float, float]:
        """
        ML-based bandwidth prediction using LSTM
        
        Returns: (predicted_bandwidth_mbps, confidence_0_to_100)
        """
        if not self.model or not TENSORFLOW_AVAILABLE:
            return self._rule_based_prediction(metrics)
        
        try:
            # Prepare features
            traffic_type = metrics.traffic_type
            
            # Get historical data
            if traffic_type in self.traffic_history:
                history = self.traffic_history[traffic_type]
                if len(history) >= 10:
                    # Use last 10 data points
                    X = np.array(history[-10:]).reshape(1, 10, 1)
                    
                    # Make prediction
                    prediction = self.model.predict(X, verbose=0)
                    predicted_bandwidth = float(prediction[0][0])
                    
                    # Ensure non-negative
                    predicted_bandwidth = max(0.1, predicted_bandwidth)
                    
                    # Calculate confidence
                    confidence = min(95, 70 + len(history) / 100)
                    
                    return predicted_bandwidth, confidence
            
            # Fallback to rule-based if not enough history
            return self._rule_based_prediction(metrics)
        
        except Exception as e:
            logger.error(f"ML prediction failed: {e}, falling back to rule-based")
            return self._rule_based_prediction(metrics)
    
    def predict(self, metrics: TrafficMetrics) -> Dict:
        """
        Predict bandwidth for given traffic metrics
        
        Args:
            metrics: TrafficMetrics object
        
        Returns:
            Dict with prediction results
        """
        # Update history
        if metrics.traffic_type in self.traffic_history:
            self.traffic_history[metrics.traffic_type].append(metrics.current_throughput)
            # Keep only last 100 data points
            if len(self.traffic_history[metrics.traffic_type]) > 100:
                self.traffic_history[metrics.traffic_type] = self.traffic_history[metrics.traffic_type][-100:]
        
        # Get prediction
        if self.use_ml:
            predicted_bandwidth, confidence = self._ml_based_prediction(metrics)
        else:
            predicted_bandwidth, confidence = self._rule_based_prediction(metrics)
        
        return {
            'traffic_type': metrics.traffic_type,
            'predicted_bandwidth_mbps': round(predicted_bandwidth, 2),
            'confidence': round(confidence, 1),
            'current_throughput_mbps': round(metrics.current_throughput, 2),
            'packet_rate': round(metrics.packet_rate, 2),
            'average_packet_size': round(metrics.average_packet_size, 2),
            'timestamp': metrics.timestamp.isoformat(),
            'model_type': 'lstm' if self.use_ml else 'rule_based'
        }
    
    def train(self, training_data: List[Tuple[List[float], float]]):
        """
        Train the ML model with historical data
        
        Args:
            training_data: List of (features, target) tuples
        """
        if not self.use_ml or not TENSORFLOW_AVAILABLE:
            logger.info("ML training not available")
            return
        
        try:
            X = np.array([x[0] for x in training_data]).reshape(-1, 10, 1)
            y = np.array([x[1] for x in training_data])
            
            self.model.fit(X, y, epochs=10, batch_size=32, verbose=0)
            logger.info(f"Model trained with {len(training_data)} samples")
        except Exception as e:
            logger.error(f"Training failed: {e}")


class BandwidthAllocator:
    """Allocate bandwidth based on predictions and QoS rules"""
    
    def __init__(self, total_bandwidth_mbps: float = 100.0):
        """
        Initialize bandwidth allocator
        
        Args:
            total_bandwidth_mbps: Total available bandwidth
        """
        self.total_bandwidth = total_bandwidth_mbps
        self.allocations = {}
    
    def allocate(self, predictions: List[Dict]) -> Dict:
        """
        Allocate bandwidth based on predictions
        
        Args:
            predictions: List of prediction dicts from predictor
        
        Returns:
            Allocation dict with bandwidth per traffic type
        """
        # Sort by priority (higher priority first)
        priority_map = {'video': 3, 'voice': 3, 'file': 1, 'background': 0}
        sorted_predictions = sorted(
            predictions,
            key=lambda x: priority_map.get(x['traffic_type'], 0),
            reverse=True
        )
        
        allocations = {}
        remaining_bandwidth = self.total_bandwidth
        
        # First pass: allocate to high-priority traffic
        for pred in sorted_predictions:
            traffic_type = pred['traffic_type']
            predicted = pred['predicted_bandwidth_mbps']
            priority = priority_map.get(traffic_type, 0)
            
            if priority >= 2:  # High priority (video, voice)
                allocated = min(predicted * 1.2, remaining_bandwidth)  # 20% buffer
                allocations[traffic_type] = allocated
                remaining_bandwidth -= allocated
        
        # Second pass: allocate remaining bandwidth to other traffic
        for pred in sorted_predictions:
            traffic_type = pred['traffic_type']
            if traffic_type not in allocations:
                predicted = pred['predicted_bandwidth_mbps']
                allocated = min(predicted, remaining_bandwidth)
                allocations[traffic_type] = allocated
                remaining_bandwidth -= allocated
        
        self.allocations = allocations
        
        return {
            'allocations': allocations,
            'total_allocated': self.total_bandwidth - remaining_bandwidth,
            'remaining': remaining_bandwidth,
            'utilization_percent': round(((self.total_bandwidth - remaining_bandwidth) / self.total_bandwidth) * 100, 1)
        }


class QosController:
    """QoS control and traffic shaping"""
    
    def __init__(self):
        """Initialize QoS controller"""
        self.rules = {}
        self.active_flows = {}
    
    def set_qos_rule(self, traffic_type: str, min_bw: float, max_bw: float, priority: int, dscp: int = 0):
        """
        Set QoS rule for traffic type
        
        Args:
            traffic_type: Type of traffic (video, voice, file, background)
            min_bw: Minimum bandwidth in Mbps
            max_bw: Maximum bandwidth in Mbps
            priority: Priority level (0-3)
            dscp: DSCP marking value
        """
        self.rules[traffic_type] = {
            'min_bandwidth': min_bw,
            'max_bandwidth': max_bw,
            'priority': priority,
            'dscp': dscp
        }
    
    def apply_qos(self, flow_id: str, traffic_type: str, current_bw: float) -> Dict:
        """
        Apply QoS rules to a flow
        
        Args:
            flow_id: Flow identifier
            traffic_type: Type of traffic
            current_bw: Current bandwidth usage
        
        Returns:
            QoS action dict
        """
        if traffic_type not in self.rules:
            return {'action': 'none', 'reason': 'no_rule'}
        
        rule = self.rules[traffic_type]
        
        # Check if bandwidth exceeds maximum
        if current_bw > rule['max_bandwidth']:
            return {
                'action': 'throttle',
                'target_bandwidth': rule['max_bandwidth'],
                'reason': 'exceeds_max',
                'dscp': rule['dscp']
            }
        
        # Check if bandwidth is below minimum
        if current_bw < rule['min_bandwidth']:
            return {
                'action': 'prioritize',
                'target_bandwidth': rule['min_bandwidth'],
                'reason': 'below_min',
                'dscp': rule['dscp']
            }
        
        return {
            'action': 'maintain',
            'target_bandwidth': current_bw,
            'reason': 'within_limits',
            'dscp': rule['dscp']
        }


# Global predictor instance
_predictor = None

def get_predictor() -> BandwidthPredictor:
    """Get or create global predictor instance"""
    global _predictor
    if _predictor is None:
        _predictor = BandwidthPredictor(use_ml=TENSORFLOW_AVAILABLE)
    return _predictor


if __name__ == '__main__':
    # Test the predictor
    predictor = BandwidthPredictor(use_ml=False)
    
    # Test metrics
    metrics = TrafficMetrics(
        traffic_type='video',
        packet_count=1000,
        byte_count=1500000,
        average_packet_size=1500,
        packet_rate=100,
        current_throughput=5.0,
        timestamp=datetime.now()
    )
    
    prediction = predictor.predict(metrics)
    print(json.dumps(prediction, indent=2))
