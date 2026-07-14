"use client";

import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { Textarea } from "./ui/textarea";

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoResizeTextarea({ value, onChange, ...props }, forwardedRef) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement);

  const resize = useCallback((element = ref.current) => {
    if (!element) return;
    element.style.overflow = "hidden";
    element.style.height = "0px";
    element.style.height = `${Math.max(element.scrollHeight, 76)}px`;
  }, []);

  const resizeNextFrame = useCallback((element = ref.current) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      resize(element);
      frameRef.current = null;
    });
  }, [resize]);

  useLayoutEffect(() => {
    resize();
    resizeNextFrame();
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => resizeNextFrame(element));
    observer.observe(element.parentElement ?? element);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [resize, resizeNextFrame, value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(event) => {
        resize(event.currentTarget);
        onChange(event.target.value);
      }}
      {...props}
    />
  );
});
