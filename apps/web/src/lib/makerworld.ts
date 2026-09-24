import { BAMBU_API } from "./constants";
import type { MakerWorldModel, MakerWorldProfile, ParsedMakerWorldUrl } from "./types";

type BambuFilament = {
  type?: string;
  color?: string;
  usedG?: string;
  usedM?: string;
};

type BambuPlate = {
  prediction?: number;
  weight?: number;
};

type BambuInstance = {
  id: number;
  status?: number;
  title?: string;
  isDefault?: boolean;
  prediction?: number;
  weight?: number;
  downloadCount?: number;
  printCount?: number;
  instanceFilaments?: BambuFilament[];
  extention?: {
    modelInfo?: {
      plates?: BambuPlate[];
    };
  };
};

type BambuDesign = {
  id: number;
  title?: string;
  slug?: string;
  coverUrl?: string;
  downloadCount?: number;
  printCount?: number;
  defaultInstanceId?: number;
  designCreator?: { name?: string };
  instances?: BambuInstance[];
};

export function parseMakerWorldUrl(raw: string): ParsedMakerWorldUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!url.hostname.includes("makerworld.com")) return null;

  const modelMatch = url.pathname.match(/\/models\/(\d+)/i);
  if (!modelMatch) return null;

  const modelId = Number(modelMatch[1]);
  if (!Number.isFinite(modelId)) return null;

  const hashProfile = url.hash.match(/profileId-(\d+)/i);
  const queryProfile = url.searchParams.get("profileId");
  const profileRaw = hashProfile?.[1] ?? queryProfile ?? undefined;
  const profileId = profileRaw ? Number(profileRaw) : undefined;

  return {
    modelId,
    profileId: profileId && Number.isFinite(profileId) ? profileId : undefined,
  };
}

function parseNumber(value: string | number | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function extractFilamentGrams(instance: BambuInstance): number {
  const fromFilaments = (instance.instanceFilaments ?? []).reduce(
    (sum, f) => sum + parseNumber(f.usedG),
    0,
  );
  if (fromFilaments > 0) return fromFilaments;

  const plateWeight = (instance.extention?.modelInfo?.plates ?? []).reduce(
    (sum, plate) => sum + parseNumber(plate.weight),
    0,
  );
  if (plateWeight > 0) return plateWeight;

  return parseNumber(instance.weight);
}

function extractPrintSeconds(instance: BambuInstance): number {
  const plates = instance.extention?.modelInfo?.plates ?? [];
  if (plates.length > 1) {
    const plateSum = plates.reduce((sum, plate) => sum + parseNumber(plate.prediction), 0);
    if (plateSum > 0) return plateSum;
  }

  const topLevel = parseNumber(instance.prediction);
  if (topLevel > 0) return topLevel;

  if (plates.length === 1) {
    return parseNumber(plates[0].prediction);
  }

  return 0;
}

function mapProfile(instance: BambuInstance): MakerWorldProfile {
  return {
    id: instance.id,
    title: instance.title?.trim() || `Perfil #${instance.id}`,
    isDefault: Boolean(instance.isDefault),
    weightGrams: extractFilamentGrams(instance),
    printTimeSeconds: extractPrintSeconds(instance),
    filaments: (instance.instanceFilaments ?? []).map((f) => ({
      type: f.type ?? "PLA",
      color: f.color ?? "",
      usedGrams: parseNumber(f.usedG),
      usedMeters: parseNumber(f.usedM),
    })),
    downloadCount: instance.downloadCount ?? 0,
    printCount: instance.printCount ?? 0,
  };
}

function pickProfile(
  profiles: MakerWorldProfile[],
  profileId?: number,
  defaultInstanceId?: number,
): MakerWorldProfile | undefined {
  if (profileId) {
    const byId = profiles.find((p) => p.id === profileId);
    if (byId) return byId;
  }

  if (defaultInstanceId) {
    const byDefault = profiles.find((p) => p.id === defaultInstanceId);
    if (byDefault) return byDefault;
  }

  return profiles.find((p) => p.isDefault) ?? profiles[0];
}

export async function fetchMakerWorldModel(
  modelId: number,
  profileId?: number,
): Promise<MakerWorldModel> {
  const res = await fetch(`${BAMBU_API}/${modelId}`, {
    headers: {
      "User-Agent": "Oct3D-Calculator/1.0",
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Modelo no encontrado en MakerWorld.");
    }
    throw new Error(`Error al consultar MakerWorld (${res.status}).`);
  }

  const data = (await res.json()) as BambuDesign;
  const profiles = (data.instances ?? [])
    .filter((i) => i.status !== 0)
    .map(mapProfile)
    .sort((a, b) => b.downloadCount - a.downloadCount);

  if (profiles.length === 0) {
    throw new Error("El modelo no tiene perfiles de impresión disponibles.");
  }

  const selected = pickProfile(profiles, profileId, data.defaultInstanceId);
  if (!selected) {
    throw new Error("No se pudo seleccionar un perfil de impresión.");
  }

  return {
    id: data.id,
    title: data.title?.trim() || `Modelo #${data.id}`,
    slug: data.slug ?? "",
    coverUrl: data.coverUrl ?? "",
    creatorName: data.designCreator?.name ?? "Desconocido",
    downloadCount: data.downloadCount ?? 0,
    printCount: data.printCount ?? 0,
    profiles,
    selectedProfileId: selected.id,
  };
}

export function getProfileById(model: MakerWorldModel, profileId: number) {
  return model.profiles.find((p) => p.id === profileId);
}

/** Garantiza un link con #profileId-N para identificar la variante */
export function makerWorldProfileUrl(rawUrl: string, profileId: number): string {
  try {
    const url = new URL(rawUrl.trim());
    url.hash = `profileId-${profileId}`;
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}
