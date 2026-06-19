import { csvProvider, foursquareFileProvider, jsonProvider, osmFileProvider, overtureFileProvider } from "./local-file-providers";
import { osmOverpassProvider } from "./osm-overpass-provider";
import type { DataSourceProvider } from "./types";

export type { DataSourceInput, DataSourceProvider, DataSourceResult, SourceCapability } from "./types";

export const dataSourceProviders: DataSourceProvider[] = [csvProvider, jsonProvider, overtureFileProvider, foursquareFileProvider, osmFileProvider, osmOverpassProvider];

export function getDataSourceProvider(id: string): DataSourceProvider | undefined {
  return dataSourceProviders.find((provider) => provider.id === id);
}
