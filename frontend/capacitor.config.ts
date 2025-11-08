import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medicalwaste.app',
  appName: 'MedicalWaste',
  webDir: 'build', // or 'dist' if using Vite
  bundledWebRuntime: false,
  plugins: {
    BackgroundGeolocation: {
      enabled: true
    }
  }
};

export default config;
