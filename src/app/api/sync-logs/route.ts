import { NextResponse } from 'next/server';
import { getRecentLogs, getFailedSyncs, getGroupedSyncLogs, getSyncStats, clearLogs } from '@/lib/syncLogger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const failedOnly = searchParams.get('failed') === 'true';
  const isGrouped = searchParams.get('grouped') !== 'false';
  const limit = parseInt(searchParams.get('limit') || '150', 10);

  const stats = getSyncStats();

  if (isGrouped) {
    const logs = getGroupedSyncLogs(failedOnly, limit);
    return NextResponse.json({ logs, stats, isGrouped: true });
  }

  const logs = failedOnly ? getFailedSyncs() : getRecentLogs(limit);
  return NextResponse.json({ logs, stats, isGrouped: false });
}

export async function DELETE() {
  clearLogs();
  return NextResponse.json({ success: true, message: 'Logs cleared successfully' });
}
