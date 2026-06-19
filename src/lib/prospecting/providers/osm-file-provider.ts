import type { RawProspect } from "../types";
import { parseNumber, readFirst, readLocalRecords, withPayload, type LocalFileProviderOptions, type RawFileRecord } from "./file-provider-utils";

export const OSM_FILE_PROVIDER_ID = "osm-file";
export const OSM_FILE_PROVIDER_LABEL = "OpenStreetMap local file";

function mapOsmRecord(record: RawFileRecord, checkedAt: string): RawProspect {
  const tags = typeof record.tags === "object" && record.tags !== null ? (record.tags as Record<string, unknown>) : {};
  const merged = { ...record, ...tags };

  return withPayload(
    {
      id: readFirst(merged, ["id", "osm_id", "@id"]) as string | undefined,
      name: readFirst(merged, ["name", "tags.name", "brand"]) as string | undefined,
      category: readFirst(merged, ["amenity", "shop", "tourism", "healthcare", "craft", "office", "category"]) as string | undefined,
      country: readFirst(merged, ["addr:country", "country"]) as string | undefined,
      city: readFirst(merged, ["addr:city", "addr:town", "addr:village", "city", "town"]) as string | undefined,
      neighborhood: readFirst(merged, ["addr:suburb", "addr:neighbourhood", "neighborhood"]) as string | undefined,
      address: readFirst(merged, ["addr:full", "address", "addr:street"]) as string | undefined,
      website: readFirst(merged, ["website", "contact:website", "url"]) as string | undefined,
      phone: readFirst(merged, ["phone", "contact:phone"]) as string | undefined,
      email: readFirst(merged, ["email", "contact:email"]) as string | undefined,
      instagram: readFirst(merged, ["contact:instagram", "instagram"]) as string | undefined,
      facebook: readFirst(merged, ["contact:facebook", "facebook"]) as string | undefined,
      lat: parseNumber(readFirst(merged, ["lat", "latitude", "center.lat"])),
      lng: parseNumber(readFirst(merged, ["lon", "lng", "longitude", "center.lon", "center.lng"])),
      source: OSM_FILE_PROVIDER_LABEL,
      sourceUrl: "https://www.openstreetmap.org/",
      sourcePayload: { checkedAt },
    },
    record,
  );
}

export async function loadOsmFileProspects(options: LocalFileProviderOptions): Promise<RawProspect[]> {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const records = await readLocalRecords(options);
  return records.map((record) => mapOsmRecord(record, checkedAt));
}
