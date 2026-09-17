
export interface DeepLinkResolution {
  operatorSlug: string;
  operatorName: string;
  stationCode: string;
  stationName: string;
  appSchemeUrl: string | null;
  universalLinkUrl: string | null;
  storeUrls: {
    ios: string | null;
    android: string | null;
  };
  clipboardFallback: boolean;
  clipboardText: string;
  instructions: string;
}

export interface DeepLinkConfigTemplate {
  iosSchemeTemplate?: string | null;
  androidSchemeTemplate?: string | null;
  universalLinkTemplate?: string | null;
  storeUrls?: {
    ios?: string | null;
    android?: string | null;
  };
  clipboardFallback: boolean;
  notes?: string | null;
}
