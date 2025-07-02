import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2 } from "lucide-react"

interface DownloadProgressDialogProps {
  open: boolean
  progress: number
  type: 'excel' | 'pdf'
  onClose?: () => void
}

export default function DownloadProgressDialog({ open, progress, type, onClose }: DownloadProgressDialogProps) {
  const isComplete = progress >= 100;
  return (
    <Dialog open={open} onOpenChange={v => { if (!v && onClose) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isComplete ? (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5 text-green-600 animate-pop" />
                Completed!
              </span>
            ) : (
              <>Generating {type === 'excel' ? 'Excel' : 'PDF'} file...</>
            )}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `Your ${type === 'excel' ? 'Excel' : 'PDF'} file is ready to download.`
              : `Please wait while your ${type === 'excel' ? 'Excel' : 'PDF'} file is being generated. This may take a few seconds.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4 w-full">
          <div className="w-full">
            <Progress
              value={progress}
              className="w-full h-2 rounded-full bg-green-100 shadow-inner"
            >
              {/* ProgressPrimitive.Indicator is styled in Progress component */}
            </Progress>
            <style jsx global>{`
              .bg-primary {
                background-color: #22c55e !important; /* Tailwind green-500 */
              }
            `}</style>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-h-[24px]">
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 animate-pop" />
            ) : (
              <Loader2 className="animate-spin h-4 w-4 text-green-500" />
            )}
            {isComplete ? 'Completed!' : `${progress}%`}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 