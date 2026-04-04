import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Une seule lecture session par requête RSC (layout + page serveur). */
export const getCachedSession = cache(async () => getServerSession(authOptions));
