import { NextResponse } from 'next/server';
import { enrichAll } from '@/lib/enrichment';

export const maxDuration = 300;

export async function POST(request) {
  try {
    const { businesses } = await request.json();
    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json({ error: 'No businesses provided' }, { status: 400 });
    }
    const enriched = await enrichAll(businesses);
    return NextResponse.json({ businesses: enriched, enriched_count: enriched.filter(b => b._enriched).length });
  } catch (error) {
    console.error('Enrichment API error:', error.message);
    return NextResponse.json({ error: error.message || 'Enrichment failed' }, { status: 500 });
  }
}
