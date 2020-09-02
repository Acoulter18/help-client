export interface HelpConfig {
  caseCentralUrl?: string;
  communityUrl?: string;
  customLocales?: string[];
  defaultHelpKey?: string;
  entitlements?: {
    [key: string]: boolean;
  };
  environmentId?: string;
  extends?: string;
  getChatData?: any;
  getCurrentHelpKey?: any;
  headerColor?: string;
  headerTextColor?: string;
  helpBaseUrl?: string;
  helpCenterUrl?: string;
  hideHelpChat?: boolean | string;
  hideUndock?: boolean | string;
  hideWidgetOnMobile?: boolean;
  knowledgebaseUrl?: string;
  locale?: string;
  onHelpLoaded?: any;
  productId?: string;
  searchService?: string;
  trainingCentralUrl?: string;
  useFlareSearch?: boolean;
  whatsNewRevisions?: any;
  hostQueryParams?: string;
  whats_new_help_key?: string;
  preferredOrigin?: string;
}
