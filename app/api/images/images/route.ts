import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const category = searchParams.get('category') || 'all';

    const imagesDirectory = path.join(process.cwd(), 'public/images');
    
    // Check if directory exists
    if (!fs.existsSync(imagesDirectory)) {
      return NextResponse.json({ images: [], hasMore: false });
    }

    const fileNames = fs.readdirSync(imagesDirectory);
    
    const baseUrl = process.env.NEXTAUTH_URL || '';
    
    // Filter for image files
    const allImages = fileNames
      .filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
      .map(file => ({
        id: file,
        src: `/images/${file}`,
        alt: file.split('.')[0].replace(/-/g, ' '),
        category: 'All'
      }));

    // Simple categorization logic (mocking since we have flat folder)
    // If the user *really* wanted categories, we'd organize folders.
    // For now, if category is 'all', return all. If specific, we could filter by naming convention if it existed.
    // Given the file names, there's no clear category. We'll return all for 'all'.
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = allImages.slice(startIndex, endIndex);
    const hasMore = endIndex < allImages.length;

    return NextResponse.json({
      images: paginatedImages,
      hasMore,
      total: allImages.length
    });
  } catch (error) {
    console.error('Error listing images:', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}
