import { ElementIndexer } from "../observation/ElementIndexer";

export class RefResolver {
  static resolve(ref: string): HTMLElement | null {
    if (!ref) return null;
    const cleanRef = ref.trim().replace(/[\[\]]/g, "");
    return ElementIndexer.getElementByRef(cleanRef);
  }
}
