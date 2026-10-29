import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  try {
    // 1. Search for the fund to get the Groww search_id
    const searchUrl = `https://groww.in/v1/api/search/v3/query/global/st_p_query?page=0&query=${encodeURIComponent(query)}&size=5&web=true`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    if (!searchRes.ok) throw new Error('Failed to search Groww');
    const searchData = await searchRes.json();
    
    // Find the first mutual fund scheme
    const scheme = searchData?.data?.content?.find((item: any) => item.entity_type === 'Scheme');
    if (!scheme) return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
    
    const searchId = scheme.search_id;

    // 2. Fetch the scheme deep details
    const detailsUrl = `https://groww.in/v1/api/data/mf/web/v4/scheme/search/${searchId}`;
    const detailsRes = await fetch(detailsUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    if (!detailsRes.ok) throw new Error('Failed to fetch details');
    const detailsData = await detailsRes.json();

    return NextResponse.json(detailsData);
  } catch (error: any) {
    console.error('Groww API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch from Groww' }, { status: 500 });
  }
}
