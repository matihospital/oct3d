export type PricingTier = {
  /** Costo interno máximo (inclusive) para este tramo */
  maxCost: number;
  retailMultiplier: number;
  wholesaleMultiplier: number;
  bulkMultiplier: number;
};

export type PricingParams = {
  kwhPrice: number;
  printerWatts: number;
  plaPricePerKg: number;
  /** Precio mínimo venta al público (ej. llavero) */
  minRetailPrice: number;
  /** Precio mínimo mayorista */
  minWholesalePrice: number;
  /** Precio mínimo mayorista por volumen */
  minBulkPrice: number;
  /** Cantidad mínima para precio por volumen */
  bulkQuantity: number;
  /** Solo ofrecer volumen si el precio público queda por debajo de este tope */
  bulkMaxRetailPrice: number;
  /** Tramos: a mayor costo interno, menor multiplicador */
  tiers: PricingTier[];
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
  bulkPrice: number | null;
  bulkEligible: boolean;
  weightGrams: number;
  printTimeSeconds: number;
  printTimeHours: number;
};

export type ParsedMakerWorldUrl = {
  modelId: number;
  profileId?: number;
};
