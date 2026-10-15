import React from 'react';
import { Text } from 'react-native';
import { useAuth } from '../auth';
import { Screen, Card, H1, Btn } from '../components';

export const ProfileScreen: React.FC = () => {
  const { session, logout } = useAuth();
  return (
    <Screen>
      <H1>Profil</H1>
      <Card>
        <Text style={{ color: '#FAF7F2', fontSize: 18, fontWeight: '800' }}>
          {session?.name}
        </Text>
        <Text style={{ color: '#A69C8E', marginTop: 4 }}>
          Rol: {session?.role === 'admin' ? 'Admin' : 'Xodim'}
          {session?.position ? ` • ${session.position}` : ''}
        </Text>
      </Card>
      <Btn title="Chiqish" onPress={logout} danger />
    </Screen>
  );
};
