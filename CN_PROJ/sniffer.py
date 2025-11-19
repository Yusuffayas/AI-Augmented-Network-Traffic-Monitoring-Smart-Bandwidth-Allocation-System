#!/usr/bin/env python3
"""
Network Packet Sniffer and Traffic Classifier
Captures live network traffic and classifies it by type
"""

import socket
import struct
import textwrap
import json
import sys
import argparse
from datetime import datetime
from typing import Dict, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Traffic classification rules based on ports
TRAFFIC_CLASSIFICATION = {
    'video': {
        'ports': [1935, 3478, 3479, 5004, 5005, 8554, 1755, 6970, 6971, 6972, 6973, 6974, 6975, 6976, 6977, 6978, 6979],
        'protocols': ['rtmp', 'rtp', 'rtsp'],
        'keywords': ['youtube', 'netflix', 'twitch', 'video', 'stream']
    },
    'voice': {
        'ports': [5060, 5061, 5062, 16384, 16385, 16386, 16387, 16388, 16389, 16390, 16391, 16392, 16393, 16394, 16395, 16396],
        'protocols': ['sip', 'rtp'],
        'keywords': ['voip', 'sip', 'voice', 'audio']
    },
    'file': {
        'ports': [20, 21, 22, 25, 110, 143, 445, 3389, 8080, 8443],
        'protocols': ['ftp', 'sftp', 'smtp', 'pop3', 'imap', 'smb', 'http', 'https'],
        'keywords': ['ftp', 'sftp', 'smtp', 'file', 'transfer']
    },
    'background': {
        'ports': [53, 123, 161, 162, 389, 636, 3306, 5432],
        'protocols': ['dns', 'ntp', 'snmp', 'ldap', 'mysql', 'postgresql'],
        'keywords': ['dns', 'ntp', 'snmp', 'update', 'sync']
    }
}

class PacketParser:
    """Parse and analyze network packets"""
    
    @staticmethod
    def format_ipv4(bytes_addr: bytes) -> str:
        """Format IPv4 address bytes to dotted decimal notation"""
        bytes_str = map(str, bytes_addr)
        return '.'.join(bytes_str)
    
    @staticmethod
    def format_multi_byte_field(bytes_field: bytes) -> str:
        """Format multi-byte field"""
        bytes_str = map(str, bytes_field)
        return '.'.join(bytes_str)
    
    @staticmethod
    def format_ipv6(bytes_addr: bytes) -> str:
        """Format IPv6 address bytes to colon-separated hex notation"""
        bytes_str = map('{:02x}'.format, bytes_addr)
        ipv6_addr = ':'.join([''.join(pair) for pair in zip(bytes_str, bytes_str)])
        return ipv6_addr
    
    @staticmethod
    def parse_ipv4_packet(data: bytes) -> Dict:
        """Parse IPv4 packet"""
        version_header_length = data[0]
        version = version_header_length >> 4
        header_length = (version_header_length & 15) * 4
        ttl, proto, src, target = struct.unpack('! 8x B B 2x 4s 4s', data[:20])
        return {
            'version': version,
            'header_length': header_length,
            'ttl': ttl,
            'protocol': proto,
            'source': PacketParser.format_ipv4(src),
            'destination': PacketParser.format_ipv4(target),
            'data': data[header_length:]
        }
    
    @staticmethod
    def parse_icmp_packet(data: bytes) -> Dict:
        """Parse ICMP packet"""
        icmp_type, code, checksum = struct.unpack('! B B 2x', data[:4])
        return {
            'type': icmp_type,
            'code': code,
            'checksum': checksum
        }
    
    @staticmethod
    def parse_tcp_segment(data: bytes) -> Dict:
        """Parse TCP segment"""
        (src_port, dest_port, sequence, acknowledgment, offset_reserved_flags) = struct.unpack('! H H L L H', data[:14])
        offset = (offset_reserved_flags >> 12) * 4
        flag_urg = (offset_reserved_flags & 32) >> 5
        flag_ack = (offset_reserved_flags & 16) >> 4
        flag_psh = (offset_reserved_flags & 8) >> 3
        flag_rst = (offset_reserved_flags & 4) >> 2
        flag_syn = (offset_reserved_flags & 2) >> 1
        flag_fin = offset_reserved_flags & 1
        
        return {
            'source_port': src_port,
            'destination_port': dest_port,
            'sequence': sequence,
            'acknowledgment': acknowledgment,
            'flags': {
                'urg': flag_urg,
                'ack': flag_ack,
                'psh': flag_psh,
                'rst': flag_rst,
                'syn': flag_syn,
                'fin': flag_fin
            },
            'data': data[offset:]
        }
    
    @staticmethod
    def parse_udp_segment(data: bytes) -> Dict:
        """Parse UDP segment"""
        src_port, dest_port, length = struct.unpack('! H H 2x H', data[:8])
        return {
            'source_port': src_port,
            'destination_port': dest_port,
            'length': length,
            'data': data[8:]
        }


class TrafficClassifier:
    """Classify network traffic by type"""
    
    @staticmethod
    def classify_traffic(packet_info: Dict) -> Tuple[str, int]:
        """
        Classify traffic based on ports, protocols, and patterns
        Returns: (traffic_type, priority)
        """
        source_port = packet_info.get('source_port')
        dest_port = packet_info.get('destination_port')
        protocol = packet_info.get('protocol', 'unknown')
        
        # Check destination port first (more reliable)
        if dest_port:
            for traffic_type, rules in TRAFFIC_CLASSIFICATION.items():
                if dest_port in rules['ports']:
                    priority = {'video': 3, 'voice': 3, 'file': 1, 'background': 0}.get(traffic_type, 0)
                    return traffic_type, priority
        
        # Check source port
        if source_port:
            for traffic_type, rules in TRAFFIC_CLASSIFICATION.items():
                if source_port in rules['ports']:
                    priority = {'video': 3, 'voice': 3, 'file': 1, 'background': 0}.get(traffic_type, 0)
                    return traffic_type, priority
        
        # Default classification based on protocol
        if protocol == 6:  # TCP
            return 'file', 1
        elif protocol == 17:  # UDP
            return 'voice', 2
        else:
            return 'unknown', 0
    
    @staticmethod
    def get_priority_for_type(traffic_type: str) -> int:
        """Get priority level for traffic type"""
        priority_map = {
            'video': 3,
            'voice': 3,
            'file': 1,
            'background': 0,
            'unknown': 0
        }
        return priority_map.get(traffic_type, 0)


class PacketSniffer:
    """Main packet sniffer class"""
    
    def __init__(self, interface: Optional[str] = None, packet_count: int = 0, output_file: Optional[str] = None):
        """
        Initialize packet sniffer
        
        Args:
            interface: Network interface to sniff on (None for all)
            packet_count: Number of packets to capture (0 for infinite)
            output_file: File to write packet data to (CSV format)
        """
        self.interface = interface
        self.packet_count = packet_count
        self.output_file = output_file
        self.packets_captured = 0
        self.packet_data = []
        
        if output_file:
            self._init_output_file()
    
    def _init_output_file(self):
        """Initialize output CSV file"""
        if self.output_file:
            with open(self.output_file, 'w') as f:
                f.write('timestamp,source_ip,destination_ip,source_port,destination_port,protocol,traffic_type,packet_size,priority\n')
    
    def _write_packet_data(self, packet_info: Dict):
        """Write packet data to file"""
        if self.output_file:
            with open(self.output_file, 'a') as f:
                f.write(f"{packet_info['timestamp']},{packet_info['source_ip']},{packet_info['destination_ip']},"
                       f"{packet_info.get('source_port', 'N/A')},{packet_info.get('destination_port', 'N/A')},"
                       f"{packet_info['protocol']},{packet_info['traffic_type']},{packet_info['packet_size']},"
                       f"{packet_info['priority']}\n")
    
    def sniff(self):
        """Start sniffing packets"""
        logger.info(f"Starting packet capture on interface: {self.interface or 'all'}")
        
        # Create socket
        if sys.platform == 'win32':
            # Windows
            conn = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.IPPROTO_IP)
            conn.bind((self.interface or '', 0))
            conn.setsockopt(socket.IPPROTO_IP, socket.IP_HDRINCL, 1)
            conn.ioctl(socket.SIO_RCVALL, socket.RCVALL_ON)
        else:
            # Linux/Mac
            conn = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.ntohs(3))
        
        try:
            while True:
                raw_buffer, addr = conn.recvfrom(65535)
                self.packets_captured += 1
                
                # Parse packet
                packet_info = self._parse_packet(raw_buffer)
                
                # Log packet info
                logger.info(f"Packet {self.packets_captured}: {packet_info['source_ip']} -> {packet_info['destination_ip']} "
                           f"({packet_info['traffic_type']}, Priority: {packet_info['priority']})")
                
                # Write to file if specified
                if self.output_file:
                    self._write_packet_data(packet_info)
                
                # Store packet data
                self.packet_data.append(packet_info)
                
                # Check if we've captured enough packets
                if self.packet_count > 0 and self.packets_captured >= self.packet_count:
                    break
        
        except KeyboardInterrupt:
            logger.info(f"Capture stopped. Total packets captured: {self.packets_captured}")
        finally:
            if sys.platform == 'win32':
                conn.ioctl(socket.SIO_RCVALL, socket.RCVALL_OFF)
            conn.close()
    
    def _parse_packet(self, raw_buffer: bytes) -> Dict:
        """Parse raw packet data"""
        dest_mac, src_mac, proto = struct.unpack('! 6s 6s H', raw_buffer[:14])
        
        # IPv4
        if proto == 8:
            ipv4_packet = PacketParser.parse_ipv4_packet(raw_buffer[14:])
            packet_info = {
                'timestamp': datetime.now().isoformat(),
                'source_ip': ipv4_packet['source'],
                'destination_ip': ipv4_packet['destination'],
                'protocol': ipv4_packet['protocol'],
                'packet_size': len(raw_buffer),
                'source_port': None,
                'destination_port': None,
            }
            
            # TCP
            if ipv4_packet['protocol'] == 6:
                tcp_segment = PacketParser.parse_tcp_segment(ipv4_packet['data'])
                packet_info['source_port'] = tcp_segment['source_port']
                packet_info['destination_port'] = tcp_segment['destination_port']
            
            # UDP
            elif ipv4_packet['protocol'] == 17:
                udp_segment = PacketParser.parse_udp_segment(ipv4_packet['data'])
                packet_info['source_port'] = udp_segment['source_port']
                packet_info['destination_port'] = udp_segment['destination_port']
            
            # Classify traffic
            traffic_type, priority = TrafficClassifier.classify_traffic(packet_info)
            packet_info['traffic_type'] = traffic_type
            packet_info['priority'] = priority
            
            return packet_info
        
        return {
            'timestamp': datetime.now().isoformat(),
            'source_ip': 'N/A',
            'destination_ip': 'N/A',
            'protocol': proto,
            'packet_size': len(raw_buffer),
            'traffic_type': 'unknown',
            'priority': 0,
        }


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Network Packet Sniffer and Traffic Classifier')
    parser.add_argument('-i', '--interface', help='Network interface to sniff on', default=None)
    parser.add_argument('-c', '--count', type=int, help='Number of packets to capture', default=0)
    parser.add_argument('-o', '--output', help='Output file for packet data (CSV)', default=None)
    
    args = parser.parse_args()
    
    sniffer = PacketSniffer(
        interface=args.interface,
        packet_count=args.count,
        output_file=args.output
    )
    
    sniffer.sniff()


if __name__ == '__main__':
    main()
