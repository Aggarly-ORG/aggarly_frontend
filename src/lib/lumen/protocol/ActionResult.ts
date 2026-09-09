import { BrowserObservation } from "./BrowserObservation";

export interface UiChange {
  ref?: string;
  property: string;
  before: unknown;
  after: unknown;
}

export interface ActionVerification {
  verified: boolean;
  reason?: string;
  changes?: UiChange[];
}

export interface ActionResult {
  actionId?: string;
  success: boolean;
  error?: string;
  targetRef?: string;
  verification?: ActionVerification;
  observation?: BrowserObservation;
}
