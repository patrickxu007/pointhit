import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useMatchStore } from '@/store/matchStore';
import MatchCard from '@/components/MatchCard';
import Button from '@/components/Button';
import Colors from '@/constants/colors';

export default function HomeScreen() {
  const { matches, isLoaded } = useMatchStore();

  const handleNewMatch = () => {
    router.push('/new-match');
  };

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.newMatchButton} 
          onPress={handleNewMatch}
          activeOpacity={0.7}
        >
          <Text style={styles.newMatchText}>New Match</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {matches.length > 0 ? (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MatchCard match={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Matches Yet</Text>
            <Text style={styles.emptyStateText}>
              Start tracking your tennis performance by creating your first match.
            </Text>
            <Button
              title="Create First Match"
              onPress={handleNewMatch}
              variant="primary"
              size="large"
              style={styles.emptyStateButton}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'flex-end',
  },
  newMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  newMatchText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    width: '100%',
    maxWidth: 300,
  },
});