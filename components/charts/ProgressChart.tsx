import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import Svg, { Circle } from 'react-native-svg';

interface ProgressChartProps {
  value: number;
  maxValue?: number;
  title?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

export default function ProgressChart({
  value,
  maxValue = 100,
  title,
  size = 80,
  strokeWidth = 6,
  color = Colors.primary,
  backgroundColor = Colors.border,
}: ProgressChartProps) {
  // Calculate percentage
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <View style={styles.container}>
      <View style={[styles.circleContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        
        {/* Percentage Text */}
        <View style={styles.valueContainer}>
          <Text style={[styles.valueText, { color, fontSize: size * 0.18 }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
      {title && (
        <Text style={[styles.title, { width: size + 20 }]} numberOfLines={2}>
          {title}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
    marginHorizontal: 4,
    flex: 1,
    minWidth: 120,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontWeight: '700',
  },
});