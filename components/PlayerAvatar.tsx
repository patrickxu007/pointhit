import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Player } from '@/types/tennis';
import Colors from '@/constants/colors';

interface PlayerAvatarProps {
  player: Player;
  size?: number;
  showName?: boolean;
}

export default function PlayerAvatar({ 
  player, 
  size = 40, 
  showName = false 
}: PlayerAvatarProps) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const initialStyle = {
    fontSize: size * 0.4,
  };

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, avatarStyle]}>
        {player.profileImage ? (
          <Image 
            source={{ uri: player.profileImage }} 
            style={[styles.image, avatarStyle]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, avatarStyle]}>
            <Text style={[styles.initial, initialStyle]}>
              {player.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      {showName && (
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatar: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: '600',
  },
  name: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
});