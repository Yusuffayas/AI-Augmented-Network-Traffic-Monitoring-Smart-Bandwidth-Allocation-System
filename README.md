# AI-Augmented-Network-Traffic-Monitoring-Smart-Bandwidth-Allocation-System
AI-powered network monitoring system using Java and Python. Simulates real-time traffic, processes packets with a multithreaded TCP server, predicts bandwidth via a Python AI module, and logs data for analysis. Lightweight, modular, and ideal for learning networking + AI.
# AI-Augmented Network Traffic Monitoring & Smart Bandwidth Allocation System

CHAPTER 1 – PROBLEM DESCRIPTION

1.1 Problem Overview
Modern digital ecosystems generate a continuously evolving mix of network traffic categories—video streams, voice communication, file transfers, background synchronization, and IoT telemetry. Each category carries unique QoS demands such as latency tolerance, jitter sensitivity, and bandwidth requirements. Static bandwidth allocation strategies cannot adapt to these dynamic behaviors. Manual monitoring systems lack real-time prediction, suffer delay, and provide limited granularity.

To solve these limitations, this project introduces an AI-Augmented Network Traffic Monitoring & Smart Bandwidth Allocation System using a Java multithreaded TCP server, autonomous traffic-generating Java clients, and a Python-based AI inference engine. The system captures live traffic, logs telemetry, and computes intelligent bandwidth forecasts through AI-driven logic.

1.2 Objective of the Problem

Primary Objectives:
• Develop a multithreaded TCP monitoring server handling multiple simultaneous clients.
• Implement a client generating realistic traffic types (video, voice, file, background).
• Integrate a Python AI model estimating optimal bandwidth for each traffic scenario.
• Log all traffic in real time using structured CSV-based storage.
• Demonstrate cross-language communication between Java and Python.

Sub-Objectives:
• Implement scalable thread pool architecture using ExecutorService.
• Ensure resilient TCP communication with exception handling and timeouts.
• Maintain modularity for future AI/ML model upgrades.
• Standardize message formats for client-server communication.

1.3 Scope of the Work
The system handles:
• Real-time traffic monitoring  
• Concurrent client load  
• AI-driven bandwidth prediction  
• Structured CSV logging  
• Modular architecture suitable for teaching and experimentation  

1.4 Constraints
• Single-node deployment  
• Heuristic AI model  
• No encryption  
• Localhost-only AI inference  
• Four fixed traffic categories  
• I/O overhead in CSV logging  

1.5 Existing System
Traditional monitoring tools (SNMP, Wireshark) lack predictive capability. Online tools (Speedtest) provide static metrics only. Enterprise systems (Cisco DNA, Mist AI) are costly and complex.  
This project provides a lightweight, customizable, AI-assisted alternative.

-------------------------------------------------------------

CHAPTER 2 – REQUIREMENTS

2.1 Hardware Requirements

Development Machine:
• Intel Core i3 / Ryzen 3  
• 8 GB RAM  
• 256 GB SSD  
• 100 Mbps network

Server Machine:
• Intel Core i5 / Ryzen 5  
• 8–16 GB RAM  
• 1 Gbps Ethernet  

Client Machine:
• Dual-core CPU  
• 4 GB RAM  
• JDK 8+  
• Stable network connectivity  

2.2 Software Requirements

Backend:
• Java SE (JDK 8+)  
• Python 3.9+  
• Flask/FastAPI  
• CSV logging utilities  

Networking:
• Java Sockets (TCP)  
• ServerSocket API  
• HttpURLConnection  

Tools:
• VS Code / IntelliJ / Eclipse  
• pip package manager  

Operating System:
• Windows / Linux / macOS  

Network Configuration:
• Port 5050 → Java TCP Server  
• Port 8000 → Python AI Server  

2.3 Other Requirements

Network Requirements:
• Firewall rules permitting ports 5050 & 8000  
• Stable low-latency connection  

Security Requirements:
• Input validation  
• Safe file writing  
• Thread-safe resource access  

Operational Requirements:
• Start Python AI → Start Java Server → Start Clients  
• Write permissions for logs  
• Multi-client support  

Installation Requirements:
• JDK + Environment variables  
• Python + pip  
• Required Python packages installed  

Performance Requirements:
• Thread pool for 10 concurrent clients  
• AI latency <150 ms  
• Minimal I/O overhead  

Maintainability:
• Modular code separation  
• Easily replaceable AI logic  
• Configurable ports/endpoints  

-------------------------------------------------------------

CHAPTER 3 – DESIGN AND IMPLEMENTATION

3.1 System Design (Three-Tier Architecture)

1. Presentation Layer (Java Client)
• Simulates traffic types: video, voice, file transfer, background.
• Utilizes TCP sockets for communication.
• Generates realistic packet sizes at periodic intervals.

2. Application Layer (Java Server)
• Multithreaded server using ExecutorService.
• Accepts multiple clients concurrently.
• Parses packets, logs traffic, requests AI predictions.
• Displays bandwidth estimates in real time.

3. Data Layer
• CSV file (traffic_log.csv) for persistent storage.
• Timestamp-based logging.
• Future extensibility toward SQL databases.

3.2 Module Description

3.2.1 Client Module
• Random traffic type selection.
• Random packet size generation.
• Sends format: Client-XX|trafficType|packetSize.
• Persistent TCP connection to server.

3.2.2 Server Module
• Handles multiple client connections via thread pool.
• Parses incoming packets.
• Logs data with synchronized file operations.
• Sends traffic metadata to Python AI API.
• Outputs predicted bandwidth.

3.2.3 AI Prediction Module
• Accepts JSON input:
  {"trafficType":"video","packetSize":4500}
• Uses heuristic logic to estimate bandwidth.
• Returns JSON output:
  {"predictedBandwidth":8.7}
• Runs on port 8000 using Flask/FastAPI.

3.2.4 Logging Module
• Appends timestamp, client ID, traffic type, packet size.
• CSV used for analytics and ML datasets.

3.2.5 Thread Management Module
• ExecutorService with fixed thread pool.
• Prevents thread starvation and scaling issues.

3.3 Input/Output Details

Client Output Example:
📤 Sent: Client-12|video|4500

Server Output:
Received: Client-7|file|3800  
Predicted Bandwidth: 5.8 Mbps

AI Output Example:
{"predictedBandwidth":3.4}

CSV Example:
2025-11-14 10:20:36,Client-4,video,5400

-------------------------------------------------------------

CHAPTER 4 – SYSTEM TESTING AND REPORTS

4.1 Screenshots  
(Add images in final document)

4.3 Explanation of Logic

4.3.1 AI Prediction Flow
1. Java server sends JSON to Python AI.
2. AI validates and processes input.
3. Uses base bandwidth + (packetSize % 10 × 0.2).
4. Adds random variation.
5. Returns predicted Mbps.

4.3.2 Automatic Packet Generation
• Random sizes (1000–6000).  
• Mirrors real MTU distribution.  

4.3.3 Multi-Step Wizard Logic
• Step-by-step prediction flow.  
• Ensures clean UI/UX in dashboards.  

4.3.4 Recommendation Logic
• Based on bandwidth thresholds.  
• Provides upgrade/reduction suggestions.  

4.3.5 Live Streaming Prediction
• Auto predictions every X seconds.  
• Real-time chart updates.  

4.3.6 Dashboard Analytics Logic
• Line chart → bandwidth over time.  
• Pie chart → traffic distribution.  
• Bar chart → average bandwidth.  

4.3.7 Java Socket Communication Logic
• Multi-threaded client handler.  
• Non-blocking I/O.  
• Packet format: Client-5|video|4096.  

4.3.8 History & Storage Logic
• Browser localStorage in dashboards.  
• CSV export available.  

4.4 Time & Space Complexity

Client: O(1)  
Server Processing: O(1)  
CSV Logging: O(1) amortized  
AI Prediction: O(1)  
Overall: O(n+c) time, O(n) space  

-------------------------------------------------------------

CHAPTER 5 – CONCLUSION

5.1 Summary
The system integrates Java-based real-time traffic generation, multithreaded TCP monitoring, and Python AI prediction. It delivers dynamic bandwidth forecasting, structured logging, and modular architecture suitable for academic and research environments.

Key Achievements:
• Concurrent Java TCP server  
• Realistic traffic simulation  
• AI-based bandwidth prediction  
• CSV logging for analytics  
• Java-Python interoperability  
• Scalable modular design  

5.2 Limitations
• CSV-only storage  
• Heuristic AI model  
• No encryption  
• Manual AI/server startup  
• Single-node deployment  
• Limited traffic categories  

5.3 Future Enhancements
• Database integration (MySQL/PostgreSQL)  
• ML-based prediction models  
• Real-time dashboard  
• TLS/SSL security  
• Load balancing and microservices  
• Deep Packet Inspection  
• More traffic categories  

ADVANTAGES
• Real-time traffic monitoring  
• AI-driven bandwidth prediction  
• Scalable multithreaded architecture  
• Lightweight and customizable  
• Cross-language Java–Python integration  
• Extensive CSV logs enabling analytics  
• Low latency inference  

REAL-TIME APPLICATIONS
1. ISP bandwidth management  
2. Enterprise IT traffic monitoring  
3. Cloud and data center resource scaling  
4. Smart city IoT networks  
5. University campus network systems  
6. Telecom traffic engineering  
7. Cybersecurity anomaly detection  
8. Video streaming traffic optimization  
9. Corporate WAN monitoring  

REFERENCES
• Cisco Systems. (2023). AI-Driven Network Analytics.  
• Juniper Networks. (2024). Mist AI Technical Overview.  
• Oracle. Java Networking Documentation.  
• Python Software Foundation. Flask/FastAPI Docs.  
• Tanenbaum, A. Computer Networks (5th Ed.).  
• Kurose & Ross. A Top-Down Approach.  
• GeeksforGeeks – Java ExecutorService.  
• IEEE Xplore – ML-Based Bandwidth Prediction Studies.  
