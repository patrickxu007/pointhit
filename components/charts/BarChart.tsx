import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface BarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  height?: number;
  title?: string;
  showValues?: boolean;
  showLabels?: boolean;
  maxValue?: number;
}

export default function BarChart({ 
  data, 
  height = 200, 
  title,
  showValues = true,
  showLabels = true,
  maxValue
}: BarChartProps) {
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
      
      <View style={[styles.chartContainer, { height }]}>
        {data.map((item, index) => {
          const barHeight = Math.max((item.value / max) * height, 2);
          return (
            <View key={`bar-${index}-${item.label}`} style={styles.barWrapper}>
              <View style={styles.barLabelContainer}>
                {showValues && (
                  <Text style={styles.barValue}>{item.value}</Text>
                )}
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: barHeight, 
                      backgroundColor: item.color || Colors.primary 
                    }
                  ]} 
                />
              </View>
              {showLabels && (
                <Text style={styles.barLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  barLabelContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  barValue: {
    fontSize: 12,
    marginBottom: 4,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    color: Colors.textSecondary,
    width: '100%',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
});