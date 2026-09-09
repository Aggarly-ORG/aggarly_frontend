export interface ViewportState {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  maxScrollX: number;
  maxScrollY: number;
}

export interface ElementBox {
  x: number;
  y: number;
  width: number;
  height: number;
  documentX: number;
  documentY: number;
}

export interface BrowserElementRef {
  ref: string; // Ephemeral identifier: "el_1", "el_2", etc.
  role: string; // Semantic role: "button", "textbox", "checkbox", "tab", etc.
  name?: string; // Accessible text / label / title
  value?: string; // Current value of input/select
  placeholder?: string;
  checked?: boolean; // For checkboxes and amenity tiles
  selected?: boolean; // For tabs or selectable cards
  visible: boolean; // Whether in DOM and not display:none / hidden
  inViewport: boolean; // Whether currently inside the visible viewport bounds
  enabled: boolean;
  box: ElementBox; // Screen and document coordinates
  lumenField?: string; // data-lumen-field attribute
  lumenAction?: string; // data-lumen-action attribute
  lumenAmenityId?: string; // data-lumen-amenity-id attribute
}

export interface BrowserObservation {
  id: string; // Ephemeral observation snapshot ID: "obs_51"
  timestamp: number;
  url: string;
  pathname: string;
  title: string;
  viewport: ViewportState;
  focusRef?: string;
  elements: BrowserElementRef[];
  sections: string[];
}
