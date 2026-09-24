import { fetchMakerWorldModel, parseMakerWorldUrl } from "@/lib/makerworld";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const modelIdParam = searchParams.get("modelId");
  const profileIdParam = searchParams.get("profileId");

  let modelId: number | undefined;
  let profileId: number | undefined;

  if (url) {
    const parsed = parseMakerWorldUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { error: "URL de MakerWorld inválida." },
        { status: 400 },
      );
    }
    modelId = parsed.modelId;
    profileId = parsed.profileId;
  } else if (modelIdParam) {
    modelId = Number(modelIdParam);
    if (!Number.isFinite(modelId)) {
      return NextResponse.json({ error: "modelId inválido." }, { status: 400 });
    }
    if (profileIdParam) {
      profileId = Number(profileIdParam);
      if (!Number.isFinite(profileId)) {
        return NextResponse.json({ error: "profileId inválido." }, { status: 400 });
      }
    }
  } else {
    return NextResponse.json(
      { error: "Enviá url o modelId como parámetro." },
      { status: 400 },
    );
  }

  try {
    const model = await fetchMakerWorldModel(modelId, profileId);
    return NextResponse.json(model);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
