import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface DownloadProgressDialogProps {
  open: boolean
  progress: number
  type: 'excel' | 'pdf'
  onClose?: () => void
}

export default function DownloadProgressDialog({ open, progress, type, onClose }: DownloadProgressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v && onClose) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generating {type === 'excel' ? 'Excel' : 'PDF'} file...</DialogTitle>
          <DialogDescription>
            Please wait while your {type === 'excel' ? 'Excel' : 'PDF'} file is being generated. This may take a few seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <Progress value={progress} className="w-full" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin h-4 w-4" />
            {progress < 100 ? `${progress}%` : 'Finishing...'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 