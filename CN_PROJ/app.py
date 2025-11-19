#!/usr/bin/env python3
"""
FastAPI server for bandwidth prediction and QoS management
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging
import json

from predictor import (
    BandwidthPredictor,
    BandwidthAllocator,
    QosController,
    TrafficMetrics,
    get_predictor
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Network Traffic Predictor API",
    description="AI-driven bandwidth prediction and QoS management",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
predictor = get_predictor()
allocator = BandwidthAllocator(total_bandwidth_mbps=100.0)
qos_controller = QosController()

# Initialize default QoS rules
qos_controller.set_qos_rule('video', min_bw=5.0, max_bw=50.0, priority=3, dscp=46)
qos_controller.set_qos_rule('voice', min_bw=0.1, max_bw=10.0, priority=3, dscp=46)
qos_controller.set_qos_rule('file', min_bw=0.5, max_bw=30.0, priority=1, dscp=10)
qos_controller.set_qos_rule('background', min_bw=0.0, max_bw=20.0, priority=0, dscp=0)


# Pydantic models
class PredictionRequest(BaseModel):
    """Request for bandwidth prediction"""
    traffic_type: str
    packet_count: int = 0
    byte_count: int = 0
    average_packet_size: float = 1500
    packet_rate: float = 100
    current_throughput: float = 0
    timestamp: Optional[str] = None


class PredictionResponse(BaseModel):
    """Response from prediction"""
    traffic_type: str
    predicted_bandwidth_mbps: float
    confidence: float
    current_throughput_mbps: float
    packet_rate: float
    average_packet_size: float
    timestamp: str
    model_type: str


class AllocationRequest(BaseModel):
    """Request for bandwidth allocation"""
    predictions: List[PredictionRequest]
    total_bandwidth_mbps: float = 100.0


class AllocationResponse(BaseModel):
    """Response from allocation"""
    allocations: Dict[str, float]
    total_allocated: float
    remaining: float
    utilization_percent: float


class QosRuleRequest(BaseModel):
    """Request to set QoS rule"""
    traffic_type: str
    min_bandwidth: float
    max_bandwidth: float
    priority: int
    dscp: int = 0


class QosActionRequest(BaseModel):
    """Request for QoS action"""
    flow_id: str
    traffic_type: str
    current_bandwidth: float


class QosActionResponse(BaseModel):
    """Response from QoS action"""
    action: str
    target_bandwidth: float
    reason: str
    dscp: int


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "network-traffic-predictor",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


# Prediction endpoints
@app.post("/predict", response_model=PredictionResponse)
async def predict_bandwidth(request: PredictionRequest):
    """
    Predict bandwidth requirements for traffic
    
    Args:
        request: PredictionRequest with traffic metrics
    
    Returns:
        PredictionResponse with prediction results
    """
    try:
        # Create metrics object
        metrics = TrafficMetrics(
            traffic_type=request.traffic_type,
            packet_count=request.packet_count,
            byte_count=request.byte_count,
            average_packet_size=request.average_packet_size,
            packet_rate=request.packet_rate,
            current_throughput=request.current_throughput,
            timestamp=datetime.fromisoformat(request.timestamp) if request.timestamp else datetime.now()
        )
        
        # Get prediction
        prediction = predictor.predict(metrics)
        
        logger.info(f"Prediction for {request.traffic_type}: {prediction['predicted_bandwidth_mbps']} Mbps")
        
        return PredictionResponse(**prediction)
    
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch", response_model=List[PredictionResponse])
async def predict_batch(requests: List[PredictionRequest]):
    """
    Predict bandwidth for multiple traffic types
    
    Args:
        requests: List of PredictionRequest
    
    Returns:
        List of PredictionResponse
    """
    try:
        results = []
        for request in requests:
            metrics = TrafficMetrics(
                traffic_type=request.traffic_type,
                packet_count=request.packet_count,
                byte_count=request.byte_count,
                average_packet_size=request.average_packet_size,
                packet_rate=request.packet_rate,
                current_throughput=request.current_throughput,
                timestamp=datetime.fromisoformat(request.timestamp) if request.timestamp else datetime.now()
            )
            prediction = predictor.predict(metrics)
            results.append(PredictionResponse(**prediction))
        
        return results
    
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Allocation endpoints
@app.post("/allocate", response_model=AllocationResponse)
async def allocate_bandwidth(request: AllocationRequest):
    """
    Allocate bandwidth based on predictions
    
    Args:
        request: AllocationRequest with predictions
    
    Returns:
        AllocationResponse with allocation results
    """
    try:
        # Get predictions
        predictions = []
        for pred_req in request.predictions:
            metrics = TrafficMetrics(
                traffic_type=pred_req.traffic_type,
                packet_count=pred_req.packet_count,
                byte_count=pred_req.byte_count,
                average_packet_size=pred_req.average_packet_size,
                packet_rate=pred_req.packet_rate,
                current_throughput=pred_req.current_throughput,
                timestamp=datetime.fromisoformat(pred_req.timestamp) if pred_req.timestamp else datetime.now()
            )
            prediction = predictor.predict(metrics)
            predictions.append(prediction)
        
        # Update allocator bandwidth
        allocator.total_bandwidth = request.total_bandwidth_mbps
        
        # Allocate bandwidth
        allocation = allocator.allocate(predictions)
        
        logger.info(f"Bandwidth allocation: {allocation}")
        
        return AllocationResponse(**allocation)
    
    except Exception as e:
        logger.error(f"Allocation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# QoS endpoints
@app.post("/qos/rule")
async def set_qos_rule(request: QosRuleRequest):
    """
    Set QoS rule for traffic type
    
    Args:
        request: QosRuleRequest
    
    Returns:
        Success message
    """
    try:
        qos_controller.set_qos_rule(
            traffic_type=request.traffic_type,
            min_bw=request.min_bandwidth,
            max_bw=request.max_bandwidth,
            priority=request.priority,
            dscp=request.dscp
        )
        
        logger.info(f"QoS rule set for {request.traffic_type}")
        
        return {
            "status": "success",
            "message": f"QoS rule set for {request.traffic_type}",
            "rule": {
                "traffic_type": request.traffic_type,
                "min_bandwidth": request.min_bandwidth,
                "max_bandwidth": request.max_bandwidth,
                "priority": request.priority,
                "dscp": request.dscp
            }
        }
    
    except Exception as e:
        logger.error(f"QoS rule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/qos/rules")
async def get_qos_rules():
    """
    Get all QoS rules
    
    Returns:
        Dict of QoS rules
    """
    return {"rules": qos_controller.rules}


@app.post("/qos/apply", response_model=QosActionResponse)
async def apply_qos(request: QosActionRequest):
    """
    Apply QoS rules to a flow
    
    Args:
        request: QosActionRequest
    
    Returns:
        QosActionResponse with action
    """
    try:
        action = qos_controller.apply_qos(
            flow_id=request.flow_id,
            traffic_type=request.traffic_type,
            current_bw=request.current_bandwidth
        )
        
        logger.info(f"QoS action for {request.flow_id}: {action['action']}")
        
        return QosActionResponse(**action)
    
    except Exception as e:
        logger.error(f"QoS apply error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Statistics endpoints
@app.get("/stats")
async def get_statistics():
    """
    Get predictor statistics
    
    Returns:
        Statistics dict
    """
    return {
        "predictor": {
            "model_type": "lstm" if predictor.use_ml else "rule_based",
            "traffic_history_size": {k: len(v) for k, v in predictor.traffic_history.items()}
        },
        "allocator": {
            "total_bandwidth": allocator.total_bandwidth,
            "current_allocations": allocator.allocations
        },
        "qos": {
            "rules_count": len(qos_controller.rules),
            "active_flows": len(qos_controller.active_flows)
        }
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Network Traffic Predictor API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "predict_batch": "/predict/batch",
            "allocate": "/allocate",
            "qos_rule": "/qos/rule",
            "qos_rules": "/qos/rules",
            "qos_apply": "/qos/apply",
            "stats": "/stats"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
