import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boxofvibe.app',
  appName: 'BoxOfVibe',
  webDir: 'www',
  server: {
    url: 'https://boxofvibe-music.netlify.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#000000',
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
