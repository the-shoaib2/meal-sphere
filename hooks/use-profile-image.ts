import { useState } from "react"
import { toast } from "react-hot-toast"

interface UseProfileImageProps {
  initialImage?: string | null
  onImageUpdate?: (imageUrl: string) => void
}

interface UseProfileImageReturn {
  image: string | null
  isLoading: boolean
  updateImage: (imageUrl: string) => Promise<void>
  getInitials: (name?: string | null) => string
  removeImage: () => Promise<void>
}

export function useProfileImage({ 
  initialImage = null, 
  onImageUpdate 
}: UseProfileImageProps = {}): UseProfileImageReturn {
  const [image, setImage] = useState<string | null>(initialImage)
  const [isLoading, setIsLoading] = useState(false)

  const updateImage = async (imageUrl: string) => {
    setIsLoading(true)
    try {
      // Validate URL format
      new URL(imageUrl)

      // Update the image state
      setImage(imageUrl)
      
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
    updateImage,
    getInitials,
    removeImage
  }
} 