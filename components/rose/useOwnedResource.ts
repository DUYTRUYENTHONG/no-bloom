import { useEffect } from "react";

// Dispose only when this exact owned instance is replaced or unmounted.
export function useOwnedResource(resource: { dispose: () => void }) {
  useEffect(() => () => resource.dispose(), [resource]);
}
