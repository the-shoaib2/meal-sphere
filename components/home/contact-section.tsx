"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, MapPin, Clock, MessageCircle, HelpCircle, Send, Users, RefreshCw, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { usePublicData } from "@/hooks/use-public-data"

interface ContactData {
    hero: {
        title: string
        subtitle: string
    }
    contactMethods: Array<{
        title: string
        description: string
        contact: string
        icon: string
    }>
    officeLocations: Array<{
        city: string
        address: string
        phone: string
        hours: string
    }>
    faqs: Array<{
        question: string
        answer: string
    }>
    supportChannels: Array<{
        title: string
        description: string
        icon: string
        cta: string
    }>
    cta: {
        title: string
        subtitle: string
        ctaPrimary: { text: string; href: string }
        ctaSecondary: { text: string; href: string }
    }
}

const iconMap = {
    Mail,
    Phone,
    MessageCircle,
    Users,
    HelpCircle
}

export function ContactSection({ initialData }: { initialData?: ContactData | null }) {
    const { toast } = useToast()
    const { data, loading, error } = usePublicData<ContactData>({ endpoint: "contact", initialData })
    const [isLoading, setIsLoading] = useState(false)
    const [showCaptcha, setShowCaptcha] = useState(false)
    const [captchaImage, setCaptchaImage] = useState<string>("")
    const [captchaId, setCaptchaId] = useState<string>("")
    const [captchaInput, setCaptchaInput] = useState<string>("")
    const [isCaptchaValid, setIsCaptchaValid] = useState<boolean | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        subject: "",
        message: ""
    })

    // Generate CAPTCHA
    const generateCaptcha = async () => {
        try {
            const { generateCaptchaAction } = await import("@/lib/actions/utils.actions")
            const result = await generateCaptchaAction()
            if (result.success && result.svg) {
                setCaptchaImage(result.svg)
                setCaptchaId(result.captchaId || "")
                setCaptchaInput("")
                setIsCaptchaValid(null)
            }
        } catch (error) {
            console.error('Failed to generate CAPTCHA:', error)
        }
    }

    // Handle initial form validation and show CAPTCHA
    const handleShowCaptcha = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
            toast({
                title: "Error",
                description: "Please fill in all fields",
                variant: "destructive"
            })
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            toast({
                title: "Error",
                description: "Please enter a valid email address",
                variant: "destructive"
            })
            return
        }

        await generateCaptcha()
        setShowCaptcha(true)
    }

    // Handle final form submission with CAPTCHA
    const handleSubmitWithCaptcha = async () => {
        setIsLoading(true)

        try {
            const { sendContactEmailAction } = await import("@/lib/actions/utils.actions")
            const result = await sendContactEmailAction({
                ...formData,
                captchaId,
                userInput: captchaInput
            })

            if (result.success) {
                toast({
                    title: "Message Sent Successfully! 🎉",
                    description: result.message,
                    variant: "default"
                })

                setIsSuccess(true)
                setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    subject: "",
                    message: ""
                })
                setCaptchaInput("")
                setShowCaptcha(false)
                setCaptchaImage("")

                setTimeout(() => {
                    setIsSuccess(false)
                }, 5000)
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to send message",
                    variant: "destructive"
                })
                if (result.error === "Invalid CAPTCHA") {
                    setIsCaptchaValid(false)
                    generateCaptcha()
                }
            }
        } catch (error) {
            console.error('Failed to submit form:', error)
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Handle input changes
    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    // Go back to form (hide CAPTCHA)
    const handleBackToForm = () => {
        setShowCaptcha(false)
        setCaptchaInput("")
        setIsCaptchaValid(null)
    }

    // Reset form and start over
    const handleResetForm = () => {
        setIsSuccess(false)
        setShowCaptcha(false)
        setCaptchaInput("")
        setIsCaptchaValid(null)
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            subject: "",
            message: ""
        })
    }

    return (
        <section id="contact" className="relative w-full overflow-hidden border-t">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(var(--primary-rgb),0.05),transparent_50%)]" />

            <div className="relative bg-background">
                {/* Hero Section */}
                <div className="relative py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex flex-col items-center gap-6">
                            <span className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
                                Get in Touch
                            </span>
                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                                {data?.hero?.title || "We'd Love to Hear from You"}
                            </h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                                {data?.hero?.subtitle || "Have questions or need assistance? Our dedicated team is here to provide exceptional support."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact Methods - Luxury Grid */}
                <div className="pb-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {data?.contactMethods?.map((method) => {
                                const IconComponent = iconMap[method.icon as keyof typeof iconMap] || MessageCircle
                                return (
                                    <div key={method.title} className="group p-8 rounded-[2.5rem] bg-background border border-border hover:border-primary/20 hover:shadow-[0_15px_40px_rgba(0,0,0,0.04)] transition-all duration-500">
                                        <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-6 group-hover:bg-primary/10 transition-colors">
                                            <IconComponent className="size-6" />
                                        </div>
                                        <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{method.title}</h4>
                                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{method.description}</p>
                                        <p className="text-primary font-semibold tracking-tight">{method.contact}</p>
                                    </div>
                                )
                            }) || Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-56 rounded-[2.5rem] bg-muted animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Contact Form & Info - Split Layout */}
                <div className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-20">
                            {/* Form Column */}
                            <div className="space-y-12">
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-bold tracking-tight">Send a Message</h3>
                                    <div className="h-1.5 w-12 bg-primary rounded-full" />
                                </div>

                                {isSuccess ? (
                                    <div className="bg-background p-12 rounded-[2.5rem] border border-primary/20 text-center space-y-6">
                                        <div className="size-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
                                            <CheckCircle className="size-8 text-green-600" />
                                        </div>
                                        <h3 className="text-2xl font-bold">Message Received</h3>
                                        <p className="text-muted-foreground">Our team will reach out to you within 24 hours.</p>
                                        <Button onClick={handleResetForm} variant="outline" className="rounded-full px-8">
                                            Send Another
                                        </Button>
                                    </div>
                                ) : !showCaptcha ? (
                                    <form onSubmit={handleShowCaptcha} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="First name"
                                                className="bg-background border-border/60 hover:border-primary/30 focus:border-primary/50 transition-colors rounded-2xl h-14"
                                                value={formData.firstName}
                                                onChange={(e) => handleInputChange("firstName", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Last name"
                                                className="bg-background border-border/60 hover:border-primary/30 focus:border-primary/50 transition-colors rounded-2xl h-14"
                                                value={formData.lastName}
                                                onChange={(e) => handleInputChange("lastName", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <Input
                                                type="email"
                                                placeholder="Email address"
                                                className="bg-background border-border/60 hover:border-primary/30 focus:border-primary/50 transition-colors rounded-2xl h-14"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange("email", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <Input
                                                placeholder="Subject"
                                                className="bg-background border-border/60 hover:border-primary/30 focus:border-primary/50 transition-colors rounded-2xl h-14"
                                                value={formData.subject}
                                                onChange={(e) => handleInputChange("subject", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="sm:col-span-2 space-y-2">
                                            <Textarea
                                                placeholder="Your message"
                                                className="bg-background border-border/60 hover:border-primary/30 focus:border-primary/50 transition-colors rounded-[1.5rem] min-h-[160px] resize-none p-4"
                                                value={formData.message}
                                                onChange={(e) => handleInputChange("message", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="sm:col-span-2 pt-4">
                                            <Button type="submit" size="lg" className="w-full rounded-full h-14 text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all">
                                                Continue to Verification
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    /* CAPTCHA View - Simplified */
                                    <div className="bg-background p-8 rounded-[2.5rem] border border-border space-y-8">
                                        <div className="text-center space-y-4">
                                            <h4 className="font-bold text-xl">Verification Required</h4>
                                            <div className="flex justify-center items-center gap-4">
                                                {captchaImage && (
                                                    <div className="overflow-hidden rounded-xl border border-divider shadow-inner bg-muted/30"
                                                        dangerouslySetInnerHTML={{ __html: captchaImage }}
                                                    />
                                                )}
                                                <Button onClick={generateCaptcha} size="icon" variant="ghost" className="rounded-full hover:bg-muted">
                                                    <RefreshCw className="size-5" />
                                                </Button>
                                            </div>
                                            <Input
                                                placeholder="Verify code"
                                                className="max-w-[200px] mx-auto text-center h-12 rounded-full border-primary/20 focus:border-primary"
                                                value={captchaInput}
                                                onChange={(e) => setCaptchaInput(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <Button onClick={handleBackToForm} variant="ghost" className="flex-1 rounded-full h-12">Edit Message</Button>
                                            <Button onClick={handleSubmitWithCaptcha} className="flex-1 rounded-full h-12 shadow-lg" disabled={isLoading}>
                                                {isLoading ? "Sending..." : "Send Now"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info Column */}
                            <div className="space-y-16">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-3xl font-bold tracking-tight">Visit Us</h3>
                                        <div className="h-1.5 w-12 bg-primary rounded-full" />
                                    </div>
                                    <div className="space-y-6">
                                        {data?.officeLocations?.map((office) => (
                                            <div key={office.city} className="flex gap-6 group">
                                                <div className="size-12 rounded-2xl bg-background border border-border flex items-center justify-center text-primary group-hover:border-primary/30 transition-colors shrink-0">
                                                    <MapPin className="size-5" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-bold text-lg">{office.city}</h4>
                                                    <p className="text-muted-foreground text-sm leading-relaxed">{office.address}</p>
                                                    <div className="pt-2 flex flex-col gap-1 text-xs font-medium text-muted-foreground/80">
                                                        <span>{office.phone}</span>
                                                        <span>{office.hours}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-3xl font-bold tracking-tight">Support</h3>
                                        <div className="h-1.5 w-12 bg-primary rounded-full" />
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        {data?.supportChannels?.slice(0, 2).map((channel) => {
                                            const IconComponent = iconMap[channel.icon as keyof typeof iconMap] || RefreshCw
                                            return (
                                                <div key={channel.title} className="p-6 rounded-3xl bg-background border border-border hover:border-primary/20 transition-all group">
                                                    <IconComponent className="size-6 text-primary mb-4" />
                                                    <h5 className="font-bold mb-2">{channel.title}</h5>
                                                    <p className="text-xs text-muted-foreground mb-4">{channel.description}</p>
                                                    <Button variant="link" className="p-0 h-auto text-primary text-xs font-bold hover:no-underline group-hover:translate-x-1 transition-transform">
                                                        {channel.cta} <ArrowRight className="size-3 ml-1" />
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ - Minimal Style */}
                <div className="py-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto space-y-16">
                        <div className="text-center space-y-4">
                            <h2 className="text-3xl font-bold tracking-tight">Common Questions</h2>
                            <p className="text-muted-foreground">Everything you need to know about getting started.</p>
                        </div>
                        <div className="space-y-4">
                            {data?.faqs?.slice(0, 5).map((faq, index) => (
                                <div key={index} className="group p-8 rounded-3xl bg-background border border-border hover:border-primary/10 transition-colors">
                                    <h4 className="font-bold mb-3 flex gap-3 text-lg">
                                        <HelpCircle className="size-5 text-primary shrink-0 mt-1" />
                                        {faq.question}
                                    </h4>
                                    <p className="text-muted-foreground text-sm leading-relaxed pl-8">
                                        {faq.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
