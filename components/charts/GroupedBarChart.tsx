import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface GroupData {
  label: string;
  values: {
    label: string;
    value: number;
    color?: string;
  }[];
}

interface GroupedBarChartProps {
  data: GroupData[];
  height?: number;
  title?: string;
  showValues?: boolean;
  showLabels?: boolean;
  maxValue?: number;
}

export default function GroupedBarChart({ 
  data, 
  height = 200, 
  title,
  showValues = true,
  showLabels = true,
  maxValue
}: GroupedBarChartProps) {
  // Find the maximum value for scaling
  const allValues = data.flatMap(group => group.values.map(item => item.value));
  const max = maxValue || Math.max(...allValues, 1);
  
  // Get all unique categories for the legend
  const categories = Array.from(
    new Set(data.flatMap(group => group.values.map(item => item.label)))
  );
  
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
      
      {/* Legend */}
      <View style={styles.legend}>
        {categories.map((category, index) => {
          // Find the color for this category
          const categoryColor = data[0]?.values.find(v => v.label === category)?.color || 
            (category === data[0]?.values[0]?.label ? '#4CAF50' : '#2196F3');
            
          return (
            <View key={`legend-${index}-${category}`} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendColor, 
                  { backgroundColor: categoryColor }
                ]} 
              />
              <Text style={styles.legendLabel}>{category}</Text>
            </View>
          );
        })}
      </View>
      
      <View style={[styles.chartContainer, { height }]}>
        {data.map((group, groupIndex) => (
          <View key={`group-${groupIndex}-${group.label}`} style={styles.groupContainer}>
            <View style={styles.barsContainer}>
              {group.values.map((item, itemIndex) => {
                const barHeight = Math.max((item.value / max) * (height - 40), 2);
                return (
                  <View key={`bar-${groupIndex}-${itemIndex}-${item.label}`} style={styles.barWrapper}>
                    <View style={styles.barLabelContainer}>
                      {showValues && (
                        <Text style={styles.barValue}>{item.value}</Text>
                      )}
                      <View 
                        style={[
                          styles.bar, 
                          { 
                            height: barHeight, 
                            backgroundColor: item.color || (item.label === group.values[0]?.label ? '#4CAF50' : '#2196F3')
                          }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })}
            </View>
            {showLabels && (
              <Text style={styles.groupLabel} numberOfLines={1}>
                {group.label}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.text,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chartContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    width: '100%',
  },
  groupContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 2,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    flex: 1,
  },
  barLabelContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: 20,
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
  groupLabel: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
});