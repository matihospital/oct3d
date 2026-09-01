export type PricingParams = {
  /** Precio del kWh en moneda local */
  kwhPrice: number;
  /** Consumo promedio de la impresora en watts */
  printerWatts: number;
  /** Precio del filamento PLA por kilogramo */
  plaPricePerKg: number;
  /** Multiplicador precio público / minorista */
  retailMultiplier: number;
  /** Multiplicador precio mayorista */
  wholesaleMultiplier: number;
};

export type MakerWorldProfile = {
  id: number;
  title: string;
  isDefault: boolean;
  weightGrams: number;
  printTimeSeconds: number;
  filaments: Array<{
    type: string;
    color: string;
    usedGrams: number;
    usedMeters: number;
  }>;
  downloadCount: number;
  printCount: number;
};

export type MakerWorldModel = {
  id: number;
  title: string;
  slug: string;
  coverUrl: string;
  creatorName: string;
  downloadCount: number;
  printCount: number;
  profiles: MakerWorldProfile[];
  selectedProfileId: number;
};

export type CostBreakdown = {
  filamentCost: number;
  electricCost: number;
  totalCost: number;
  retailPrice: number;
  wholesalePrice: number;
  weightGrams: number;
  printTimeSeconds: number;
  printTimeHours: number;
};

export type ParsedMakerWorldUrl = {
  modelId: number;
  profileId?: number;
};
