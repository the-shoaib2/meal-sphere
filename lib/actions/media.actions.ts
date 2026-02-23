"use server";

import fs from 'fs';
import path from 'path';

interface ImageItem {
  id: string;
  src: string;
  alt: string;
  category: string;
}

function getImagesRecursively(dir: string, baseDir: string): ImageItem[] {
  try {
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
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
    return [];
  }
}

export async function getImagesAction(
  page: number = 1,
  limit: number = 20,
  categoryFilter: string = 'all'
): Promise<{
    success: true;
    images: ImageItem[];
    hasMore: boolean;
    total: number;
    categories: string[];
  } | {
    success: false;
    message: string;
    images: [];
  }> {
  try {
    const imagesDirectory = path.join(process.cwd(), 'public/images');
    
    if (!fs.existsSync(imagesDirectory)) {
      return { success: true, images: [], hasMore: false, total: 0, categories: ['All'] };
    }

    let allImages = getImagesRecursively(imagesDirectory, imagesDirectory);

    // Get unique categories from ALL images BEFORE filtering, so tabs are always visible
    const categories = ['All', ...new Set(allImages.map(img => img.category))];

    // Filter by category if requested
    if (categoryFilter.toLowerCase() !== 'all') {
      allImages = allImages.filter(img => img.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = allImages.slice(startIndex, endIndex);
    const hasMore = endIndex < allImages.length;

    return {
      success: true,
      images: paginatedImages,
      hasMore,
      total: allImages.length,
      categories
    };
  } catch (error: any) {
    console.error('Error fetching images:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to fetch images',
      images: [] 
    };
  }
}
