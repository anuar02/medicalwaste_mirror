declare module 'react-native-qrcode-svg' {
  import { ComponentType } from 'react';

  interface QRCodeProps {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: object;
    logoSize?: number;
    logoBackgroundColor?: string;
    logoMargin?: number;
    logoBorderRadius?: number;
    quietZone?: number;
    enableLinearGradient?: boolean;
    linearGradient?: string[];
    gradientDirection?: string[];
    ecl?: 'L' | 'M' | 'Q' | 'H';
    getRef?: (ref: object) => void;
    onError?: (error: unknown) => void;
  }

  const QRCode: ComponentType<QRCodeProps>;
  export default QRCode;
}
