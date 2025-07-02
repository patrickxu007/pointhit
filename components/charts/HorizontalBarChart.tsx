import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface HorizontalBarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  width?: number;
  title?: string;
  showValues?: boolean;
  showLabels?: boolean;
  maxValue?: number;
}

export default function HorizontalBarChart({ 
  data, 
  width = 300, 
  title,
  showValues = true,
  showLabels = true,
  maxValue
}: HorizontalBarChartProps) {
  // Find the maximum value for scaling
  const max = maxValue || Math.max(...data.map(item => item.value), 1);
  
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const barWidth = Math.max((item.value / max) * (width - 120), 2);
          return (
            <View key={`bar-${index}-${item.label}`} style={styles.barRow}>
              {showLabels && (
                <View style={styles.labelContainer}>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              )}
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      width: barWidth, 
                      backgroundColor: item.color || Colors.primary 
                    }
                  ]} 
                />
                {showValues && (
                  <Text style={styles.barValue}>{item.value}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.text,
  },
  chartContainer: {
    paddingVertical: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 24,
  },
  labelContainer: {
    width: 100,
    marginRight: 8,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: 20,
    borderRadius: 4,
    minWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  barValue: {
    fontSize: 12,
    marginLeft: 8,
    color: Colors.text,
    fontWeight: '600',
    minWidth: 20,
  },
  noDataText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
});