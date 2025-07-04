import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface NetworkStatusProps {
  onStatusChange?: (isConnected: boolean) => void;
}

export function NetworkStatus({ onStatusChange }: NetworkStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showStatus, setShowStatus] = useState(false);

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
        // Simple connectivity check with short timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const connected = response.ok;
        setIsConnected(connected);
        setLastChecked(new Date());
        onStatusChange?.(connected);
      } catch (error) {
        setIsConnected(false);
        setLastChecked(new Date());
        onStatusChange?.(false);
      }
    };

    // Check every 60 seconds (less frequent to reduce interference)
    const interval = setInterval(checkConnection, 60000);

    return () => clearInterval(interval);
  }, [showStatus, onStatusChange]);

  const checkConnection = async () => {
    try {
      // Simple connectivity check with short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const connected = response.ok;
      setIsConnected(connected);
      setLastChecked(new Date());
      onStatusChange?.(connected);
    } catch (error) {
      setIsConnected(false);
      setLastChecked(new Date());
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
});