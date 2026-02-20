import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface ImageItem {
  id: string;
  src: string;
  alt: string;
  category: string;
}

function getImagesRecursively(dir: string, baseDir: string): ImageItem[] {
  const fileNames = fs.readdirSync(dir);
  let results: ImageItem[] = [];

  for (const fileName of fileNames) {
    const filePath = path.join(dir, fileName);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(getImagesRecursively(filePath, baseDir));
    } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(fileName)) {
      const relativePath = path.relative(baseDir, filePath);
      const category = path.dirname(relativePath) === '.' 
        ? 'General' 
        : path.dirname(relativePath).split(path.sep).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      
      results.push({
        id: relativePath,
        src: `/images/${relativePath.replace(/\\/g, '/')}`,
        alt: fileName.split('.')[0].replace(/[-_]/g, ' '),
        category
      });
    }
  }

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const categoryFilter = searchParams.get('category') || 'all';

    const imagesDirectory = path.join(process.cwd(), 'public/images');
    
    if (!fs.existsSync(imagesDirectory)) {
      return NextResponse.json({ images: [], hasMore: false });
    }

    let allImages = getImagesRecursively(imagesDirectory, imagesDirectory);

    // Filter by category if requested
    if (categoryFilter.toLowerCase() !== 'all') {
      allImages = allImages.filter(img => img.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Sort by name or date if needed, for now just original order
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = allImages.slice(startIndex, endIndex);
    const hasMore = endIndex < allImages.length;

    // Get unique categories for the UI
    const categories = ['All', ...new Set(allImages.map(img => img.category))];

    return NextResponse.json({
      images: paginatedImages,
      hasMore,
      total: allImages.length,
      categories
    });
  } catch (error) {
    console.error('Error listing images:', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}
