export const PUBLIC_FLEET_KEYS = [
  "altis",
  "suv",
  "van",
  "minibus",
  "bus",
] as const;

export type PublicFleetKey = (typeof PUBLIC_FLEET_KEYS)[number];

export type PublicPriceGroupId = "airport" | "daily" | "northern";

export type PublicServiceId =
  | "at-bangkok"
  | "at-pattaya"
  | "at-khaoyai"
  | "at-huahin"
  | "ct-bangkok"
  | "bangkok-pattaya"
  | "bangkok-khaoyai"
  | "bangkok-huahin"
  | "bangkok-ayutthaya"
  | "bangkok-kanchanaburi"
  | "pattaya-khaoyai"
  | "cm-cr"
  | "cm-trip"
  | "cr-trip";

export interface PublicPriceService {
  id: PublicServiceId;
  contact?: boolean;
  prices?: Partial<Record<PublicFleetKey, number>>;
}

export interface PublicPriceGroup {
  id: PublicPriceGroupId;
  services: PublicPriceService[];
}

export const PUBLIC_PRICE_GROUPS: PublicPriceGroup[] = [
  {
    id: "airport",
    services: [
      {
        id: "at-bangkok",
        prices: { altis: 800, suv: 1000, van: 1300 },
      },
      {
        id: "at-pattaya",
        prices: { altis: 2000, suv: 2200, van: 2500 },
      },
      {
        id: "at-khaoyai",
        prices: { altis: 2700, suv: 3000, van: 4000 },
      },
      {
        id: "at-huahin",
        prices: { altis: 2700, suv: 3200, van: 3700 },
      },
    ],
  },
  {
    id: "daily",
    services: [
      {
        id: "ct-bangkok",
        prices: { altis: 3200, suv: 3700, van: 4200 },
      },
      {
        id: "bangkok-pattaya",
        prices: { altis: 3700, suv: 4300, van: 5300 },
      },
      {
        id: "bangkok-khaoyai",
        prices: { altis: 4200, suv: 4700, van: 5500 },
      },
      {
        id: "bangkok-huahin",
        prices: { altis: 4300, suv: 4800, van: 5500 },
      },
      {
        id: "bangkok-ayutthaya",
        prices: { altis: 3400, suv: 4000, van: 4500 },
      },
      {
        id: "bangkok-kanchanaburi",
        prices: { altis: 4200, suv: 4700, van: 5300 },
      },
    ],
  },
  {
    id: "northern",
    services: [
      {
        id: "pattaya-khaoyai",
        prices: { altis: 3500, suv: 3800, van: 4200 },
      },
      {
        id: "cm-cr",
        contact: true,
      },
      {
        id: "cm-trip",
        contact: true,
      },
      {
        id: "cr-trip",
        contact: true,
      },
    ],
  },
];
