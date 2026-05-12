import React, { createContext, useContext, useState, ReactNode } from "react";

export type SensorNode = {
  id: string;
  name: string;
  battery: number;
  status: "active" | "offline" | "maintenance" | "low_battery";
  lastSeen: string;
  readings: {
    temp: number;
    humidity: number;
    soilMoisture: number;
    soilTemp: number;
    light: number;
  };
};

export type Device = {
  id: string;
  name: string;
  type: "ESP32-Gateway" | "ESP32-CAM";
  status: "online" | "offline";
  nodes: SensorNode[];
};

export type Field = {
  id: string;
  name: string;
  crop: string;
  devices: Device[];
};

export type Farm = {
  id: string;
  name: string;
  location: string;
  fields: Field[];
};

type MockDataState = {
  farms: Farm[];
  activeFarmId: string;
  setActiveFarmId: (id: string) => void;
};

const mockFarms: Farm[] = [
  {
    id: "farm-1",
    name: "Alpha Greenhouse Complex",
    location: "California, US",
    fields: [
      {
        id: "field-1",
        name: "Sector A (Tomatoes)",
        crop: "Tomato",
        devices: [
          {
            id: "dev-1",
            name: "Gateway Alpha",
            type: "ESP32-Gateway",
            status: "online",
            nodes: [
              {
                id: "node-1",
                name: "Node 1A",
                battery: 85,
                status: "active",
                lastSeen: "2 mins ago",
                readings: { temp: 24.5, humidity: 65, soilMoisture: 42, soilTemp: 21.0, light: 8500 }
              },
              {
                id: "node-2",
                name: "Node 1B",
                battery: 15,
                status: "low_battery",
                lastSeen: "5 mins ago",
                readings: { temp: 25.1, humidity: 62, soilMoisture: 38, soilTemp: 21.5, light: 8600 }
              }
            ]
          },
          {
            id: "dev-2",
            name: "Vision Node A",
            type: "ESP32-CAM",
            status: "online",
            nodes: []
          }
        ]
      },
      {
        id: "field-2",
        name: "Sector B (Peppers)",
        crop: "Bell Pepper",
        devices: [
          {
            id: "dev-3",
            name: "Gateway Beta",
            type: "ESP32-Gateway",
            status: "online",
            nodes: [
              {
                id: "node-3",
                name: "Node 2A",
                battery: 92,
                status: "active",
                lastSeen: "1 min ago",
                readings: { temp: 26.0, humidity: 58, soilMoisture: 40, soilTemp: 22.0, light: 9000 }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "farm-2",
    name: "Valley Vertical Farm",
    location: "Oregon, US",
    fields: []
  }
];

const MockDataContext = createContext<MockDataState | undefined>(undefined);

export const MockDataProvider = ({ children }: { children: ReactNode }) => {
  const [activeFarmId, setActiveFarmId] = useState("farm-1");

  return (
    <MockDataContext.Provider value={{ farms: mockFarms, activeFarmId, setActiveFarmId }}>
      {children}
    </MockDataContext.Provider>
  );
};

export const useMockData = () => {
  const ctx = useContext(MockDataContext);
  if (!ctx) throw new Error("useMockData must be used within MockDataProvider");
  return ctx;
};
