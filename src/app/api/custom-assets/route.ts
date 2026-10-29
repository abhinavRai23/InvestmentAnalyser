import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getCustomAssetsFilePath(): string {
  return path.join(process.cwd(), 'data', 'custom_assets.json');
}

export async function GET() {
  try {
    // Only return server-stored custom assets if local portfolio mode is enabled
    if (process.env.ENABLE_LOCAL_PORTFOLIO !== 'true') {
      return NextResponse.json({ customAssets: [] });
    }

    const filePath = getCustomAssetsFilePath();
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const customAssets = JSON.parse(fileData);
      return NextResponse.json({ customAssets });
    }
    return NextResponse.json({ customAssets: [] });
  } catch (error: any) {
    console.error('Failed to read custom_assets.json:', error);
    return NextResponse.json({ error: error.message || 'Failed to read custom assets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customAssets } = body;

    if (!Array.isArray(customAssets)) {
      return NextResponse.json({ error: 'customAssets must be an array' }, { status: 400 });
    }

    if (process.env.ENABLE_LOCAL_PORTFOLIO !== 'true') {
      // In shared/deployed mode, assets are safely stored in browser localStorage
      return NextResponse.json({ success: true, customAssets, savedToDisk: false });
    }

    const filePath = getCustomAssetsFilePath();
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(customAssets, null, 2), 'utf8');
    return NextResponse.json({ success: true, customAssets });
  } catch (error: any) {
    console.error('Failed to write custom_assets.json:', error);
    return NextResponse.json({ error: error.message || 'Failed to save custom assets' }, { status: 500 });
  }
}
