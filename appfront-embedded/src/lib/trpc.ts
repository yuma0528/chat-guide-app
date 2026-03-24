import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../functions/src/routers";

export const trpc = createTRPCReact<AppRouter>();
