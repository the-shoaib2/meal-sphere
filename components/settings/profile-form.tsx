"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import type { User } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "react-hot-toast"
import { useProfileImage } from "@/hooks/use-profile-image"
import { Pencil, X, Check, Camera, Info, CheckCircle2, AlertCircle } from "lucide-react"
import { ImagePicker } from "@/components/shared/image-picker"
import { ImageViewDialog } from "@/components/shared/image-view-dialog"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { updateUserProfile, sendUserVerificationEmail } from "@/lib/actions/user.actions"

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  image: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileFormProps {
  user: User
  isGoogleUser?: boolean
}

export function ProfileForm({ user, isGoogleUser = false }: ProfileFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)

  async function sendVerificationEmail() {
    setIsSendingVerification(true)
    try {
      const result = await sendUserVerificationEmail()
      if (!result.success) throw new Error(result.message || "Failed to send verification email")
      toast.success("Verification email sent successfully")
    } catch (error) {
      console.error(error)
      toast.error("Failed to send verification email")
    } finally {
      setIsSendingVerification(false)
    }
  }
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)

  const { image, updateImage, getInitials, isLoaded } = useProfileImage({
    initialImage: user.image,
    onImageUpdate: async (imageUrl) => {
      form.setValue("image", imageUrl)
    }
  })

  const handleImageClick = () => {
    if (!isEditing && image) {
      setViewOpen(true)
    }
  }

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
      image: user.image || "",
    },
  })

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)

    try {
      const result = await updateUserProfile(data)
      if (!result.success) {
        throw new Error(result.message || "Failed to update profile")
      }

      toast.success("Profile updated successfully")
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    form.reset({
      name: user.name || "",
      email: user.email || "",
      image: user.image || "",
    })
    updateImage(user.image || "", { silent: true })
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Profile Information</CardTitle>
            <CardDescription className="text-sm">Your personal information</CardDescription>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              isGoogleUser ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button
                          variant="outline"

                          disabled
                          className="gap-2 opacity-50 cursor-not-allowed"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>You created your account with Google, so you cannot change your personal information.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  variant="outline"

                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              )
            ) : (
              <>
                <Button
                  variant="outline"

                  onClick={handleCancel}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button

                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              "relative group",
              !isEditing && image && "cursor-pointer"
            )}
            onClick={handleImageClick}
          >
            <Avatar className="h-16 w-16">
              {isLoaded && image ? (
                <AvatarImage src={image} alt={user.name || "User"} />
              ) : (
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              )}
            </Avatar>
            {isEditing && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer transition-opacity hover:bg-black/60"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsPickerOpen(true)
                }}
              >
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
          <div>
            <h3 className="text-base font-medium">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your name"
                      {...field}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-muted" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Email</FormLabel>
                    {!isEditing && (
                      user.emailVerified ? (
                        <Badge variant="outline" className="gap-1 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified · {new Date(user.emailVerified).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          Not Verified
                        </Badge>
                      )
                    )}
                  </div>
                  <FormControl>
                    <Input
                      placeholder="Your email"
                      {...field}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-muted" : ""}
                    />
                  </FormControl>
                  {isEditing ? (
                    <FormDescription className="text-xs">
                      Changing your email will require verification.
                    </FormDescription>
                  ) : !user.emailVerified ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                      onClick={sendVerificationEmail}
                      disabled={isSendingVerification}
                    >
                      <AlertCircle className="h-3 w-3" />
                      {isSendingVerification ? "Sending..." : "Send Verification Email"}
                    </Button>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Image URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-muted" : ""}
                      onChange={(e) => {
                        field.onChange(e)
                        if (isEditing) {
                          updateImage(e.target.value)
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <ImagePicker
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          selectedImage={image || ""}
          onSelect={(newImage) => updateImage(newImage, { silent: true })}
          title="Select Profile Image"
          description="Choose a new profile picture from our gallery."
        />
        <ImageViewDialog
          open={viewOpen}
          onOpenChange={setViewOpen}
          imageSrc={image || ""}
        />
      </CardContent>
    </Card>
  )
}
