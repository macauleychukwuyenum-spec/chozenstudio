import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";

type Position = { x: number; y: number };

type Options = {
  storageKey: string;
  size: number;
  fallback: () => Position;
  margin?: number;
};

const DRAG_THRESHOLD = 5;

function clampPosition(pos: Position, size: number, margin: number): Position {
  if (typeof window === "undefined") return pos;
  return {
    x: Math.min(Math.max(margin, pos.x), Math.max(margin, window.innerWidth - size - margin)),
    y: Math.min(Math.max(margin, pos.y), Math.max(margin, window.innerHeight - size - margin)),
  };
}

export function useDraggableFab({ storageKey, size, fallback, margin = 12 }: Options) {
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const fallbackRef = useRef(fallback);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startPointer: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    moved: false,
  });

  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Position;
        setPosition(clampPosition(parsed, size, margin));
        return;
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    setPosition(clampPosition(fallbackRef.current(), size, margin));
  }, [margin, size, storageKey]);

  useEffect(() => {
    function onResize() {
      setPosition((current) => {
        const next = clampPosition(current ?? fallbackRef.current(), size, margin);
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [margin, size, storageKey]);

  const commit = useCallback((next: Position) => {
    const clamped = clampPosition(next, size, margin);
    setPosition(clamped);
    window.localStorage.setItem(storageKey, JSON.stringify(clamped));
  }, [margin, size, storageKey]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const current = position ?? clampPosition(fallbackRef.current(), size, margin);
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startPointer: { x: event.clientX, y: event.clientY },
      startPosition: current,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [margin, position, size]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startPointer.x;
    const dy = event.clientY - drag.startPointer.y;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      drag.moved = true;
      setDragging(true);
    }
    if (!drag.moved) return;

    event.preventDefault();
    setPosition(clampPosition({ x: drag.startPosition.x + dx, y: drag.startPosition.y + dy }, size, margin));
  }, [margin, size]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    drag.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    if (drag.moved) {
      const dx = event.clientX - drag.startPointer.x;
      const dy = event.clientY - drag.startPointer.y;
      commit({ x: drag.startPosition.x + dx, y: drag.startPosition.y + dy });
      suppressClickRef.current = true;
    }
    setDragging(false);
  }, [commit]);

  const consumeDragClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const style = useMemo<CSSProperties>(() => {
    if (!position) return {};
    return {
      left: position.x,
      top: position.y,
      width: size,
      height: size,
      touchAction: "none",
    };
  }, [position, size]);

  return {
    position,
    dragging,
    style,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    consumeDragClick,
  };
}
