"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function InputDemoPage() {
    return (
        <div className="container mx-auto py-10 space-y-8 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold mb-4">Input Styling Demo</h1>
                <p className="text-muted-foreground mb-8">
                    Testing transparent border inputs that reveal a 2px border on focus.
                </p>

                <div className="grid gap-6">
                    {/* Default Component */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Standard Input</CardTitle>
                            <CardDescription>Default Shadcn <code>Input</code> component (grey border)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="standard">Standard</Label>
                                <Input type="text" id="standard" placeholder="Standard input..." />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Requested Customization */}
                    <Card className="border-2 border-dashed border-primary/20">
                        <CardHeader>
                            <CardTitle>Transparent Border Input</CardTitle>
                            <CardDescription>
                                <code>border-transparent</code> by default.<br />
                                On focus: <code>border-primary</code> + <code>ring-0</code> (showing actual border instead of ring).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="custom-1">Variant 1: Transparent to Border</Label>
                                <Input
                                    type="text"
                                    id="custom-1"
                                    placeholder="Click to see border..."
                                    className="border-transparent bg-muted/30 shadow-none focus-visible:ring-0 focus-visible:border-primary focus-visible:border-2 transition-all duration-200"
                                />
                                <p className="text-xs text-muted-foreground">Uses <code>border-transparent focus-visible:border-2</code></p>
                            </div>

                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="custom-2">Variant 2: Bottom Border Only</Label>
                                <Input
                                    type="text"
                                    id="custom-2"
                                    placeholder="Underline style..."
                                    className="rounded-none border-x-0 border-t-0 border-b-2 border-muted bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary transition-colors"
                                />
                                <p className="text-xs text-muted-foreground">Material-like underline style</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
