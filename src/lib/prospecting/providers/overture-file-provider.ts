import type { RawProspect } from "../types";
import { parseNumber, parseStringArray, readFirst, readLocalRecords, withPayload, type LocalFileProviderOptions, type RawFileRecord } from "./file-provider-utils";

export const OVERTURE_FILE_PROVIDER_ID = "overture-file";
export const OVERTURE_FILE_PROVIDER_LABEL = "Overture Places local file";

function mapOvertureRecord(record: RawFileRecord, checkedAt: string): RawProspect {
  const lat = parseNumber(readFirst(record, ["latitude", "lat", "geometry.latitude", "geometry.lat"]));
  const lng = parseNumber(readFirst(record, ["longitude", "lng", "lon", "geometry.longitude", "geometry.lng", "geometry.lon"]));
  const id = readFirst(record, ["id", "place_id", "source_id", "names.primary"]);
  const website = readFirst(record, ["websites", "website", "contact.website"]);
  const websites = parseStringArray(website);

  return withPayload(
    {
      id: id === undefined ? undefined : String(id),
      name: readFirst(record, ["names.primary", "name", "primary_name", "businessName"]) as string | undefined,
      category: readFirst(record, ["categories.primary", "category", "primary_category", "type"]) as string | undefined,
      country: readFirst(record, ["addresses.0.country", "country", "addr:country"]) as string | undefined,
      city: readFirst(record, ["addresses.0.locality", "city", "locality", "addr:city"]) as string | undefined,
      neighborhood: readFirst(record, ["addresses.0.region", "neighborhood", "locality"]) as string | undefined,
      address: readFirst(record, ["addresses.0.freeform", "address", "addr:full", "street_address"]) as string | undefined,
      website: websites[0] ?? (typeof website === "string" ? website : undefined),
      phone: readFirst(record, ["phones", "phone", "contact.phone"]) as string | undefined,
      email: readFirst(record, ["emails", "email", "contact.email"]) as string | undefined,
      lat,
      lng,
      source: OVERTURE_FILE_PROVIDER_LABEL,
      sourceUrl: "https://overturemaps.org/download/",
      sourcePayload: { checkedAt },
    },
    record,
  );
}

export async function loadOvertureFileProspects(options: LocalFileProviderOptions): Promise<RawProspect[]> {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const records = await readLocalRecords(options);
  return records.map((record) => mapOvertureRecord(record, checkedAt));
}
