import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"

interface UseProfileImageProps {
  initialImage?: string | null
  onImageUpdate?: (imageUrl: string) => void
  lazyLoad?: boolean
}

interface UseProfileImageReturn {
  image: string | null
  isLoading: boolean
  isLoaded: boolean
  updateImage: (imageUrl: string) => Promise<void>
  getInitials: (name?: string | null) => string
  removeImage: () => Promise<void>
}

export function useProfileImage({ 
  initialImage = null, 
  onImageUpdate,
  lazyLoad = true
}: UseProfileImageProps = {}): UseProfileImageReturn {
  const [image, setImage] = useState<string | null>(initialImage)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (initialImage && lazyLoad) {
      const img = new Image()
      img.src = initialImage
      img.onload = () => setIsLoaded(true)
      img.onerror = () => {
        console.error("Failed to load profile image")
        setIsLoaded(false)
      }
    } else {
      setIsLoaded(true)
    }
  }, [initialImage, lazyLoad])

  const updateImage = async (imageUrl: string) => {
    setIsLoading(true)
    setIsLoaded(false)
    try {
      // Validate URL format
      new URL(imageUrl)

      // Preload image
      if (lazyLoad) {
        const img = new Image()
        img.src = imageUrl
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })
      }

      // Update the image state
      setImage(imageUrl)
      setIsLoaded(true)
      
      // Call the callback if provided
      if (onImageUpdate) {
        onImageUpdate(imageUrl)
      }

      toast.success("Profile image updated successfully")
    } catch (error) {
      console.error("Failed to update profile image:", error)
      toast.error("Invalid image URL format")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const removeImage = async () => {
    setIsLoading(true)
    try {
      setImage(null)
      setIsLoaded(false)
      
      // Call the callback if provided
      if (onImageUpdate) {
        onImageUpdate("")
      }

      toast.success("Profile image removed successfully")
    } catch (error) {
      console.error("Failed to remove profile image:", error)
      toast.error("Failed to remove profile image")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name?: string | null): string => {
    if (!name) return "U"
    
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return {
    image,
    isLoading,
    isLoaded,
    updateImage,
    getInitials,
    removeImage
  }
} 