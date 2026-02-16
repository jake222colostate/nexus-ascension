import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGameState } from './src/app/useGameState';
import { HubScreen } from './src/worlds/hub/HubScreen';
import { FantasyScreen } from './src/worlds/fantasy/FantasyScreen';
import { SkybaseScreen } from './src/worlds/skybase/SkybaseScreen';
import { WorldLoadingScreen } from './src/ui/loading/WorldLoadingScreen';

type RootStackParamList = { Hub: undefined; Fantasy: undefined; Skybase: undefined };
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const game = useGameState();

  if (!game.ready) {
    return <WorldLoadingScreen world="hub" progress={game.bootProgress} asset={game.bootAsset} tip="Syncing persistent progression" />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Hub" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'none' }}>
          <Stack.Screen name="Hub">{(props) => <HubScreen {...props} game={game} />}</Stack.Screen>
          <Stack.Screen name="Fantasy">{(props) => <FantasyScreen {...props} game={game} />}</Stack.Screen>
          <Stack.Screen name="Skybase">{(props) => <SkybaseScreen {...props} game={game} />}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
