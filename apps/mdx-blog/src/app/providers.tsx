"use client";

import { ModalProvider } from "@/components/providers/modal-provider";
import { queryClient } from "@/lib/orpc";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const Providers = ({ children }: { children: React.ReactNode }) => {

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ModalProvider>
        {children}
        </ModalProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </>
  );
};

export default Providers;
