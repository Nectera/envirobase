import { NextResponse } from "next/server";
import { isConnected } from "@/lib/quickbooks";
import { syncAllPayments } from "@/lib/quickbooks-sync";

export const dynamic = "force-dynamic";

/**
 * Manual trigger to sync payment status from QuickBooks.
 * Checks all QB-synced invoices for payment updates.
 * Can be called from the UI (e.g., a "Sync Payments" button on the pipeline or invoice page).
 */
export async function POST() {
  if (!(await isConnected())) {
    return NextResponse.json(
      { error: "QuickBooks is not connected" },
      { status: 400 }
    );
  }

  try {
    const result = await syncAllPayments();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
