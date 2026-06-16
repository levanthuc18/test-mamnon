import { useEffect, useRef, useState } from "react";

export function useStickyShrink() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => setShrunk(!e.isIntersecting),
      { root: null, threshold: 0 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  return { sentinelRef, shrunk };
}
