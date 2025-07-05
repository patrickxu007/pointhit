import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Colors from '@/constants/colors';

interface NetworkStatusProps {
  onStatusChange?: (isConnected: boolean) => void;
}

export function NetworkStatus({ onStatusChange }: NetworkStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // Don't check network status immediately to prevent QR code scanning issues
    const initialDelay = setTimeout(() => {
      setShowStatus(true);
      checkConnection();
    }, 3000); // Wait 3 seconds before first check

    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (!showStatus) return;

    const checkConnection = async () => {
      try {
        // Enhanced connectivity check with multiple endpoints
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Try multiple endpoints to ensure connectivity
        const endpoints = [
          'https://www.google.com/favicon.ico',
          'https://httpbin.org/status/200',
          'https://jsonplaceholder.typicode.com/posts/1'
        ];
        
        let connected = false;
        let checkedEndpoint = '';
        
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: 'HEAD',
              cache: 'no-cache',
              signal: controller.signal,
            });
            
            if (response.ok) {
              connected = true;
              checkedEndpoint = endpoint;
              break;
            }
          } catch (endpointError) {
            console.log(`Failed to connect to ${endpoint}:`, endpointError);
            continue;
          }
        }
        
        clearTimeout(timeoutId);
        
        setIsConnected(connected);
        setLastChecked(new Date());
        setConnectionType(connected ? 'online' : 'offline');
        onStatusChange?.(connected);
        
        if (connected) {
          console.log(`Network connectivity confirmed via ${checkedEndpoint}`);
        } else {
          console.log('No network connectivity detected');
        }
        
      } catch (error) {
        console.log('Network check failed:', error);
        setIsConnected(false);
        setLastChecked(new Date());
        setConnectionType('error');
        onStatusChange?.(false);
      }
    };

    // Check every 30 seconds (less frequent to reduce interference)
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [showStatus, onStatusChange]);

  const checkConnection = async () => {
    try {
      // Enhanced connectivity check with better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Use a more reliable endpoint for production
      const testUrl = __DEV__ 
        ? 'https://www.google.com/favicon.ico'
        : 'https://httpbin.org/status/200';
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'User-Agent': Platform.select({
            ios: 'PointHit-iOS/1.3.3',
            android: 'PointHit-Android/1.3.3',
            default: 'PointHit-App/1.3.3'
          }),
        },
      });
      
      clearTimeout(timeoutId);
      const connected = response.ok;
      setIsConnected(connected);
      setLastChecked(new Date());
      setConnectionType(connected ? 'online' : 'offline');
      onStatusChange?.(connected);
    } catch (error) {
      console.log('Network connectivity check failed:', error);
      setIsConnected(false);
      setLastChecked(new Date());
      setConnectionType('error');
      onStatusChange?.(false);
    }
  };

  // Don't show anything during initial app load or when connected
  if (!showStatus || isConnected === null || isConnected) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ⚠️ No internet connection
      </Text>
      {lastChecked && (
        <Text style={styles.subText}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </Text>
      )}
      {__DEV__ && (
        <Text style={styles.debugText}>
          Status: {connectionType} | Platform: {Platform.OS}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ff6b6b',
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  subText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace'
    }),
  },
});