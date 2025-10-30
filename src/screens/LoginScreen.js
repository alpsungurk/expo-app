import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;
const isLargeScreen = width >= 768;
const isTablet = width >= 1024;

// Responsive değerler
const getResponsiveValue = (small, medium, large, tablet = large) => {
  if (isTablet) return tablet;
  if (isLargeScreen) return large;
  if (isMediumScreen) return medium;
  return small;
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı ve şifre gereklidir.');
      return;
    }

    setIsLoading(true);

    try {
      // Basit giriş kontrolü (gerçek uygulamada API'den kontrol edilir)
      if (username === 'admin' && password === 'admin123') {
        // Başarılı giriş
        navigation.navigate('KasaScreen');
      } else {
        Alert.alert('Hata', 'Kullanıcı adı veya şifre hatalı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#8B4513" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kasa Girişi</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Logo ve Başlık */}
        <View style={styles.logoContainer}>
          <View style={[
            styles.logoIcon,
            {
              width: getResponsiveValue(80, 90, 100, 110),
              height: getResponsiveValue(80, 90, 100, 110),
              borderRadius: getResponsiveValue(40, 45, 50, 55),
            }
          ]}>
            <Ionicons 
              name="cafe" 
              size={getResponsiveValue(40, 45, 50, 55)} 
              color="#8B4513" 
            />
          </View>
          <Text style={[
            styles.logoText,
            { fontSize: getResponsiveValue(24, 26, 28, 30) }
          ]}>
            Kasa Sistemi
          </Text>
          <Text style={[
            styles.logoSubtext,
            { fontSize: getResponsiveValue(14, 15, 16, 18) }
          ]}>
            Sipariş yönetimi için giriş yapın
          </Text>
        </View>

        {/* Giriş Formu */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[
              styles.inputLabel,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Kullanıcı Adı
            </Text>
            <View style={[
              styles.inputWrapper,
              {
                paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
                paddingVertical: getResponsiveValue(12, 14, 16, 18),
                borderRadius: getResponsiveValue(12, 14, 16, 18),
              }
            ]}>
              <Ionicons 
                name="person-outline" 
                size={getResponsiveValue(20, 22, 24, 26)} 
                color="#8B4513" 
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}
                placeholder="Kullanıcı adınızı girin"
                placeholderTextColor="#9CA3AF"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[
              styles.inputLabel,
              { fontSize: getResponsiveValue(14, 15, 16, 18) }
            ]}>
              Şifre
            </Text>
            <View style={[
              styles.inputWrapper,
              {
                paddingHorizontal: getResponsiveValue(16, 18, 20, 22),
                paddingVertical: getResponsiveValue(12, 14, 16, 18),
                borderRadius: getResponsiveValue(12, 14, 16, 18),
              }
            ]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={getResponsiveValue(20, 22, 24, 26)} 
                color="#8B4513" 
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.textInput,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}
                placeholder="Şifrenizi girin"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={getResponsiveValue(20, 22, 24, 26)} 
                  color="#8B4513" 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              {
                paddingVertical: getResponsiveValue(16, 18, 20, 22),
                paddingHorizontal: getResponsiveValue(24, 28, 32, 36),
                borderRadius: getResponsiveValue(12, 14, 16, 18),
                marginTop: getResponsiveValue(24, 28, 32, 36),
              }
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <View style={styles.loginButtonContent}>
                <Ionicons 
                  name="log-in" 
                  size={getResponsiveValue(20, 22, 24, 26)} 
                  color="white" 
                />
                <Text style={[
                  styles.loginButtonText,
                  { fontSize: getResponsiveValue(16, 17, 18, 20) }
                ]}>
                  Giriş Yap
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Demo Bilgisi */}
          <View style={styles.demoInfo}>
            <Text style={[
              styles.demoText,
              { fontSize: getResponsiveValue(12, 13, 14, 16) }
            ]}>
              Demo: admin / admin123
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
    paddingVertical: getResponsiveValue(16, 18, 20, 22),
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: getResponsiveValue(40, 44, 48, 52),
    height: getResponsiveValue(40, 44, 48, 52),
    borderRadius: getResponsiveValue(20, 22, 24, 26),
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveValue(18, 20, 22, 24),
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  placeholder: {
    width: getResponsiveValue(40, 44, 48, 52),
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: getResponsiveValue(40, 50, 60, 70),
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
  },
  logoIcon: {
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveValue(16, 18, 20, 22),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoText: {
    fontWeight: '700',
    color: '#8B4513',
    fontFamily: 'System',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
  },
  logoSubtext: {
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'System',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: getResponsiveValue(20, 24, 28, 32),
  },
  inputContainer: {
    marginBottom: getResponsiveValue(20, 24, 28, 32),
  },
  inputLabel: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: getResponsiveValue(8, 10, 12, 14),
    fontFamily: 'System',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: getResponsiveValue(12, 14, 16, 18),
  },
  textInput: {
    flex: 1,
    color: '#1F2937',
    fontFamily: 'System',
    padding: 0,
  },
  passwordToggle: {
    padding: getResponsiveValue(4, 5, 6, 8),
    marginLeft: getResponsiveValue(8, 10, 12, 14),
  },
  loginButton: {
    backgroundColor: '#8B4513',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveValue(8, 10, 12, 14),
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: 'System',
  },
  demoInfo: {
    alignItems: 'center',
    marginTop: getResponsiveValue(20, 24, 28, 32),
    padding: getResponsiveValue(12, 14, 16, 18),
    backgroundColor: 'rgba(139, 69, 19, 0.05)',
    borderRadius: getResponsiveValue(8, 10, 12, 14),
  },
  demoText: {
    color: '#8B4513',
    fontWeight: '500',
    fontFamily: 'System',
  },
});
