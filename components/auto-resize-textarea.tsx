"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Textarea } from "./ui/textarea";

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoResizeTextarea({ value, onChange, ...props }, forwardedRef) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, 76)}px`;
  }, [value]);

  return <Textarea ref={ref} value={value} onChange={(event) => onChange(event.target.value)} {...props} />;
});
