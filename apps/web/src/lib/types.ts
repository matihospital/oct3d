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

export type ParsedMakerWorldUrl = {
  modelId: number;
  profileId?: number;
};
