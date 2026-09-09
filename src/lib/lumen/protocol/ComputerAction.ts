export interface ComputerTarget {
  ref?: string;
  role?: string;
  name?: string;
  selector?: string;
  text?: string;
  lumenField?: string;
  lumenAction?: string;
  lumenAmenityId?: string;
}

export type TargetInput = string | ComputerTarget;

export interface ExpectedEffect {
  element?: {
    ref?: string;
    checked?: boolean;
    value?: string;
  };
  wizardStep?: number;
  pathname?: string;
}

export interface BaseComputerAction {
  id?: string;
  description?: string;
  delayMs?: number;
  expect?: ExpectedEffect;
}

export interface ClickAction extends BaseComputerAction {
  type: "CLICK";
  target: TargetInput;
}

export interface ClickAtAction extends BaseComputerAction {
  type: "CLICK_AT";
  x: number;
  y: number;
}

export interface TypeAction extends BaseComputerAction {
  type: "TYPE";
  target: TargetInput;
  value: string;
  clearFirst?: boolean;
}

export interface ScrollAction extends BaseComputerAction {
  type: "SCROLL";
  deltaY: number;
  deltaX?: number;
  behavior?: "smooth" | "auto";
}

export interface ScrollToAction extends BaseComputerAction {
  type: "SCROLL_TO";
  target: TargetInput;
  alignment?: "start" | "center" | "end";
  behavior?: "smooth" | "auto";
}

export interface PressAction extends BaseComputerAction {
  type: "PRESS";
  key: string;
  modifiers?: ("CTRL" | "ALT" | "SHIFT" | "META")[];
}

export interface HoverAction extends BaseComputerAction {
  type: "HOVER";
  target: TargetInput;
}

export interface WaitAction extends BaseComputerAction {
  type: "WAIT";
  delayMs: number;
}

export type ComputerAction =
  | ClickAction
  | ClickAtAction
  | TypeAction
  | ScrollAction
  | ScrollToAction
  | PressAction
  | HoverAction
  | WaitAction;
