
export interface DeepLinkResult {
  deep_link_url: string | null;
  clipboard_fallback: boolean;
  clipboard_text: string | null;
}

export interface OperatorDeepLinkConfig {
  scheme?: string;
  android_package?: string;
  ios_app_store_id?: string;
  clipboard_fallback?: boolean;
}
