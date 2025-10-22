import React, { createContext, useContext, useState, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import NotificationsScreen from '../screens/NotificationsScreen';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const notificationSlideAnim = useRef(new Animated.Value(0)).current;

  const showNotifications = () => {
    setNotificationsVisible(true);
    // Bildirim modal'ı açılırken aşağıdan yukarıya animasyon
    Animated.timing(notificationSlideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideNotifications = () => {
    // Bildirim modal'ı kapanırken yukarıdan aşağıya animasyon
    Animated.timing(notificationSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotificationsVisible(false);
    });
  };

  const value = {
    showNotifications,
    hideNotifications,
    notificationsVisible,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Global Notifications Modal */}
      {notificationsVisible && (
        <Animated.View 
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
            },
            {
              transform: [
                {
                  translateY: notificationSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Dimensions.get('window').height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <NotificationsScreen onClose={hideNotifications} />
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};
