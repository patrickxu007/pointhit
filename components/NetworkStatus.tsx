import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface NetworkStatusProps {
  onStatusChange?: (isConnected: boolean) => void;
}

export function NetworkStatus({ onStatusChange }: NetworkStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple connectivity check
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        const connected = response.ok;
        setIsConnected(connected);
        setLastChecked(new Date());
        onStatusChange?.(connected);
      } catch (error) {
        console.log('Network check failed:', error);
        setIsConnected(false);
        setLastChecked(new Date());
        onStatusChange?.(false);
      }
    };

    // Check immediately
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [onStatusChange]);

  if (isConnected === null) {
    return null; // Don't show anything while checking
  }

  if (isConnected) {
    return null; // Don't show anything when connected
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