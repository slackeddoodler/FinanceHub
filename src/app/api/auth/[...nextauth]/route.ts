import { handlers } from "@/auth";

// This automatically handles the GET (redirects) and POST (token exchanges) for Microsoft Entra ID
export const { GET, POST } = handlers;