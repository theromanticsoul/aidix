import { getAuthenticatedUserId } from "@/server/auth/session";
import { getCreditBalance } from "@/server/core/credits";
import { PrismaCreditLedger } from "@/server/infrastructure/db/credit-ledger";

export async function GET(): Promise<Response> {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return Response.json({ error: "Необходима авторизация" }, { status: 401 });
  const balance = await getCreditBalance(new PrismaCreditLedger(), userId);
  return Response.json({ balance });
}
