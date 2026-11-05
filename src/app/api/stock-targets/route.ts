import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { StockTarget, normalizeStockKey } from '@/lib/stockSignals';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM stock_targets').all() as any[];

    const targets: Record<string, StockTarget> = {};
    for (const row of rows) {
      targets[row.key] = {
        key: row.key,
        symbol: row.symbol || undefined,
        name: row.name || undefined,
        isin: row.isin || undefined,
        targetPrice: typeof row.target_price === 'number' ? row.target_price : undefined,
        stopLossPrice: typeof row.stop_loss_price === 'number' ? row.stop_loss_price : undefined,
        notes: row.notes || undefined,
        tag: row.tag || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    return NextResponse.json({ targets });
  } catch (error: any) {
    console.error('Failed to fetch stock targets from DB:', error);
    return NextResponse.json({ targets: {}, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, symbol, name, isin, targetPrice, stopLossPrice, notes, tag } = body;

    if (!key && !name && !symbol && !isin) {
      return NextResponse.json({ error: 'Missing stock identifier key, name, or symbol' }, { status: 400 });
    }

    const canonicalKey = normalizeStockKey(key || symbol || isin || name);
    const now = new Date().toISOString();

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO stock_targets (key, symbol, name, isin, target_price, stop_loss_price, notes, tag, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        symbol = COALESCE(excluded.symbol, stock_targets.symbol),
        name = COALESCE(excluded.name, stock_targets.name),
        isin = COALESCE(excluded.isin, stock_targets.isin),
        target_price = excluded.target_price,
        stop_loss_price = excluded.stop_loss_price,
        notes = excluded.notes,
        tag = excluded.tag,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      canonicalKey,
      symbol ? symbol.toUpperCase() : null,
      name || null,
      isin || null,
      typeof targetPrice === 'number' && targetPrice > 0 ? targetPrice : null,
      typeof stopLossPrice === 'number' && stopLossPrice > 0 ? stopLossPrice : null,
      notes ? String(notes).trim() : null,
      tag ? String(tag).trim() : null,
      now,
      now
    );

    const savedTarget: StockTarget = {
      key: canonicalKey,
      symbol: symbol ? symbol.toUpperCase() : undefined,
      name: name || undefined,
      isin: isin || undefined,
      targetPrice: typeof targetPrice === 'number' && targetPrice > 0 ? targetPrice : undefined,
      stopLossPrice: typeof stopLossPrice === 'number' && stopLossPrice > 0 ? stopLossPrice : undefined,
      notes: notes ? String(notes).trim() : undefined,
      tag: tag ? String(tag).trim() : undefined,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, target: savedTarget });
  } catch (error: any) {
    console.error('Failed to save stock target:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyParam = searchParams.get('key');

    let keyToDelete = keyParam;
    if (!keyToDelete) {
      try {
        const body = await req.json();
        keyToDelete = body.key;
      } catch {
        // ignore JSON parse error if no body
      }
    }

    if (!keyToDelete) {
      return NextResponse.json({ error: 'Missing key parameter to delete' }, { status: 400 });
    }

    const canonicalKey = normalizeStockKey(keyToDelete);
    const db = getDb();
    db.prepare('DELETE FROM stock_targets WHERE key = ?').run(canonicalKey);

    return NextResponse.json({ success: true, deletedKey: canonicalKey });
  } catch (error: any) {
    console.error('Failed to delete stock target:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

