"use client";

// Drag-and-drop plumbing for the itinerary builder.
// - Desktop: native HTML5 DnD (mouse) via the *DragData helpers + DND_MIME.
// - Touch: pointer-event long-press drag via TouchDragProvider (HTML5 DnD does
//   not fire on touch). Both feed the same DragPayload into the same drop logic.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ItineraryPlace } from "@/lib/admin/itinerary";

/** What a drag carries: a fresh palette card, or an existing place being moved. */
export type DragPayload =
  | { kind: "new"; place: ItineraryPlace }
  | { kind: "move"; fromDayId: string; place: ItineraryPlace };

// ── HTML5 (mouse) helpers ─────────────────────────────────────
export const DND_MIME = "application/x-kt-place";

export function setDragData(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copyMove";
}
export function readDragData(e: React.DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData(DND_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

/** Attribute that marks a day drop zone for touch hit-testing. */
export const DAY_DROP_ATTR = "data-day-drop";

/** Sentinel drop-zone id for the cover hero slot (reuses DAY_DROP_ATTR). */
export const COVER_DROP_ID = "__cover__";

/** Max photos a single day can carry (matches the print collage). */
export const MAX_DAY_PHOTOS = 4;

// ── Touch (pointer) drag ──────────────────────────────────────

interface GhostInfo {
  label: string;
  image?: string;
}

interface TouchDragApi {
  /** Day id currently under the finger (for highlight), or null. */
  overDayId: string | null;
  /** Begin a touch drag from a pointerdown. No-op for mouse (native DnD covers it). */
  begin: (e: React.PointerEvent, payload: DragPayload, ghost: GhostInfo) => void;
}

const Ctx = createContext<TouchDragApi | null>(null);
export function useTouchDrag(): TouchDragApi {
  return useContext(Ctx) ?? { overDayId: null, begin: () => {} };
}

const LONG_PRESS_MS = 200;
const SLOP_PX = 10;

function dayUnder(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  const zone = el?.closest(`[${DAY_DROP_ATTR}]`) as HTMLElement | null;
  return zone?.getAttribute(DAY_DROP_ATTR) ?? null;
}

export function TouchDragProvider({
  onDrop,
  children,
}: {
  onDrop: (dayId: string, payload: DragPayload) => void;
  children: React.ReactNode;
}) {
  const [overDayId, setOverDayId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<
    (GhostInfo & { x: number; y: number }) | null
  >(null);

  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  const drag = useRef<{
    payload: DragPayload;
    ghost: GhostInfo;
    startX: number;
    startY: number;
    active: boolean;
    timer: number | null;
  } | null>(null);

  // Stable handler refs so add/removeEventListener always match.
  const handlers = useRef<{
    move?: (e: PointerEvent) => void;
    up?: (e: PointerEvent) => void;
    block?: (e: TouchEvent) => void;
  }>({});

  const cleanup = useCallback(() => {
    const h = handlers.current;
    window.removeEventListener("pointermove", h.move!);
    window.removeEventListener("pointerup", h.up!);
    window.removeEventListener("pointercancel", h.up!);
    if (h.block) window.removeEventListener("touchmove", h.block);
    if (drag.current?.timer) clearTimeout(drag.current.timer);
    drag.current = null;
    setGhost(null);
    setOverDayId(null);
  }, []);

  // Tear down any in-flight drag if the provider unmounts.
  useEffect(() => cleanup, [cleanup]);

  const begin = useCallback(
    (e: React.PointerEvent, payload: DragPayload, ghostInfo: GhostInfo) => {
      if (e.pointerType !== "touch") return; // mouse → native HTML5 DnD
      const startX = e.clientX;
      const startY = e.clientY;

      const block = (ev: TouchEvent) => {
        if (drag.current?.active) ev.preventDefault();
      };
      const activate = () => {
        if (!drag.current) return;
        drag.current.active = true;
        setGhost({ x: startX, y: startY, ...ghostInfo });
        setOverDayId(dayUnder(startX, startY));
        window.addEventListener("touchmove", block, { passive: false });
      };
      const move = (ev: PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        if (!d.active) {
          // Moved too far before the long-press fired → treat as a scroll.
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > SLOP_PX) {
            cleanup();
          }
          return;
        }
        ev.preventDefault();
        setGhost((g) => (g ? { ...g, x: ev.clientX, y: ev.clientY } : g));
        setOverDayId(dayUnder(ev.clientX, ev.clientY));
      };
      const up = (ev: PointerEvent) => {
        const d = drag.current;
        if (d?.active) {
          const id = dayUnder(ev.clientX, ev.clientY);
          if (id) onDropRef.current(id, d.payload);
        }
        cleanup();
      };

      handlers.current = { move, up, block };
      drag.current = {
        payload,
        ghost: ghostInfo,
        startX,
        startY,
        active: false,
        timer: window.setTimeout(activate, LONG_PRESS_MS),
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [cleanup]
  );

  return (
    <Ctx.Provider value={{ overDayId, begin }}>
      {children}
      {ghost && (
        <div
          className="pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[#F5C518] bg-white py-1 pl-1 pr-3 text-sm shadow-lg"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {ghost.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ghost.image}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[9px] text-gray-400">
              —
            </span>
          )}
          <span className="font-medium text-[#1B2A4A]">{ghost.label}</span>
        </div>
      )}
    </Ctx.Provider>
  );
}
