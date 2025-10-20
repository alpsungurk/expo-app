import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { CartProvider } from './src/store/cartStore';
import { AppProvider } from './src/store/appStore';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AppProvider>
        <CartProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </CartProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
