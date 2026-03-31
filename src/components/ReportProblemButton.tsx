"use client";

import { useState } from "react";
import ReportProblemModal from "./ReportProblemModal";

export default function ReportProblemButton({
  className = "",
  onOpen,
}: {
  className?: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        className={
          className ||
          "text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
        }
      >
        Signaler un problème
      </button>
      <ReportProblemModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
