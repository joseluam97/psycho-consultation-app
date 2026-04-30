import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.app.apppsico',
  appName: 'PsicoApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;