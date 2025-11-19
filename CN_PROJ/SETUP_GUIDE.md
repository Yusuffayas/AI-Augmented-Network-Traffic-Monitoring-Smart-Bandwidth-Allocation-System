# Network Traffic Monitor & AI-Driven Bandwidth Allocator - Setup Guide

## Overview

This is a **complete, production-ready system** for real-time network traffic monitoring, AI-based bandwidth prediction, and Quality of Service (QoS) management. The system captures live network packets, classifies traffic, predicts bandwidth requirements using machine learning, and optimizes bandwidth allocation.

## System Architecture

The system consists of multiple integrated components:

1. **Packet Capture Daemon** - Sniffs live network traffic and classifies packets
2. **AI Prediction Service** - FastAPI server that predicts bandwidth requirements using LSTM models
3. **Backend API** - tRPC procedures and WebSocket server for real-time updates
4. **Database** - MySQL for persistent storage of traffic logs, predictions, and QoS rules
5. **Web Dashboard** - React-based real-time visualization of network metrics

## Prerequisites

- **Docker & Docker Compose** (recommended for easy deployment)
- **Node.js 18+** and pnpm
- **Python 3.11+**
- **MySQL 8.0+** (or use Docker)
- **Linux system** (for packet capture with root/sudo privileges)

## Quick Start with Docker Compose

### 1. Clone and Setup

```bash
cd /home/ubuntu/network_monitor
```

### 2. Build and Start Services

```bash
docker-compose up -d
```

This will start:
- MySQL database on port 3306
- AI prediction service on port 8000
- Packet capture daemon
- Main web application on port 3000
- Redis cache on port 6379

### 3. Access the Dashboard

Open your browser and navigate to: `http://localhost:3000`

## Manual Setup (Without Docker)

### 1. Database Setup

```bash
# Create database
mysql -u root -p
CREATE DATABASE network_monitor;
CREATE USER 'monitor'@'localhost' IDENTIFIED BY 'monitor_password';
GRANT ALL PRIVILEGES ON network_monitor.* TO 'monitor'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Database Migration

```bash
pnpm db:push
```

### 4. Start Services

**Terminal 1 - AI Service:**
```bash
cd ai_service
python app.py
```

**Terminal 2 - Packet Capture (requires sudo):**
```bash
cd packet_capture
sudo python sniffer.py -i eth0 -o traffic_logs.csv
```

**Terminal 3 - Web Application:**
```bash
pnpm dev
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=mysql://monitor:monitor_password@localhost:3306/network_monitor

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Application
PORT=3000
NODE_ENV=development
```

### Network Interface Selection

The packet sniffer needs to know which network interface to monitor. Common interfaces:
- `eth0` - Primary Ethernet
- `wlan0` - WiFi
- `docker0` - Docker bridge

To list available interfaces:
```bash
# Linux
ip link show

# macOS
ifconfig
```

## API Endpoints

### Prediction Service (FastAPI)

**Base URL:** `http://localhost:8000`

#### Predict Bandwidth
```bash
POST /predict
Content-Type: application/json

{
  "traffic_type": "video",
  "packet_count": 1000,
  "byte_count": 1500000,
  "average_packet_size": 1500,
  "packet_rate": 100,
  "current_throughput": 5.0
}
```

#### Batch Predictions
```bash
POST /predict/batch
Content-Type: application/json

[
  {
    "traffic_type": "video",
    "current_throughput": 5.0
  },
  {
    "traffic_type": "voice",
    "current_throughput": 0.1
  }
]
```

#### Allocate Bandwidth
```bash
POST /allocate
Content-Type: application/json

{
  "predictions": [...],
  "total_bandwidth_mbps": 100.0
}
```

#### Set QoS Rule
```bash
POST /qos/rule
Content-Type: application/json

{
  "traffic_type": "video",
  "min_bandwidth": 5.0,
  "max_bandwidth": 50.0,
  "priority": 3,
  "dscp": 46
}
```

### Web Application (tRPC)

**Base URL:** `http://localhost:3000/api/trpc`

#### Get Traffic Logs
```typescript
trpc.traffic.getLogs.useQuery({ limit: 100, offset: 0 })
```

#### Get Active Flows
```typescript
trpc.network.getFlows.useQuery()
```

#### Get Predictions
```typescript
trpc.predictions.getAll.useQuery({ trafficType: 'video', limit: 100 })
```

#### Get System Alerts
```typescript
trpc.alerts.getAlerts.useQuery({ unresolved: true, limit: 50 })
```

## Database Schema

### Tables

1. **traffic_logs** - Captured network packets
   - timestamp, sourceIp, destinationIp, protocol, trafficType, packetSize, throughput, priority

2. **predictions** - AI bandwidth predictions
   - timestamp, trafficType, predictedBandwidth, confidence, actualBandwidth, error

3. **qos_rules** - Quality of Service policies
   - trafficType, priority, minBandwidth, maxBandwidth, dscp, enabled

4. **network_interfaces** - Monitored network interfaces
   - name, ipAddress, macAddress, totalBandwidth, currentUsage, isActive

5. **active_flows** - Current network flows
   - sourceIp, destinationIp, protocol, trafficType, currentBandwidth, allocatedBandwidth

6. **system_alerts** - System alerts and notifications
   - severity, title, message, resolved, createdAt

## Traffic Classification

The system classifies traffic into four types based on port numbers and protocols:

### Video (Priority 3)
- Ports: 1935, 3478, 5004, 8554, 6970-6979
- Protocols: RTMP, RTP, RTSP
- Bandwidth: 5-50 Mbps

### Voice (Priority 3)
- Ports: 5060-5062, 16384-16396
- Protocols: SIP, RTP
- Bandwidth: 0.1-10 Mbps

### File (Priority 1)
- Ports: 20, 21, 22, 25, 110, 143, 445, 3389, 8080, 8443
- Protocols: FTP, SFTP, SMTP, POP3, IMAP, SMB, HTTP, HTTPS
- Bandwidth: 0.5-30 Mbps

### Background (Priority 0)
- Ports: 53, 123, 161, 389, 3306, 5432
- Protocols: DNS, NTP, SNMP, LDAP, MySQL, PostgreSQL
- Bandwidth: 0-20 Mbps

## AI Model

The system uses an **LSTM (Long Short-Term Memory)** neural network for bandwidth prediction:

- **Input:** Historical traffic metrics (packet rate, size, type)
- **Output:** Predicted bandwidth requirement (Mbps)
- **Confidence:** 0-100% based on historical consistency
- **Fallback:** Rule-based prediction if insufficient history

### Model Training

The model is trained on historical traffic data. To train with your data:

```python
from ai_service.predictor import BandwidthPredictor

predictor = BandwidthPredictor(use_ml=True)
training_data = [
    ([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0], 5.5),
    # ... more training samples
]
predictor.train(training_data)
```

## QoS Management

### Default QoS Rules

| Traffic Type | Min BW | Max BW | Priority | DSCP |
|---|---|---|---|---|
| Video | 5.0 | 50.0 | 3 | 46 |
| Voice | 0.1 | 10.0 | 3 | 46 |
| File | 0.5 | 30.0 | 1 | 10 |
| Background | 0.0 | 20.0 | 0 | 0 |

### Bandwidth Allocation Algorithm

1. **High-Priority Traffic First** (Video, Voice)
   - Reserve 20% buffer above predicted requirement
   - Ensure minimum bandwidth guarantee

2. **Medium-Priority Traffic** (File)
   - Allocate predicted requirement
   - Share remaining capacity

3. **Low-Priority Traffic** (Background)
   - Use leftover bandwidth
   - Can be throttled if needed

## Real-Time Dashboard

### Features

1. **Network Overview**
   - Total available bandwidth
   - Current usage and utilization percentage
   - Active flows count
   - Active alerts count

2. **Traffic Visualization**
   - Line chart: Bandwidth usage over time
   - Pie chart: Traffic distribution by type
   - Bar chart: Traffic by priority

3. **Active Flows Table**
   - Source/destination IPs
   - Traffic type with color coding
   - Current and allocated bandwidth
   - Priority level

4. **System Alerts**
   - Severity levels: Info, Warning, Critical
   - Alert title and message
   - Timestamp and resolution status

## WebSocket Real-Time Updates

The dashboard receives real-time updates via WebSocket:

```javascript
// Client-side (React)
useEffect(() => {
  const socket = io('http://localhost:3000');
  
  socket.on('traffic-update', (data) => {
    console.log('Traffic update:', data);
  });
  
  socket.on('traffic-by-type', (data) => {
    console.log('Traffic by type:', data);
  });
  
  return () => socket.disconnect();
}, []);
```

## Troubleshooting

### Packet Capture Not Working

```bash
# Check if running with sufficient privileges
sudo python packet_capture/sniffer.py -i eth0

# Verify network interface exists
ip link show

# Check for libpcap installation
apt-get install libpcap-dev
```

### Database Connection Issues

```bash
# Test MySQL connection
mysql -h localhost -u monitor -p network_monitor

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

### AI Service Errors

```bash
# Check if FastAPI is running
curl http://localhost:8000/health

# Check logs
docker logs network_monitor_ai

# Verify TensorFlow installation
python -c "import tensorflow; print(tensorflow.__version__)"
```

### WebSocket Connection Failed

```bash
# Check if Socket.IO is properly configured
# Verify CORS settings in server/websocket.ts
# Check browser console for connection errors
```

## Performance Optimization

### For High-Traffic Networks

1. **Increase packet batch size** in sniffer.py
2. **Reduce WebSocket update frequency** (currently 1 second)
3. **Use Redis caching** for frequently accessed data
4. **Enable database indexing** on timestamp and trafficType

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX idx_traffic_timestamp ON traffic_logs(timestamp);
CREATE INDEX idx_traffic_type ON traffic_logs(trafficType);
CREATE INDEX idx_flows_source ON active_flows(sourceIp);
```

## Security Considerations

1. **Packet Capture** - Requires root/sudo privileges
2. **Database** - Use strong passwords, enable SSL
3. **API Authentication** - Implement OAuth2 or JWT tokens
4. **Network Isolation** - Use Docker networks for service isolation
5. **Data Privacy** - Ensure compliance with local regulations

## Deployment

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start services
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes Deployment

Create Kubernetes manifests for:
- MySQL StatefulSet
- AI Service Deployment
- Packet Capture DaemonSet
- Web Application Deployment
- Redis StatefulSet

## Monitoring and Maintenance

### Health Checks

```bash
# Check AI service
curl http://localhost:8000/health

# Check web application
curl http://localhost:3000/health

# Check database
mysql -u monitor -p -e "SELECT 1"
```

### Log Management

```bash
# View application logs
docker-compose logs web

# View AI service logs
docker-compose logs ai_service

# View packet capture logs
docker-compose logs packet_sniffer
```

### Backup and Recovery

```bash
# Backup database
mysqldump -u monitor -p network_monitor > backup.sql

# Restore database
mysql -u monitor -p network_monitor < backup.sql
```

## Support and Documentation

For detailed API documentation, see:
- `/api/docs` - Swagger UI for FastAPI
- `/api/redoc` - ReDoc for FastAPI
- tRPC documentation in `server/routers.ts`

## License

This project is provided as-is for network monitoring and optimization purposes.

## Contributing

To contribute improvements:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

**Last Updated:** November 2025
**Version:** 1.0.0
