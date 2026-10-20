import { isComplimentId, type ComplimentId } from "./compliments";
import { validateName } from "./name";
import { flowerCatalog, type FlowerKind } from "./flower-catalog";

export function readGiftLink(url: URL): { name: string; flower: FlowerKind; complimentId?: ComplimentId } | null {
  const raw = url.searchParams.get("for");
  if (!raw) return null;
  const parsed = validateName(raw);
  if (!parsed.valid) return null;
  const kind = url.searchParams.get("flower");
  const flower = kind && Object.prototype.hasOwnProperty.call(flowerCatalog, kind) ? kind as FlowerKind : "rose";
  const wish = url.searchParams.get("wish");
  return { name: parsed.value, flower, ...(isComplimentId(wish) ? {complimentId: wish} : {}) };
}

export function createGiftLink(currentUrl: URL, name: string, flower: FlowerKind, complimentId?: ComplimentId): string {
  const parsed = validateName(name);
  if (!parsed.valid) throw new Error("Invalid recipient name");
  const url = new URL(currentUrl.pathname, currentUrl.origin);
  url.searchParams.set("for", parsed.value);
  if (flower !== "rose") url.searchParams.set("flower", flower);
  if (isComplimentId(complimentId)) url.searchParams.set("wish", complimentId);
  return url.toString();
}
