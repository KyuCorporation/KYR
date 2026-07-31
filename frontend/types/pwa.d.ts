declare module "@ducanh2912/next-pwa" {
  import { NextConfig } from "next";
  
  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    [key: string]: unknown;
  }

  function withPWAInit(pwaConfig: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withPWAInit;
}