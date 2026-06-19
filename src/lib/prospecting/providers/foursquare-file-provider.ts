import type { RawProspect } from "../types";
import { parseNumber, readFirst, readLocalRecords, withPayload, type LocalFileProviderOptions, type RawFileRecord } from "./file-provider-utils";

export const FOURSQUARE_FILE_PROVIDER_ID = "foursquare-file";
export const FOURSQUARE_FILE_PROVIDER_LABEL = "Foursquare OS Places local file";

function mapFoursquareRecord(record: RawFileRecord, checkedAt: string): RawProspect {
  return withPayload(
    {
      id: readFirst(record, ["fsq_place_id", "id", "place_id"]) as string | undefined,
      name: readFirst(record, ["name", "businessName"]) as string | undefined,
      category: readFirst(record, ["category", "categories", "primary_category", "chains.0.name"]) as string | undefined,
      country: readFirst(record, ["country", "location.country", "addr:country"]) as string | undefined,
      city: readFirst(record, ["city", "location.locality", "locality", "addr:city"]) as string | undefined,
      neighborhood: readFirst(record, ["neighborhood", "location.neighborhood", "region"]) as string | undefined,
      address: readFirst(record, ["address", "location.address", "location.formatted_address", "addr:full"]) as string | undefined,
      website: readFirst(record, ["website", "websiteUrl", "tel.website"]) as string | undefined,
      phone: readFirst(record, ["tel", "phone", "contact.phone"]) as string | undefined,
      email: readFirst(record, ["email", "contact.email"]) as string | undefined,
      lat: parseNumber(readFirst(record, ["latitude", "lat", "geocodes.main.latitude", "geometry.latitude"])),
      lng: parseNumber(readFirst(record, ["longitude", "lng", "lon", "geocodes.main.longitude", "geometry.longitude"])),
      source: FOURSQUARE_FILE_PROVIDER_LABEL,
      sourceUrl: "https://opensource.foursquare.com/os-places/",
      sourcePayload: { checkedAt },
    },
    record,
  );
}

export async function loadFoursquareFileProspects(options: LocalFileProviderOptions): Promise<RawProspect[]> {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const records = await readLocalRecords(options);
  return records.map((record) => mapFoursquareRecord(record, checkedAt));
}
