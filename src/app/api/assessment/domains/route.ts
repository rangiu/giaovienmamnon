import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const domains = await prisma.developmentDomain.findMany({
      orderBy: { orderIndex: "asc" },
    });
    return NextResponse.json({ success: true, domains });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
