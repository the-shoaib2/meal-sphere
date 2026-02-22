
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { updatePrivacySettingsAction } from "@/lib/actions/settings.actions"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "react-hot-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"

const privacyFormSchema = z.object({
    isSearchable: z.boolean(),
    showEmail: z.boolean(),
    profileVisibility: z.enum(["PUBLIC", "AUTHENTICATED", "PRIVATE"]),
})

type PrivacyFormValues = z.infer<typeof privacyFormSchema>

interface PrivacyFormProps {
    user: {
        isSearchable: boolean
        showEmail: boolean
        profileVisibility: string
    }
}

export function PrivacyForm({ user }: PrivacyFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<PrivacyFormValues>({
        resolver: zodResolver(privacyFormSchema),
        defaultValues: {
            isSearchable: user.isSearchable,
            showEmail: user.showEmail,
            profileVisibility: user.profileVisibility as "PUBLIC" | "AUTHENTICATED" | "PRIVATE",
        },
    })

    async function onSubmit(data: PrivacyFormValues) {
        setIsLoading(true)
        try {
            const result = await updatePrivacySettingsAction(data)

            if (!result.success) {
                throw new Error(result.message || "Failed to update privacy settings")
            }

            toast.success("Privacy settings updated successfully")
            router.refresh()
        } catch (error) {
            toast.error("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Privacy Settings</CardTitle>
                <CardDescription className="text-sm">
                    Manage how others see your profile and interact with you.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="isSearchable"
                            render={({ field }) => (
                                <FormItem className="border-none flex flex-row items-center justify-between rounded-lg border p-2">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Search Visibility</FormLabel>
                                        <FormDescription>
                                            Allow others to find you by your name or email in search results.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="showEmail"
                            render={({ field }) => (
                                <FormItem className="border-none flex flex-row items-center justify-between rounded-lg border p-2">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Show Email</FormLabel>
                                        <FormDescription>
                                            Display your email address on your public profile.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="profileVisibility"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Profile Visibility</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select visibility" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="PUBLIC">Public (Everyone)</SelectItem>
                                            <SelectItem value="AUTHENTICATED">Authenticated Users Only</SelectItem>
                                            <SelectItem value="PRIVATE">Private (Only You)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Control who can view your full profile details.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
