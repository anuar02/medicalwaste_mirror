export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type SupervisorTabParamList = {
  SupervisorHome: undefined;
  SupervisorHandoffs: undefined;
  SupervisorSettings: undefined;
};

export type DriverTabParamList = {
  DriverHome: undefined;
  DriverSession: {
    initialTab?: 'route' | 'handoffs';
    focusHandoffId?: string;
  };
  DriverContainersStack: undefined;
  DriverHistoryStack: undefined;
  DriverProfile: undefined;
};

export type DriverHistoryStackParamList = {
  DriverHistory: undefined;
  DriverSessionTimeline: { sessionId: string };
};

export type DriverContainersStackParamList = {
  DriverContainers: undefined;
  DriverContainerDetail: { containerId: string };
};

export type AdminTabParamList = {
  AdminHome: undefined;
  AdminSettings: undefined;
};
