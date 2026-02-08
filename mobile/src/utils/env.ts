import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {}) as {
  googleDirectionsApiKey?: string;
};

export const googleDirectionsApiKey = extra.googleDirectionsApiKey ?? '';
