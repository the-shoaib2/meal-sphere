import fs from 'fs';
import path from 'path';

export type GroupImage = {
  id: string;
  src: string;
  alt: string;
  category: string;
};

export type FetchImagesParams = {
  page?: number;
  limit?: number;
  category?: string;
};

export async function fetchGroupImages({ page = 1, limit = 20, category = 'all' }: FetchImagesParams) {
    const imagesDirectory = path.join(process.cwd(), 'public/images');
    
    // Check if directory exists
    if (!fs.existsSync(imagesDirectory)) {
      return { images: [], hasMore: false, total: 0 };
    }

    const fileNames = await fs.promises.readdir(imagesDirectory);
    
    // Filter for image files
    const allImages = fileNames
      .filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
      .map(file => ({
        id: file,
        src: `/images/${file}`,
        alt: file.split('.')[0].replace(/-/g, ' '),
        category: 'All' 
      }));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = allImages.slice(startIndex, endIndex);
    const hasMore = endIndex < allImages.length;

    return {
      images: paginatedImages,
      hasMore,
      total: allImages.length
    };
}
