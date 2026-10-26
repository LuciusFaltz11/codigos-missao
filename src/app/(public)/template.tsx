import { Suspense } from "react";
import { FlashToast } from "@/components/ui/flash-toast";

export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </>
  );
}
