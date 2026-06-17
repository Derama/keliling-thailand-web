"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface SignaturePadHandle {
  /** PNG data-URL, or null if nothing was drawn. */
  toDataURL: () => string | null;
  clear: () => void;
}

const WIDTH = 320;
const HEIGHT = 160;

const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  function ctx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const c = ctx();
    if (!c) return;
    drawing.current = true;
    const { x, y } = pos(e);
    c.beginPath();
    c.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const c = ctx();
    if (!c) return;
    const { x, y } = pos(e);
    c.lineWidth = 2;
    c.lineCap = "round";
    c.strokeStyle = "#1B2A4A";
    c.lineTo(x, y);
    c.stroke();
    dirty.current = true;
  }

  function stop() {
    drawing.current = false;
  }

  useImperativeHandle(ref, () => ({
    toDataURL: () => (dirty.current ? (canvasRef.current?.toDataURL("image/png") ?? null) : null),
    clear: () => {
      const c = ctx();
      if (c) c.clearRect(0, 0, WIDTH, HEIGHT);
      dirty.current = false;
    },
  }));

  return (
    <div className="space-y-1">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
        className="w-full touch-none rounded-lg border border-gray-300 bg-white"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      />
      <button
        type="button"
        onClick={() => {
          const c = ctx();
          if (c) c.clearRect(0, 0, WIDTH, HEIGHT);
          dirty.current = false;
        }}
        className="text-xs text-gray-500 hover:underline"
      >
        Hapus tanda tangan
      </button>
    </div>
  );
});

export default SignaturePad;
