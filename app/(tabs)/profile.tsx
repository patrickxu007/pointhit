import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { useMatchStore } from '@/store/matchStore';
import Button from '@/components/Button';
import PlayerAvatar from '@/components/PlayerAvatar';
import Colors from '@/constants/colors';
import { User, Edit2, Camera, Trash2 } from 'lucide-react-native';
import { Player } from '@/types/tennis';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const { players, addPlayer, updatePlayer, deletePlayer } = useMatchStore();
  const [name, setName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const handleAddPlayer = () => {
    if (name.trim() === '') {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    
    addPlayer({
      id: Date.now().toString(),
      name: name.trim(),
    });
    
    setName('');
    setIsAddingPlayer(false);
  };
  
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setEditingName(player.name);
  };
  
  const handleSaveEdit = () => {
    if (!editingPlayer) return;
    
    if (editingName.trim() === '') {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    
    updatePlayer({
      ...editingPlayer,
      name: editingName.trim(),
    });
    
    setEditingPlayer(null);
    setEditingName('');
  };
  
  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setEditingName('');
  };
  
  const handleDeletePlayer = (player: Player) => {
    Alert.alert(
      'Delete Player',
      `Are you sure you want to delete ${player.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePlayer(player.id),
        },
      ]
    );
  };
  
  const handleChangeProfilePicture = async (player: Player) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Image selection is not available on web. Please use the mobile app.');
      return;
    }
    
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required', 
          'PointHit needs access to your photo library to select profile pictures. Please enable this permission in your device settings.',
          [
            {
              text: 'OK',
              style: 'default',
            }
          ]
        );
        return;
      }
      
      // Launch image picker with more conservative options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Reduced quality to prevent memory issues
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        if (asset.uri) {
          updatePlayer({
            ...player,
            profileImage: asset.uri,
          });
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      
      // More specific error handling
      let errorMessage = 'Failed to select image. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please enable photo library access in Settings.';
        } else if (error.message.includes('cancelled')) {
          // User cancelled, no need to show error
          return;
        }
      }
      
      Alert.alert('Error', errorMessage, [
        {
          text: 'OK',
          style: 'default',
        }
      ]);
    }
  };
  
  const handleRemoveProfilePicture = (player: Player) => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove the profile picture?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          onPress: () => {
            updatePlayer({
              ...player,
              profileImage: undefined,
            });
          },
        },
      ]
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <User size={40} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Player Profiles</Text>
      </View>
      
      {isAddingPlayer ? (
        <View style={styles.addPlayerForm}>
          <Text style={styles.formTitle}>Add New Player</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter player name"
            autoFocus
          />
          <View style={styles.formButtons}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setIsAddingPlayer(false);
                setName('');
              }}
              style={styles.formButton}
            />
            <Button
              title="Save"
              variant="primary"
              onPress={handleAddPlayer}
              style={styles.formButton}
            />
          </View>
        </View>
      ) : (
        <Button
          title="Add Player"
          variant="primary"
          onPress={() => setIsAddingPlayer(true)}
          style={styles.addButton}
        />
      )}
      
      <View style={styles.playersContainer}>
        <Text style={styles.sectionTitle}>Your Players</Text>
        
        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No players added yet. Add players to start tracking matches.
            </Text>
          </View>
        ) : (
          players.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              {editingPlayer?.id === player.id ? (
                <View style={styles.editingContainer}>
                  <PlayerAvatar player={player} size={40} />
                  <TextInput
                    style={styles.editInput}
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity 
                      style={styles.saveButton}
                      onPress={handleSaveEdit}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={handleCancelEdit}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.avatarSection}
                    onPress={() => handleChangeProfilePicture(player)}
                    activeOpacity={0.7}
                  >
                    <PlayerAvatar player={player} size={40} />
                    <View style={styles.cameraOverlay}>
                      <Camera size={12} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    {player.profileImage && (
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveProfilePicture(player)}
                      >
                        <Text style={styles.removeImageText}>Remove Photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.playerActions}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditPlayer(player)}
                    >
                      <Edit2 size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeletePlayer(player)}
                    >
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))
        )}
      </View>
      
      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>About PointHit™</Text>
        <Text style={styles.aboutText}>
          PointHit™ helps you analyze your tennis performance by tracking detailed 
          point-by-point statistics. Monitor your serves, winners, errors, and more to 
          improve your game.
        </Text>
        <Text style={styles.copyrightText}>© 2025 PointHit™. All rights reserved.</Text>
        <Text style={styles.versionText}>Version 1.3.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20', // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  addButton: {
    marginBottom: 24,
  },
  addPlayerForm: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  formButton: {
    width: 100,
  },
  playersContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyState: {
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  removeImageButton: {
    marginTop: 4,
  },
  removeImageText: {
    fontSize: 12,
    color: Colors.error,
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: Colors.error + '15',
    borderRadius: 8,
  },
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.border,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  aboutSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});