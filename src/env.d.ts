/// <reference types="vite/client" />

declare module '@evenrealities/even_hub_sdk' {
  export function waitForEvenAppBridge(): Promise<EvenAppBridge>;

  export interface EvenAppBridge {
    setTextContainer(index: number, text: string): Promise<void>;
    audioControl(enable: boolean): Promise<void>;
    imuControl(enable: boolean, pace?: number): Promise<void>;
    getDeviceInfo(): Promise<DeviceInfo>;
    getUserInfo(): Promise<UserInfo>;
    setLocalStorage(key: string, value: string): Promise<void>;
    getLocalStorage(key: string): Promise<string>;
    onEvenHubEvent(callback: (event: EvenHubEvent) => void): () => void;
  }

  export interface DeviceInfo {
    model: string;
    serialNumber: string;
    battery: number;
    wearing: boolean;
    charging: boolean;
    inCase: boolean;
  }

  export interface UserInfo {
    uid: string;
    name: string;
    avatar: string;
    country: string;
  }

  export interface EvenHubEvent {
    textEvent?: TextEvent;
    audioEvent?: AudioEvent;
    sysEvent?: SysEvent;
  }

  export interface TextEvent {
    name: string;
    text?: string;
    index?: number;
  }

  export interface AudioEvent {
    data: number[];
  }

  export interface SysEvent {
    eventType?: number;
    imuData?: { x: number; y: number; z: number };
  }

  export enum ImuReportPace {
    P100 = 100,
    P200 = 200,
    P300 = 300,
    P400 = 400,
    P500 = 500,
    P600 = 600,
    P700 = 700,
    P800 = 800,
    P900 = 900,
    P1000 = 1000,
  }

  export enum OsEventTypeList {
    CLICK_EVENT = 0,
    DOUBLE_CLICK_EVENT = 1,
    SCROLL_TOP_EVENT = 2,
    SCROLL_BOTTOM_EVENT = 3,
    FOREGROUND_ENTER_EVENT = 4,
    FOREGROUND_EXIT_EVENT = 5,
    ABNORMAL_EXIT_EVENT = 6,
    SYSTEM_EXIT_EVENT = 7,
    IMU_DATA_REPORT = 8,
  }
}
