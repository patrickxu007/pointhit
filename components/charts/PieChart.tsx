import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface PieChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  size?: number;
  title?: string;
  showLegend?: boolean;
}

export default function PieChart({ 
  data, 
  size = 180, 
  title,
  showLegend = true
}: PieChartProps) {
  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Skip rendering if no data or total is 0
  if (total === 0 || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={[styles.emptyChart, { width: size, height: size }]}>
          <Text style={styles.emptyText}>No data</Text>
        </View>
      </View>
    );
  }
  
  // Default colors if not provided
  const defaultColors = [
    Colors.primary,
    Colors.secondary,
    '#8BC34A',
    '#03A9F4',
    '#9C27B0',
    '#FF5722',
    '#607D8B',
    '#E91E63',
  ];
  
  // Calculate segments with better distribution
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    return {
      ...item,
      percentage,
      color: item.color || defaultColors[index % defaultColors.length],
    };
  }).sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
  
  // Create visual representation using stacked bars in a circular arrangement
  const radius = size / 2 - 20;
  const center = size / 2;
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.chartWrapper}>
        <View style={[styles.chart, { width: size, height: size }]}>
          {/* Create concentric circles to represent pie slices */}
          {segments.map((segment, index) => {
            const segmentRadius = radius - (index * 8); // Decrease radius for each segment
            const segmentSize = segmentRadius * 2;
            
            return (
              <View
                key={`pie-segment-${index}-${segment.label}`}
                style={[
                  styles.pieSegment,
                  {
                    width: segmentSize,
                    height: segmentSize,
                    borderRadius: segmentRadius,
                    backgroundColor: segment.color,
                    opacity: 0.8 - (index * 0.1), // Fade each layer
                    position: 'absolute',
                    left: center - segmentRadius,
                    top: center - segmentRadius,
                  },
                ]}
              />
            );
          })}
          
          {/* Center circle with main value */}
          <View style={[styles.centerCircle, { 
            width: radius, 
            height: radius, 
            borderRadius: radius / 2,
            left: center - radius / 2,
            top: center - radius / 2,
          }]}>
            <Text style={styles.centerText}>{total}</Text>
            <Text style={styles.centerSubText}>Total</Text>
          </View>
        </View>
      </View>
      
      {showLegend && (
        <View style={styles.legend}>
          {segments.map((segment, index) => (
            <View key={`legend-${index}-${segment.label}`} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendColor, 
                  { backgroundColor: segment.color }
                ]} 
              />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {segment.label}
              </Text>
              <Text style={styles.legendValue}>
                {segment.value} ({segment.percentage.toFixed(1)}%)
              </Text>
            </View>
          ))}
        </View>
      )}
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
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  chart: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieSegment: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  centerCircle: {
    position: 'absolute',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centerText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  centerSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyChart: {
    borderRadius: 100,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
  },
  legend: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});